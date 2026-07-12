import { randomUUID } from "node:crypto";
import {
  createAesGcmFieldEncryptor,
  createDatabase,
  IdentityRepository,
  ProfileRepository,
  users,
  BlockRepository,
  EncounterRepository,
  FriendRepository,
  privacySettings,
  friendships,
  friendRequests,
  LaunchRepository,
  MatchingPreferenceRepository,
  entitlementGrants,
  EngagementRepository,
  launchCountries,
  userCountryState,
  conversationRatings,
} from "@paramingle/database";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://paramingle:paramingle_local_only@localhost:5432/paramingle";
const { db, pool } = createDatabase(databaseUrl);
const encryptor = createAesGcmFieldEncryptor(
  new Uint8Array(32).fill(9),
  "integration-v1",
);
const identities = new IdentityRepository(db, encryptor);
const profileRepository = new ProfileRepository(db);
const encounters = new EncounterRepository(db);
const blocks = new BlockRepository(db);
const friends = new FriendRepository(db);
const launch = new LaunchRepository(db);
const matching = new MatchingPreferenceRepository(db);
const engagement = new EngagementRepository(db);

beforeEach(async () => {
  await db.execute(sql`truncate table encounters, users cascade`);
});

describe("encounter retention and blocks", () => {
  async function people() {
    const first = await identities.create({ authSubject: randomUUID() });
    const second = await identities.create({ authSubject: randomUUID() });
    await profileRepository.create(
      first.id,
      `first_${first.id.slice(0, 6)}`,
      "First",
    );
    await profileRepository.create(
      second.id,
      `second_${second.id.slice(0, 6)}`,
      "Second",
    );
    return [first.id, second.id] as const;
  }

  test("persists one idempotent encounter and ordered random text without media payloads", async () => {
    const [first, second] = await people();
    const id = randomUUID();
    const now = new Date("2026-07-12T00:00:00.000Z");
    await Promise.all([
      encounters.start(id, "text", [first, second], now),
      encounters.start(id, "text", [first, second], now),
    ]);
    const messageId = randomUUID();
    const message = await encounters.addRandomMessage(
      id,
      first,
      messageId,
      1,
      "  hello <b>plain</b>  ",
      now,
    );
    const page = await encounters.list(
      first,
      undefined,
      20,
      new Date(now.getTime() + 1),
    );
    expect(page.items).toHaveLength(1);
    expect(JSON.stringify(page)).not.toMatch(/sdp|ice|audio|video.*content/i);
    await encounters.preserveEvidence(
      id,
      message.id,
      "user_report",
      new Date("2026-08-12T00:00:00.000Z"),
    );
    const cleanup = await encounters.cleanupExpired(
      500,
      new Date(now.getTime() + 48 * 60 * 60 * 1000 + 1),
    );
    expect(cleanup.expiredMessages).toBe(1);
    const evidence = await db.execute(sql`select excerpt from report_evidence`);
    expect(evidence.rows).toHaveLength(1);
  });

  test("hides for one participant, enforces either-direction block, and deletes at the exact boundary", async () => {
    const [first, second] = await people();
    const id = randomUUID();
    const now = new Date("2026-07-12T00:00:00.000Z");
    await encounters.start(id, "text", [first, second], now);
    await encounters.hide(first, id);
    expect(
      (await encounters.list(first, undefined, 20, new Date(now.getTime() + 1)))
        .items,
    ).toHaveLength(0);
    expect(
      (
        await encounters.list(
          second,
          undefined,
          20,
          new Date(now.getTime() + 1),
        )
      ).items,
    ).toHaveLength(1);
    await blocks.create(first, second, "safety");
    expect(await blocks.hasEitherDirection(second, first)).toBe(true);
    const atBoundary = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const result = await encounters.cleanupExpired(
      500,
      new Date(atBoundary.getTime() + 1),
    );
    expect(result.expiredEncounters).toBe(1);
  });

  test("rejects self-blocks and treats opposite simultaneous blocks as idempotent pair records", async () => {
    const [first, second] = await people();
    await expect(blocks.create(first, first, "other")).rejects.toThrow(
      "self_block",
    );
    await Promise.all([
      blocks.create(first, second, "spam"),
      blocks.create(second, first, "safety"),
    ]);
    expect(await blocks.hasEitherDirection(first, second)).toBe(true);
  });
});

