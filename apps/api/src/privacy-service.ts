import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, lt } from "drizzle-orm";
import type { Database } from "@paramingle/database";
import {
  deletionRequests,
  encounterParticipants,
  encounters,
  privacyExportRequests,
  profiles,
  subscriptions,
  userSessions,
  users,
} from "@paramingle/database";
import type { ObjectStorage } from "./avatar-service.js";
import { DomainError } from "./account-service.js";

const EXPORT_TTL_MS = 24 * 60 * 60_000;
const DELETE_CANCEL_WINDOW_MS = 7 * 24 * 60 * 60_000;
// This conservative default is an implementation placeholder pending H15.
const DELETE_RETENTION_MS = 30 * 24 * 60 * 60_000;
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("base64url");

export class PrivacyService {
  constructor(
    private db: Database,
    private storage: ObjectStorage,
  ) {}

  async requestExport(userId: string) {
    const [existing] = await this.db
      .select()
      .from(privacyExportRequests)
      .where(
        and(
          eq(privacyExportRequests.userId, userId),
          inArray(privacyExportRequests.state, [
            "pending",
            "processing",
            "ready",
          ]),
        ),
      )
      .limit(1);
    if (existing)
      return { id: existing.id, state: existing.state, created: false };
    const [created] = await this.db
      .insert(privacyExportRequests)
      .values({ userId })
      .returning();
    return { id: created!.id, state: created!.state, created: true };
  }

