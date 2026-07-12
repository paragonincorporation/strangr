import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import {
  blocks,
  conversationRatings,
  encounterIdentityReveals,
  encounterParticipants,
  encounters,
  launchCountries,
  reconnectRequests,
  sanctions,
  userCountryState,
  users,
} from "./schema.js";
import { EntitlementRepository } from "./matching.js";
export const RECONNECT_ENTITLEMENT = "matching.reconnect";
export const PAID_REVEAL_ENTITLEMENT = "call_card.paid_override";
const RATING_SECONDS = 120;
const RATING_WINDOW_MS = 24 * 60 * 60 * 1_000;
const RECONNECT_WINDOW_MS = 2 * 60 * 1_000;
export class EngagementRepository {
  db;
  entitlements;
  constructor(db) {
    this.db = db;
    this.entitlements = new EntitlementRepository(db);
  }
  async markConnected(encounterId, now = new Date()) {
    await this.db
      .update(encounters)
      .set({
        connectedAt: now,
        ratingEligibleAt: new Date(now.getTime() + RATING_SECONDS * 1_000),
        updatedAt: now,
      })
      .where(
        and(eq(encounters.id, encounterId), isNull(encounters.connectedAt)),
      );
  }
  async finalizeTiming(encounterId, now = new Date()) {
    const [row] = await this.db
      .select({ connectedAt: encounters.connectedAt })
      .from(encounters)
      .where(eq(encounters.id, encounterId))
      .limit(1);
    if (!row?.connectedAt) return { eligible: false, windowClosesAt: null };
    const seconds = Math.max(
      0,
      Math.floor((now.getTime() - row.connectedAt.getTime()) / 1_000),
    );
    await this.db
      .update(encounters)
      .set({
        connectedDurationSeconds: seconds,
        ratingWindowClosesAt:
          seconds >= RATING_SECONDS
            ? new Date(now.getTime() + RATING_WINDOW_MS)
            : null,
        updatedAt: now,
      })
      .where(eq(encounters.id, encounterId));
    return {
      eligible: seconds >= RATING_SECONDS,
      windowClosesAt:
        seconds >= RATING_SECONDS
          ? new Date(now.getTime() + RATING_WINDOW_MS)
          : null,
    };
  }
  async rating(encounterId, raterId, outcome, now = new Date()) {
    return this.db.transaction(async (tx) => {
      const participants = await tx
        .select({ userId: encounterParticipants.userId })
        .from(encounterParticipants)
        .where(eq(encounterParticipants.encounterId, encounterId));
      const subjectId = participants.find((x) => x.userId !== raterId)?.userId;
      if (
        participants.length !== 2 ||
        !subjectId ||
        !participants.some((x) => x.userId === raterId)
      )
        throw new Error("encounter_unavailable");
      const [encounter] = await tx
        .select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .for("update")
        .limit(1);
      if (!encounter?.connectedAt) throw new Error("rating_not_eligible");
      const duration = encounter.endedAt
        ? encounter.connectedDurationSeconds
        : Math.floor((now.getTime() - encounter.connectedAt.getTime()) / 1_000);
      if (duration < RATING_SECONDS) throw new Error("rating_not_eligible");
      const closesAt =
        encounter.ratingWindowClosesAt ??
        new Date((encounter.endedAt ?? now).getTime() + RATING_WINDOW_MS);
      if (closesAt <= now) throw new Error("rating_window_closed");
      const [inserted] = await tx
        .insert(conversationRatings)
        .values({ encounterId, raterId, subjectId, outcome, submittedAt: now })
        .onConflictDoNothing()
        .returning();
      const [existing] = inserted
        ? [inserted]
        : await tx
            .select()
            .from(conversationRatings)
            .where(
              and(
                eq(conversationRatings.encounterId, encounterId),
                eq(conversationRatings.raterId, raterId),
              ),
            )
            .limit(1);
      if (!existing) throw new Error("rating_write_failed");
      if (existing.outcome !== outcome) throw new Error("rating_immutable");
      const [peerRating] = await tx
        .select({ outcome: conversationRatings.outcome })
        .from(conversationRatings)
        .where(
          and(
            eq(conversationRatings.encounterId, encounterId),
            eq(conversationRatings.raterId, subjectId),
          ),
        )
        .limit(1);
      return {
        encounterId,
        outcome: existing.outcome,
        submittedAt: existing.submittedAt,
        resolved: Boolean(peerRating),
        peerOutcome: peerRating?.outcome ?? null,
      };
    });
  }
  async ratingSummary(userId) {
    const [row] = await this.db
      .select({
        totalLikes: sql`count(*) filter (where ${conversationRatings.outcome} = 'like')::int`,
        totalRatings: sql`count(*)::int`,
      })
      .from(conversationRatings)
      .where(eq(conversationRatings.subjectId, userId));
    return {
      totalLikes: row?.totalLikes ?? 0,
      totalRatings: row?.totalRatings ?? 0,
    };
  }
  async ratingAnomalySummary(now = new Date()) {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
    const result = await this.db.execute(sql`
      with rated_pairs as (
        select least(r.rater_id::text, r.subject_id::text) first_id,
               greatest(r.rater_id::text, r.subject_id::text) second_id,
               count(distinct r.encounter_id)::int encounter_count,
               count(*) filter (where r.outcome='like')::int like_count
        from conversation_ratings r where r.submitted_at >= ${since}
        group by 1,2
      )
      select count(*) filter (where encounter_count >= 3)::int repeated_pairs,
             count(*) filter (where encounter_count >= 3 and like_count = encounter_count)::int coordinated_like_pairs
      from rated_pairs
    `);
    const row = result.rows[0];
    return {
      windowHours: 24,
      repeatedPairs: Number(row?.repeated_pairs ?? 0),
      coordinatedLikePairs: Number(row?.coordinated_like_pairs ?? 0),
    };
  }
  async revealOwnCard(encounterId, subjectId, now = new Date()) {
    const peerId = await this.peer(encounterId, subjectId, true, now);
    return this.upsertReveal(
      encounterId,
      peerId,
      subjectId,
      "subject_consent",
      now,
    );
  }
  async authorizeCallCard(encounterId, viewerId, now = new Date()) {
    const subjectId = await this.peer(encounterId, viewerId, true, now);
    let [reveal] = await this.db
      .select()
      .from(encounterIdentityReveals)
      .where(
        and(
          eq(encounterIdentityReveals.encounterId, encounterId),
          eq(encounterIdentityReveals.viewerId, viewerId),
          eq(encounterIdentityReveals.subjectId, subjectId),
          isNull(encounterIdentityReveals.revokedAt),
        ),
      )
      .limit(1);
    if (
      !reveal &&
      (await this.entitlements.has(viewerId, PAID_REVEAL_ENTITLEMENT, now))
    )
      reveal = await this.upsertReveal(
        encounterId,
        viewerId,
        subjectId,
        "maxed_entitlement",
        now,
      );
    if (!reveal) throw new Error("call_card_unavailable");
    if (
      reveal.source === "maxed_entitlement" &&
      !(await this.entitlements.has(viewerId, PAID_REVEAL_ENTITLEMENT, now))
    ) {
      await this.revokeReveal(reveal.id, now);
      throw new Error("call_card_unavailable");
    }
    return { subjectId, revealSource: reveal.source };
  }
  async revokePair(first, second, now = new Date()) {
    await this.db
      .update(encounterIdentityReveals)
      .set({ revokedAt: now })
      .where(
        and(
          isNull(encounterIdentityReveals.revokedAt),
          sql`((${encounterIdentityReveals.viewerId}=${first} and ${encounterIdentityReveals.subjectId}=${second}) or (${encounterIdentityReveals.viewerId}=${second} and ${encounterIdentityReveals.subjectId}=${first}))`,
        ),
      );
    await this.db
      .update(reconnectRequests)
      .set({ state: "invalidated", resolvedAt: now, updatedAt: now })
      .where(
        and(
          eq(reconnectRequests.state, "pending"),
          sql`((${reconnectRequests.requesterId}=${first} and ${reconnectRequests.recipientId}=${second}) or (${reconnectRequests.requesterId}=${second} and ${reconnectRequests.recipientId}=${first}))`,
        ),
      );
  }
  async createReconnect(requesterId, previousEncounterId, now = new Date()) {
    if (!(await this.entitlements.has(requesterId, RECONNECT_ENTITLEMENT, now)))
      throw new Error("entitlement_required");
    const [previous] = await this.db
      .select({
        id: encounters.id,
        mode: encounters.mode,
        peerId: encounterParticipants.userId,
      })
      .from(encounters)
      .innerJoin(
        encounterParticipants,
        and(
          eq(encounterParticipants.encounterId, encounters.id),
          ne(encounterParticipants.userId, requesterId),
        ),
      )
      .where(
        and(
          eq(encounters.id, previousEncounterId),
          eq(encounters.state, "ended"),
          gt(encounters.connectedDurationSeconds, 0),
          sql`exists(select 1 from encounter_participants own where own.encounter_id=${encounters.id} and own.user_id=${requesterId})`,
          sql`not exists(select 1 from encounters newer join encounter_participants np on np.encounter_id=newer.id where np.user_id=${requesterId} and newer.ended_at>${encounters.endedAt})`,
        ),
      )
      .orderBy(desc(encounters.endedAt))
      .limit(1);
    if (!previous) throw new Error("reconnect_unavailable");
    await this.assertPairEligible(requesterId, previous.peerId);
    const expiresAt = new Date(now.getTime() + RECONNECT_WINDOW_MS);
    const [request] = await this.db
      .insert(reconnectRequests)
      .values({
        requesterId,
        recipientId: previous.peerId,
        previousEncounterId: previous.id,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: reconnectRequests.requesterId,
        targetWhere: eq(reconnectRequests.state, "pending"),
        set: {
          recipientId: previous.peerId,
          previousEncounterId: previous.id,
          expiresAt,
          updatedAt: now,
        },
      })
      .returning();
    return { ...request, mode: previous.mode };
  }
  async resolveReconnect(id, recipientId, action, now = new Date()) {
    const [candidate] = await this.db
      .select()
      .from(reconnectRequests)
      .where(eq(reconnectRequests.id, id))
      .limit(1);
    if (!candidate || candidate.recipientId !== recipientId)
      throw new Error("reconnect_unavailable");
    await this.assertPairEligible(candidate.requesterId, candidate.recipientId);
    return this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(reconnectRequests)
        .where(eq(reconnectRequests.id, id))
        .for("update")
        .limit(1);
      if (!request || request.recipientId !== recipientId)
        throw new Error("reconnect_unavailable");
      if (request.state !== "pending" || request.expiresAt <= now) {
        if (request.state === "pending")
          await tx
            .update(reconnectRequests)
            .set({ state: "expired", resolvedAt: now, updatedAt: now })
            .where(eq(reconnectRequests.id, id));
        throw new Error("reconnect_unavailable");
      }
      const state = action === "accept" ? "accepted" : "declined";
      await tx
        .update(reconnectRequests)
        .set({ state, resolvedAt: now, updatedAt: now })
        .where(eq(reconnectRequests.id, id));
      const [encounter] = await tx
        .select({ mode: encounters.mode })
        .from(encounters)
        .where(eq(encounters.id, request.previousEncounterId))
        .limit(1);
      return { ...request, state, mode: encounter.mode };
    });
  }
  async peer(encounterId, userId, active, now) {
    const [row] = await this.db
      .select({ peerId: encounterParticipants.userId })
      .from(encounterParticipants)
      .innerJoin(
        encounters,
        eq(encounters.id, encounterParticipants.encounterId),
      )
      .where(
        and(
          eq(encounterParticipants.encounterId, encounterId),
          ne(encounterParticipants.userId, userId),
          sql`exists(select 1 from encounter_participants own where own.encounter_id=${encounterId} and own.user_id=${userId})`,
          active
            ? and(
                eq(encounters.state, "active"),
                gt(encounters.visibleUntil, now),
              )
            : undefined,
        ),
      )
      .limit(1);
    if (!row || (await this.blocked(userId, row.peerId)))
      throw new Error("encounter_unavailable");
    const eligible = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          sql`${users.id} in (${userId},${row.peerId})`,
          eq(users.accountState, "active"),
          isNull(users.deletedAt),
          sql`not exists (select 1 from ${sanctions} s where s.subject_id=${users.id} and s.state='active' and (s.ends_at is null or s.ends_at>${now}) and s.type in ('contact_restriction','temporary_suspension','full_ban','profile_removal'))`,
        ),
      );
    if (eligible.length !== 2) throw new Error("encounter_unavailable");
    return row.peerId;
  }
  async upsertReveal(encounterId, viewerId, subjectId, source, now) {
    const [row] = await this.db
      .insert(encounterIdentityReveals)
      .values({ encounterId, viewerId, subjectId, source, revealedAt: now })
      .onConflictDoUpdate({
        target: [
          encounterIdentityReveals.encounterId,
          encounterIdentityReveals.viewerId,
          encounterIdentityReveals.subjectId,
        ],
        set: { source, revealedAt: now, revokedAt: null },
      })
      .returning();
    return row;
  }
  async revokeReveal(id, now) {
    await this.db
      .update(encounterIdentityReveals)
      .set({ revokedAt: now })
      .where(eq(encounterIdentityReveals.id, id));
  }
  async blocked(first, second) {
    const [row] = await this.db
      .select({ id: blocks.id })
      .from(blocks)
      .where(
        sql`(${blocks.blockerId}=${first} and ${blocks.blockedId}=${second}) or (${blocks.blockerId}=${second} and ${blocks.blockedId}=${first})`,
      )
      .limit(1);
    return Boolean(row);
  }
  async assertPairEligible(first, second) {
    if (await this.blocked(first, second))
      throw new Error("reconnect_unavailable");
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .innerJoin(userCountryState, eq(userCountryState.userId, users.id))
      .innerJoin(
        launchCountries,
        eq(launchCountries.countryCode, userCountryState.lastObservedCountry),
      )
      .where(
        and(
          sql`${users.id} in (${first},${second})`,
          eq(users.accountState, "active"),
          eq(users.ageCohort, "adult_18_plus"),
          eq(launchCountries.matchingEnabled, true),
        ),
      );
    if (rows.length !== 2) throw new Error("reconnect_unavailable");
  }
}