describe("ratings, safe cards, and reconnect", () => {
  async function eligiblePair() {
    const first = await identities.create({
      authSubject: randomUUID(),
      birthDate: "2000-01-01",
      cohort: "adult_18_plus",
    });
    const second = await identities.create({
      authSubject: randomUUID(),
      birthDate: "2000-01-02",
      cohort: "adult_18_plus",
    });
    await db
      .update(users)
      .set({ accountState: "active", emailVerified: true })
      .where(sql`${users.id} in (${first.id},${second.id})`);
    await profileRepository.create(
      first.id,
      `rate_${first.id.slice(0, 6)}`,
      "First",
    );
    await profileRepository.create(
      second.id,
      `rate_${second.id.slice(0, 6)}`,
      "Second",
    );
    await db
      .insert(launchCountries)
      .values({ countryCode: "BD", matchingEnabled: true })
      .onConflictDoUpdate({
        target: launchCountries.countryCode,
        set: { matchingEnabled: true },
      });
    await db.insert(userCountryState).values([
      {
        userId: first.id,
        registrationCountry: "BD",
        lastObservedCountry: "BD",
        countrySource: "test",
      },
      {
        userId: second.id,
        registrationCountry: "BD",
        lastObservedCountry: "BD",
        countrySource: "test",
      },
    ]);
    return [first.id, second.id] as const;
  }

  test("enforces duration, immutable retries, privacy, and aggregate likes", async () => {
    const [first, second] = await eligiblePair();
    const id = randomUUID();
    const connected = new Date("2026-07-13T00:00:00Z");
    await encounters.start(id, "text", [first, second], connected);
    await engagement.markConnected(id, connected);
    await expect(
      engagement.rating(
        id,
        first,
        "like",
        new Date(connected.getTime() + 119_999),
      ),
    ).rejects.toThrow("rating_not_eligible");
    const atBoundary = new Date(connected.getTime() + 120_000);
    const [one, retry] = await Promise.all([
      engagement.rating(id, first, "like", atBoundary),
      engagement.rating(id, first, "like", atBoundary),
    ]);
    expect(one.peerOutcome).toBeNull();
    expect(retry.outcome).toBe("like");
    await expect(
      engagement.rating(id, first, "dislike", atBoundary),
    ).rejects.toThrow("rating_immutable");
    expect(await db.select().from(conversationRatings)).toHaveLength(1);
    expect(await engagement.ratingSummary(second)).toEqual({
      totalLikes: 1,
      totalRatings: 1,
    });
  });

  test("reveals only an encounter safe card and revokes it on block", async () => {
    const [first, second] = await eligiblePair();
    const id = randomUUID();
    await encounters.start(id, "video", [first, second]);
    await engagement.revealOwnCard(id, second);
    const access = await engagement.authorizeCallCard(id, first);
    expect(access).toEqual({
      subjectId: second,
      revealSource: "subject_consent",
    });
    await blocks.create(first, second, "safety");
    await engagement.revokePair(first, second);
    await expect(engagement.authorizeCallCard(id, first)).rejects.toThrow(
      "encounter_unavailable",
    );
  });

  test("limits reconnect to entitled users and requires recipient acceptance", async () => {
    const [first, second] = await eligiblePair();
    const id = randomUUID();
    const connected = new Date("2026-07-13T00:00:00Z");
    await encounters.start(id, "text", [first, second], connected);
    await engagement.markConnected(id, connected);
    await encounters.end(
      id,
      "left",
      first,
      undefined,
      new Date(connected.getTime() + 130_000),
    );
    await engagement.finalizeTiming(
      id,
      new Date(connected.getTime() + 130_000),
    );
    await expect(engagement.createReconnect(first, id)).rejects.toThrow(
      "entitlement_required",
    );
    await db.insert(entitlementGrants).values({
      userId: first,
      entitlementKey: "matching.reconnect",
      source: "test",
      sourceReference: randomUUID(),
    });
    const offer = await engagement.createReconnect(first, id);
    expect(
      (await engagement.resolveReconnect(offer.id, second, "accept")).state,
    ).toBe("accepted");
  });
});

