import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Database, FieldEncryptor, UserRow } from "@paramingle/database";
import {
  privacySettings,
  profileFieldVisibility,
  profiles,
  friendships,
  encounters,
  encounterParticipants,
  termsAcceptances,
  userSessions,
  userSettings,
  userCountryState,
  users,
} from "@paramingle/database";
import type {
  OnboardingRequest,
  VisibilityAudience,
} from "@paramingle/contracts";
import { normalizeUsername } from "@paramingle/database";
import type { VerifiedIdentity } from "./auth.js";

const PROFILE_FIELDS = [
  "avatar",
  "bio",
  "age_band",
  "interests",
  "language",
  "region",
  "online_state",
  "recent_activity",
] as const;
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function deriveAge(birthDate: string, now = new Date()) {
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day)
    throw new DomainError("bad_request", "Invalid birth date");
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== birthDate)
    throw new DomainError("bad_request", "Invalid birth date");
  if (date.getTime() > now.getTime())
    throw new DomainError("bad_request", "Invalid birth date");
  let age = now.getUTCFullYear() - year;
  if (
    now.getUTCMonth() + 1 < month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() < day)
  )
    age--;
  return {
    age,
    cohort: age >= 18 ? ("adult_18_plus" as const) : ("minor_16_17" as const),
  };
}

export function requireAdultBirthDate(birthDate: string, now = new Date()) {
  const result = deriveAge(birthDate, now);
  if (result.age < 18)
    throw new DomainError(
      "age_restricted",
      "This service is only available to eligible adults",
      403,
    );
  return result;
}