  async exportStatus(userId: string) {
    const rows = await this.db
      .select()
      .from(privacyExportRequests)
      .where(eq(privacyExportRequests.userId, userId))
      .orderBy(asc(privacyExportRequests.createdAt));
    return rows.map((row) => ({
      id: row.id,
      state: row.state,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async download(userId: string, requestId: string) {
    const [request] = await this.db
      .select()
      .from(privacyExportRequests)
      .where(
        and(
          eq(privacyExportRequests.id, requestId),
          eq(privacyExportRequests.userId, userId),
        ),
      )
      .limit(1);
    if (
      !request ||
      request.state !== "ready" ||
      !request.archiveKey ||
      !request.expiresAt ||
      request.expiresAt <= new Date()
    )
      throw new DomainError("not_found", "Export download unavailable", 404);
    return {
      url: await this.storage.signedUrl(request.archiveKey, 300),
      expiresInSeconds: 300,
    };
  }

  async requestDeletion(userId: string) {
    const [subscription] = await this.db
      .select({
        status: subscriptions.status,
        endsAt: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    if (
      subscription &&
      ["active", "trialing", "past_due"].includes(subscription.status)
    )
      throw new DomainError(
        "conflict",
        "Cancel an active subscription before deleting this account",
        409,
      );
    const now = new Date();
    const cancelUntil = new Date(now.getTime() + DELETE_CANCEL_WINDOW_MS);
    const retentionUntil = new Date(now.getTime() + DELETE_RETENTION_MS);
    const [request] = await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(deletionRequests)
        .where(eq(deletionRequests.userId, userId))
        .limit(1);
      if (existing && existing.state === "pending") return [existing];
      if (existing && existing.state !== "canceled")
        throw new DomainError(
          "conflict",
          "Deletion is already being processed",
          409,
        );
      const result = existing
        ? await tx
            .update(deletionRequests)
            .set({
              state: "pending",
              requestedAt: now,
              cancelUntil,
              retentionUntil,
              completedAt: null,
              updatedAt: now,
            })
            .where(eq(deletionRequests.id, existing.id))
            .returning()
        : await tx
            .insert(deletionRequests)
            .values({ userId, cancelUntil, retentionUntil })
            .returning();
      await tx
        .update(users)
        .set({ accountState: "deletion_pending", updatedAt: now })
        .where(eq(users.id, userId));
      await tx
        .update(userSessions)
        .set({ revokedAt: now })
        .where(
          and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)),
        );
      return result;
    });
    const sessionRows = await this.db
      .select({ id: userSessions.id })
      .from(userSessions)
      .where(eq(userSessions.userId, userId));
    return {
      id: request!.id,
      state: "pending",
      cancelUntil: request!.cancelUntil.toISOString(),
      sessionIds: sessionRows.map((x) => x.id),
    };
  }

  async cancelDeletion(userId: string) {
    const now = new Date();
    const [request] = await this.db
      .select()
      .from(deletionRequests)
      .where(eq(deletionRequests.userId, userId))
      .limit(1);
    if (!request || request.state !== "pending" || request.cancelUntil < now)
      throw new DomainError(
        "conflict",
        "Deletion can no longer be canceled",
        409,
      );
    await this.db.transaction(async (tx) => {
      await tx
        .update(deletionRequests)
        .set({ state: "canceled", updatedAt: now })
        .where(eq(deletionRequests.id, request.id));
      await tx
        .update(users)
        .set({ accountState: "active", updatedAt: now })
        .where(eq(users.id, userId));
    });
    return { canceled: true };
  }

  async process(limit = 25, now = new Date(), dryRun = false) {
    const exports = await this.db
      .select()
      .from(privacyExportRequests)
      .where(eq(privacyExportRequests.state, "pending"))
      .orderBy(asc(privacyExportRequests.createdAt))
      .limit(limit);
    let generated = 0;
    for (const request of exports) {
      if (dryRun) {
        generated++;
        continue;
      }
      try {
        await this.db
          .update(privacyExportRequests)
          .set({ state: "processing", updatedAt: now })
          .where(eq(privacyExportRequests.id, request.id));
        const archive = await this.buildArchive(request.userId);
        const token = randomBytes(32).toString("base64url");
        const key = `privacy-exports/${request.userId}/${request.id}-${randomUUID()}.json`;
        await this.storage.put(
          key,
          Buffer.from(JSON.stringify(archive)),
          "application/json",
        );
        await this.db
          .update(privacyExportRequests)
          .set({
            state: "ready",
            archiveKey: key,
            downloadTokenHash: tokenHash(token),
            expiresAt: new Date(now.getTime() + EXPORT_TTL_MS),
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(privacyExportRequests.id, request.id));
        // The token is deliberately not logged or returned; delivery must use the approved out-of-band channel.
        generated++;
      } catch {
        await this.db
          .update(privacyExportRequests)
          .set({
            state: "failed",
            failureCode: "generation_failed",
            updatedAt: now,
          })
          .where(eq(privacyExportRequests.id, request.id));
      }
    }
    const deletions = await this.db
      .select()
      .from(deletionRequests)
      .where(
        and(
          eq(deletionRequests.state, "pending"),
          lt(deletionRequests.cancelUntil, now),
        ),
      )
      .orderBy(asc(deletionRequests.cancelUntil))
      .limit(limit);
    let completed = 0;
    if (!dryRun)
      for (const request of deletions) {
        await this.anonymize(request.userId, request.id, now);
        completed++;
      }
    const expired = await this.db
      .select()
      .from(privacyExportRequests)
      .where(
        and(
          eq(privacyExportRequests.state, "ready"),
          lt(privacyExportRequests.expiresAt, now),
        ),
      )
      .limit(limit);
    if (!dryRun)
      for (const request of expired) {
        if (request.archiveKey)
          await this.storage.delete(request.archiveKey).catch(() => undefined);
        await this.db
          .update(privacyExportRequests)
          .set({
            state: "completed",
            archiveKey: null,
            downloadTokenHash: null,
            updatedAt: now,
          })
          .where(eq(privacyExportRequests.id, request.id));
      }
    return {
      generated,
      deletionCandidates: deletions.length,
      completed,
      expiredArchives: expired.length,
      dryRun,
    };
  }

  private async buildArchive(userId: string) {
    const [account] = await this.db
      .select({
        createdAt: users.createdAt,
        state: users.accountState,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, userId));
    const [profile] = await this.db
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        interests: profiles.interests,
        language: profiles.language,
        region: profiles.region,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId));
    const sessionRows = await this.db
      .select({
        deviceLabel: userSessions.deviceLabel,
        createdAt: userSessions.createdAt,
        lastSeenAt: userSessions.lastSeenAt,
        revokedAt: userSessions.revokedAt,
      })
      .from(userSessions)
      .where(eq(userSessions.userId, userId));
    const encounterRows = await this.db
      .select({
        encounterId: encounterParticipants.encounterId,
        mode: encounters.mode,
        startedAt: encounters.startedAt,
        endedAt: encounters.endedAt,
      })
      .from(encounterParticipants)
      .innerJoin(
        encounters,
        eq(encounters.id, encounterParticipants.encounterId),
      )
      .where(eq(encounterParticipants.userId, userId));
    return {
      generatedAt: new Date().toISOString(),
      scope: "your_account_data",
      account,
      profile,
      sessions: sessionRows,
      encounters: encounterRows,
    };
  }

  private async anonymize(userId: string, requestId: string, now: Date) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({
          username: `deleted_${userId.replace(/-/g, "").slice(0, 18)}`,
          normalizedUsername: `deleted_${userId.replace(/-/g, "").slice(0, 18)}`,
          displayName: "Deleted user",
          bio: "",
          interests: [],
          language: null,
          region: null,
          status: "",
          avatarObjectKey: null,
          updatedAt: now,
        })
        .where(eq(profiles.userId, userId));
      await tx
        .update(users)
        .set({
          accountState: "deleted",
          deletedAt: now,
          birthDateCiphertext: null,
          birthDateKeyVersion: null,
          ageCohort: null,
          updatedAt: now,
        })
        .where(eq(users.id, userId));
      await tx
        .update(deletionRequests)
        .set({ state: "completed", completedAt: now, updatedAt: now })
        .where(eq(deletionRequests.id, requestId));
    });
  }
}