describe("friend requests and friendships", () => {
  async function eligiblePeople(now = new Date("2026-07-12T00:00:00.000Z")) {
    const first = await identities.create({ authSubject: randomUUID() });
    const second = await identities.create({ authSubject: randomUUID() });
    await profileRepository.create(
      first.id,
      `friend_${first.id.slice(0, 6)}`,
      "First friend",
    );
    await profileRepository.create(
      second.id,
      `friend_${second.id.slice(0, 6)}`,
      "Second friend",
    );
    await db
      .insert(privacySettings)
      .values([{ userId: first.id }, { userId: second.id }]);
    const encounterId = randomUUID();
    await encounters.start(encounterId, "text", [first.id, second.id], now);
    return { first: first.id, second: second.id, encounterId, now };
  }

  test("crossing requests create exactly one friendship and direct thread", async () => {
    const { first, second, encounterId, now } = await eligiblePeople();
    expect(
      (await friends.createRequest(first, second, encounterId, now)).state,
    ).toBe("pending");
    expect(
      (await friends.createRequest(second, first, encounterId, now)).state,
    ).toBe("friends");
    expect(await db.select().from(friendships)).toHaveLength(1);
    expect((await friends.list(first)).items).toHaveLength(1);
  });

  test("accept is transaction-safe and block remains dominant", async () => {
    const { first, second, encounterId, now } = await eligiblePeople();
    const created = await friends.createRequest(
      first,
      second,
      encounterId,
      now,
    );
    const results = await Promise.allSettled([
      friends.resolve(second, created.requestId!, "accept", now),
      friends.resolve(second, created.requestId!, "accept", now),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await db.select().from(friendships)).toHaveLength(1);
    await blocks.create(first, second, "safety");
    await expect(
      friends.createRequest(first, second, encounterId, now),
    ).rejects.toThrow("relationship_unavailable");
  });

  test("rejects expired/outside-window requests and cleans request records after 30 days", async () => {
    const { first, second, encounterId, now } = await eligiblePeople();
    await expect(
      friends.createRequest(
        first,
        second,
        encounterId,
        new Date(now.getTime() + 48 * 60 * 60 * 1000 + 1),
      ),
    ).rejects.toThrow("encounter_unavailable");
    const created = await friends.createRequest(
      first,
      second,
      encounterId,
      now,
    );
    await friends.resolve(second, created.requestId!, "reject", now);
    const cleanup = await friends.cleanup(
      500,
      new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000),
    );
    expect(cleanup.purgedRequests).toBe(1);
    expect(await db.select().from(friendRequests)).toHaveLength(0);
  });
});
afterAll(async () => {
  await pool.end();
});

describe("identity persistence", () => {
  test("encrypts birth date and omits it from public serialization", async () => {
    const identity = await identities.create({
      authSubject: randomUUID(),
      birthDate: "2000-01-02",
      cohort: "adult_18_plus",
    });
    const raw = await db.select().from(users);
    expect(raw[0]?.birthDateCiphertext).not.toContain("2000-01-02");
    const publicAccount = await identities.findPublicAccount(identity.id);
    expect(JSON.stringify(publicAccount)).not.toContain("birthDate");
    expect(publicAccount?.ageCohort).toBe("adult_18_plus");
  });

  test("lets the unique normalized username constraint decide a race", async () => {
    const first = await identities.create({ authSubject: randomUUID() });
    const second = await identities.create({ authSubject: randomUUID() });
    const results = await Promise.allSettled([
      profileRepository.create(first.id, "Ada_One", "Ada"),
      profileRepository.create(second.id, "ada_one", "Other Ada"),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
  });

  test("enforces complete birth-date encryption metadata", async () => {
    await expect(
      db.insert(users).values({
        authSubject: randomUUID(),
        birthDateCiphertext: "ciphertext",
      }),
    ).rejects.toThrow();
  });
});

describe("launch country controls", () => {
  test("denies missing countries and audits an enabled country update", async () => {
    const actor = await identities.create({ authSubject: randomUUID() });
    expect(await launch.availability("BD")).toMatchObject({
      countryCode: "BD",
      registrationEnabled: false,
      matchingEnabled: false,
      billingEnabled: false,
      reasonCode: "not_reviewed",
    });
    await launch.update(actor.id, "bd", {
      registrationEnabled: true,
      matchingEnabled: true,
      billingEnabled: false,
      reasonCode: "legal_review_complete",
      purpose: "Approve reviewed launch country",
    });
    await launch.observeUser(actor.id, "BD", "integration-test");
    await expect(
      launch.requireUser(actor.id, "matching"),
    ).resolves.toMatchObject({ countryCode: "BD", matchingEnabled: true });
    await expect(launch.requireUser(actor.id, "billing")).rejects.toThrow(
      "country_unavailable",
    );
  });
});

describe("matching preferences and entitlements", () => {
  test("keeps gender filtering paid and builds server-owned criteria", async () => {
    const user = await identities.create({ authSubject: randomUUID() });
    await profileRepository.create(
      user.id,
      `match_${user.id.slice(0, 6)}`,
      "Match",
    );
    await launch.observeUser(user.id, "BD", "integration-test");
    const freeInput = {
      countryPreference: "US" as const,
      languagePreference: "en",
      interestTags: ["music"],
      genderIdentity: "woman" as const,
      genderPreference: "women" as const,
      allowPreferenceRelaxation: true,
    };
    await expect(matching.update(user.id, freeInput)).rejects.toThrow(
      "entitlement_required",
    );
    await db.insert(entitlementGrants).values({
      userId: user.id,
      entitlementKey: "matching.gender_filter",
      source: "integration",
      sourceReference: "lite-plan",
    });
    await matching.update(user.id, freeInput);
    expect(await matching.criteria(user.id)).toMatchObject({
      country: "BD",
      countryPreference: "US",
      genderIdentity: "woman",
      genderPreference: "women",
    });
  });
});