export class AccountService {
  constructor(
    private db: Database,
    private encryptor: FieldEncryptor,
    private policyVersions = {
      terms: "beta-2026-07",
      privacy: "beta-2026-07",
      guidelines: "beta-2026-07",
    },
  ) {}
  async reconcile(
    identity: VerifiedIdentity,
    deviceLabel: string | null,
  ): Promise<UserRow> {
    return this.db.transaction(async (tx) => {
      let [user] = await tx
        .select()
        .from(users)
        .where(
          and(eq(users.authSubject, identity.subject), isNull(users.deletedAt)),
        )
        .limit(1);
      if (!user) {
        [user] = await tx
          .insert(users)
          .values({
            authSubject: identity.subject,
            emailVerified: identity.emailVerified,
            accountState: identity.emailVerified
              ? "onboarding"
              : "pending_verification",
          })
          .onConflictDoNothing()
          .returning();
        if (!user)
          [user] = await tx
            .select()
            .from(users)
            .where(
              and(
                eq(users.authSubject, identity.subject),
                isNull(users.deletedAt),
              ),
            )
            .limit(1);
      }
      if (!user) throw new Error("Identity reconciliation failed");
      if (identity.emailVerified && !user.emailVerified) {
        [user] = await tx
          .update(users)
          .set({
            emailVerified: true,
            accountState:
              user.accountState === "pending_verification"
                ? "onboarding"
                : user.accountState,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();
      }
      if (!user) throw new Error("Identity update failed");
      if (
        user.ageCohort === "minor_16_17" &&
        user.birthDateCiphertext &&
        user.birthDateKeyVersion
      ) {
        const birthDate = this.encryptor.decrypt({
          ciphertext: user.birthDateCiphertext,
          keyVersion: user.birthDateKeyVersion,
        });
        if (deriveAge(birthDate).cohort === "adult_18_plus") {
          [user] = await tx
            .update(users)
            .set({ ageCohort: "adult_18_plus", updatedAt: new Date() })
            .where(eq(users.id, user.id))
            .returning();
        }
      }
      if (!user) throw new Error("Birthday reconciliation failed");
      const reconciled = user;
      await tx
        .insert(userSessions)
        .values({
          userId: reconciled.id,
          authSessionId: identity.authSessionId,
          deviceLabel,
        })
        .onConflictDoUpdate({
          target: [userSessions.userId, userSessions.authSessionId],
          set: { lastSeenAt: new Date(), deviceLabel },
        });
      return reconciled;
    });
  }
  async me(userId: string) {
    const [account] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!account) throw new DomainError("not_found", "Account not found", 404);
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    const [privacy] = await this.db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.userId, userId))
      .limit(1);
    const acceptances = await this.db
      .select()
      .from(termsAcceptances)
      .where(eq(termsAcceptances.userId, userId));
    const steps: string[] = [];
    if (account.birthDateCiphertext) steps.push("birth_date");
    if (new Set(acceptances.map((x) => x.policyType)).size === 3)
      steps.push("policies");
    if (profile) steps.push("profile");
    if (privacy) steps.push("preferences");
    return {
      account: {
        id: account.id,
        state: account.accountState,
        cohort: account.ageCohort,
        emailVerified: account.emailVerified,
        createdAt: account.createdAt.toISOString(),
      },
      profile: profile
        ? serializeProfile(profile, privacy?.isPrivate ?? false, null)
        : null,
      onboardingSteps: steps,
    };
  }
  async onboarding(userId: string, input: OnboardingRequest, now = new Date()) {
    await this.db.transaction(async (tx) => {
      if (input.step === "birth_date") {
        requireAdultBirthDate(input.birthDate, now);
        const encrypted = this.encryptor.encrypt(input.birthDate);
        await tx
          .update(users)
          .set({
            birthDateCiphertext: encrypted.ciphertext,
            birthDateKeyVersion: encrypted.keyVersion,
            ageCohort: "adult_18_plus",
            updatedAt: now,
          })
          .where(eq(users.id, userId));
      } else if (input.step === "policies") {
        if (
          input.termsVersion !== this.policyVersions.terms ||
          input.privacyVersion !== this.policyVersions.privacy ||
          input.guidelinesVersion !== this.policyVersions.guidelines
        )
          throw new DomainError(
            "conflict",
            "Policy versions have changed; review them again",
            409,
          );
        await tx
          .insert(termsAcceptances)
          .values([
            {
              userId,
              policyType: "terms",
              policyVersion: input.termsVersion,
              source: "web_onboarding",
            },
            {
              userId,
              policyType: "privacy_policy",
              policyVersion: input.privacyVersion,
              source: "web_onboarding",
            },
            {
              userId,
              policyType: "community_guidelines",
              policyVersion: input.guidelinesVersion,
              source: "web_onboarding",
            },
          ])
          .onConflictDoNothing();
      } else if (input.step === "profile") {
        await tx
          .insert(profiles)
          .values({
            userId,
            username: input.username.trim(),
            normalizedUsername: normalizeUsername(input.username),
            displayName: input.displayName.trim(),
          })
          .onConflictDoUpdate({
            target: profiles.userId,
            set: {
              username: input.username.trim(),
              normalizedUsername: normalizeUsername(input.username),
              displayName: input.displayName.trim(),
              updatedAt: now,
            },
          });
        await tx
          .insert(privacySettings)
          .values({ userId, isPrivate: input.isPrivate })
          .onConflictDoUpdate({
            target: privacySettings.userId,
            set: { isPrivate: input.isPrivate, updatedAt: now },
          });
        await tx
          .insert(profileFieldVisibility)
          .values(
            PROFILE_FIELDS.map((field) => ({
              userId,
              field,
              audience:
                field === "avatar"
                  ? ("everyone" as const)
                  : ("friends" as const),
            })),
          )
          .onConflictDoNothing();
      } else {
        await tx
          .insert(privacySettings)
          .values({ userId, ...input })
          .onConflictDoUpdate({
            target: privacySettings.userId,
            set: { ...input, updatedAt: now },
          });
        await tx
          .insert(userSettings)
          .values({
            userId,
            reducedMotion: input.reducedMotion,
            highContrast: input.highContrast,
          })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: {
              reducedMotion: input.reducedMotion,
              highContrast: input.highContrast,
              updatedAt: now,
            },
          });
      }
      const [u] = await tx.select().from(users).where(eq(users.id, userId));
      const p = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));
      const a = await tx
        .select()
        .from(termsAcceptances)
        .where(eq(termsAcceptances.userId, userId));
      const pr = await tx
        .select()
        .from(privacySettings)
        .where(eq(privacySettings.userId, userId));
      if (
        u?.emailVerified &&
        u.birthDateCiphertext &&
        u.ageCohort === "adult_18_plus" &&
        p.length &&
        pr.length &&
        new Set(a.map((x) => x.policyType)).size === 3
      )
        await tx
          .update(users)
          .set({ accountState: "active", updatedAt: now })
          .where(eq(users.id, userId));
    });
    return this.me(userId);
  }
  async patchProfile(userId: string, input: Record<string, unknown>) {
    await this.db
      .update(profiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
    if ("isPrivate" in input)
      await this.db
        .update(privacySettings)
        .set({ isPrivate: Boolean(input.isPrivate), updatedAt: new Date() })
        .where(eq(privacySettings.userId, userId));
    return this.me(userId);
  }
  async patchVisibility(
    userId: string,
    fields: Record<string, VisibilityAudience>,
  ) {
    await this.db.transaction(async (tx) => {
      for (const [field, audience] of Object.entries(fields))
        await tx
          .insert(profileFieldVisibility)
          .values({ userId, field, audience })
          .onConflictDoUpdate({
            target: [
              profileFieldVisibility.userId,
              profileFieldVisibility.field,
            ],
            set: { audience, updatedAt: new Date() },
          });
    });
    return { fields };
  }
  async sessions(userId: string) {
    return (
      await this.db
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
    ).map((x) => ({
      id: x.id,
      deviceLabel: x.deviceLabel,
      lastSeenAt: x.lastSeenAt.toISOString(),
      revokedAt: x.revokedAt?.toISOString() ?? null,
    }));
  }
  async revokeSession(userId: string, id: string) {
    const rows = await this.db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userSessions.userId, userId), eq(userSessions.id, id)))
      .returning();
    if (!rows.length)
      throw new DomainError("not_found", "Session not found", 404);
  }
  async realtimeIdentity(userId: string, authSessionId: string) {
    const [row] = await this.db
      .select({
        userId: users.id,
        state: users.accountState,
        cohort: users.ageCohort,
        emailVerified: users.emailVerified,
        sessionId: userSessions.id,
        revokedAt: userSessions.revokedAt,
      })
      .from(users)
      .innerJoin(
        userSessions,
        and(
          eq(userSessions.userId, users.id),
          eq(userSessions.authSessionId, authSessionId),
        ),
      )
      .where(eq(users.id, userId))
      .limit(1);
    if (!row || row.revokedAt)
      throw new DomainError("unauthenticated", "Session unavailable", 401);
    if (
      row.state !== "active" ||
      !row.emailVerified ||
      row.cohort !== "adult_18_plus"
    )
      throw new DomainError(
        "forbidden",
        "Account is not eligible for realtime contact",
        403,
      );
    return { userId: row.userId, sessionId: row.sessionId, cohort: row.cohort };
  }
  async profile(viewerId: string, username: string) {
    const [p] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.normalizedUsername, normalizeUsername(username)))
      .limit(1);
    if (!p) throw new DomainError("not_found", "Profile unavailable", 404);
    const [privacy] = await this.db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.userId, p.userId));
    if (!privacy?.discoverableByUsername && viewerId !== p.userId)
      throw new DomainError("not_found", "Profile unavailable", 404);
    const vis = await this.db
      .select()
      .from(profileFieldVisibility)
      .where(eq(profileFieldVisibility.userId, p.userId));
    const [friend] = await this.db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        and(
          eq(friendships.state, "active"),
          or(
            and(
              eq(friendships.firstUserId, viewerId),
              eq(friendships.secondUserId, p.userId),
            ),
            and(
              eq(friendships.firstUserId, p.userId),
              eq(friendships.secondUserId, viewerId),
            ),
          ),
        ),
      )
      .limit(1);
    const [recent] = await this.db
      .select({ id: encounters.id })
      .from(encounters)
      .innerJoin(
        encounterParticipants,
        eq(encounterParticipants.encounterId, encounters.id),
      )
      .where(
        and(
          gt(encounters.visibleUntil, new Date()),
          eq(encounterParticipants.userId, viewerId),
          sql`exists(select 1 from encounter_participants ep where ep.encounter_id=${encounters.id} and ep.user_id=${p.userId})`,
        ),
      )
      .limit(1);
    return serializeProfile(
      p,
      privacy?.isPrivate ?? false,
      viewerId === p.userId
        ? null
        : new Map(vis.map((v) => [v.field, v.audience])),
      friend ? "friends" : recent ? "encounters" : "everyone",
    );
  }
  async avatarOwner(viewerId: string, username: string) {
    const projected = await this.profile(viewerId, username);
    if (!projected.avatarUrl)
      throw new DomainError("not_found", "Avatar unavailable", 404);
    const [owner] = await this.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.normalizedUsername, normalizeUsername(username)))
      .limit(1);
    if (!owner) throw new DomainError("not_found", "Avatar unavailable", 404);
    return owner.userId;
  }
  async safeCallCard(
    subjectId: string,
    revealSource: "subject_consent" | "maxed_entitlement",
  ) {
    const [profile] = await this.db
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
        avatarObjectKey: profiles.avatarObjectKey,
        country: userCountryState.lastObservedCountry,
        language: profiles.language,
        interests: profiles.interests,
      })
      .from(profiles)
      .innerJoin(userCountryState, eq(userCountryState.userId, profiles.userId))
      .where(eq(profiles.userId, subjectId))
      .limit(1);
    if (!profile)
      throw new DomainError("not_found", "Call card unavailable", 404);
    return {
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarObjectKey
        ? `/v1/profiles/${encodeURIComponent(profile.username)}/avatar`
        : null,
      country: profile.country,
      language: profile.language,
      interests: profile.interests,
      revealSource,
    };
  }
}
function serializeProfile(
  p: typeof profiles.$inferSelect,
  isPrivate: boolean,
  visibility: Map<string, string> | null,
  relationship: "everyone" | "encounters" | "friends" = "everyone",
) {
  const allowed = (f: string) => {
    if (!visibility) return true;
    const audience = visibility.get(f);
    return (
      audience === "everyone" ||
      (audience === "encounters" && relationship !== "everyone") ||
      (audience === "friends" && relationship === "friends")
    );
  };
  return {
    username: p.username,
    displayName: p.displayName,
    avatarUrl:
      allowed("avatar") && p.avatarObjectKey
        ? `/v1/profiles/${encodeURIComponent(p.username)}/avatar`
        : null,
    bio: allowed("bio") ? p.bio : "",
    interests: allowed("interests") ? p.interests : [],
    language: allowed("language") ? p.language : null,
    region: allowed("region") ? p.region : null,
    status: p.status,
    isPrivate,
  };
}
