import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { RedisRealtimeStore } from "../../apps/api/src/realtime.js";

const namespace = `paramingle-test-${process.pid}-${Date.now()}`;
const store = new RedisRealtimeStore(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  namespace,
);
const first = {
  userId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  cohort: "adult_18_plus" as const,
};
const second = {
  userId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  cohort: "adult_18_plus" as const,
};
const criteria = {
  country: "BD",
  language: "en",
  interests: ["music"],
  countryPreference: null,
  languagePreference: null,
  interestTags: [],
  genderIdentity: "prefer_not_to_say" as const,
  genderPreference: "everyone" as const,
  allowPreferenceRelaxation: false,
};

beforeAll(() => store.connect());
afterAll(async () => {
  const keys: string[] = [];
  for await (const batch of store.client.scanIterator({
    MATCH: `${namespace}:*`,
  }))
    keys.push(...batch);
  if (keys.length) await store.client.sendCommand(["DEL", ...keys]);
  await store.close();
});

describe("Redis realtime primitives", () => {
  test("shares tickets, queues, and matches across API instances", async () => {
    const other = new RedisRealtimeStore(
      process.env.REDIS_URL ?? "redis://localhost:6379",
      namespace,
    );
    await other.connect();
    try {
      const issued = await store.createTicket(first);
      expect(await other.consumeTicket(issued.ticket)).toMatchObject(first);

      expect(
        (await store.joinQueue(first, "video", criteria)).match,
      ).toBeNull();
      const paired = await other.joinQueue(second, "video", criteria);
      expect(new Set([paired.match?.first, paired.match?.second])).toEqual(
        new Set([first.userId, second.userId]),
      );
      expect(await store.getMatch(paired.match!.id)).toEqual(
        await other.getMatch(paired.match!.id),
      );
      await other.closeMatch(paired.match!.id, second.userId);
    } finally {
      await other.close();
    }
  });

  test("consumes a ticket exactly once under concurrency", async () => {
    const issued = await store.createTicket(first);
    const results = await Promise.all([
      store.consumeTicket(issued.ticket),
      store.consumeTicket(issued.ticket),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  test("partitions cohorts and atomically pairs eligible users", async () => {
    expect((await store.joinQueue(first, "text", criteria)).match).toBeNull();
    const minor = {
      ...second,
      userId: crypto.randomUUID(),
      cohort: "minor_16_17" as const,
    };
    expect((await store.joinQueue(minor, "text", criteria)).match).toBeNull();
    const paired = await store.joinQueue(second, "text", criteria);
    expect(new Set([paired.match?.first, paired.match?.second])).toEqual(
      new Set([first.userId, second.userId]),
    );
  });
  test("shares rate limits and rejects stale match membership", async () => {
    expect((await store.rateLimit("device:a", 1, 10)).allowed).toBe(true);
    expect((await store.rateLimit("device:a", 1, 10)).allowed).toBe(false);
    expect(await store.acknowledge(crypto.randomUUID(), first.userId)).toBe(
      false,
    );
  });
  test("marks a match connected once and extends its active lease", async () => {
    const active = await store.activeMatchBetween(first.userId, second.userId);
    if (active) await store.closeMatch(active.id, first.userId);
    expect((await store.joinQueue(first, "text", criteria)).match).toBeNull();
    const paired = (await store.joinQueue(second, "text", criteria)).match!;
    expect(await store.acknowledge(paired.id, first.userId)).toBeNull();
    const connectedAt = await store.acknowledge(paired.id, second.userId);
    expect(connectedAt).toBeTypeOf("string");
    expect(await store.acknowledge(paired.id, first.userId)).toBe(connectedAt);
    expect((await store.getMatch(paired.id))?.connectedAt).toBe(connectedAt);
    expect(
      await store.client.ttl(`${namespace}:match:${paired.id}`),
    ).toBeGreaterThan(21);
  });

  test("enforces global/country socket reservations and releases a closed connection", async () => {
    const firstWithCountry = { ...first, country: "BD" };
    const secondWithCountry = { ...second, country: "BD" };
    const issued = await store.createTicket(firstWithCountry, 30, {
      global: 1,
      country: 1,
    });
    await expect(
      store.createTicket(secondWithCountry, 30, { global: 1, country: 1 }),
    ).rejects.toThrow("capacity_full");
    const consumed = await store.consumeTicket(issued.ticket);
    expect(consumed).not.toBeNull();
    const connectionId = crypto.randomUUID();
    await store.bindConnection(consumed!, connectionId);
    expect(await store.capacitySnapshot("BD")).toEqual({
      global: 1,
      country: 1,
    });
    await store.unbindConnection(consumed!, connectionId);
    await expect(
      store.createTicket(secondWithCountry, 30, { global: 1, country: 1 }),
    ).resolves.toHaveProperty("ticket");
  });

  test("blocking an active direct call removes both active leases", async () => {
    const callId = crypto.randomUUID();
    await expect(
      store.acquireDirectCall(callId, first.userId, second.userId),
    ).resolves.toMatchObject({ callId });
    expect(
      await store.activeDirectCallBetween(first.userId, second.userId),
    ).toMatchObject({ callId });
    await store.blockPair(first.userId, second.userId);
    expect(await store.getDirectCall(callId)).toBeNull();
    expect(
      await store.activeDirectCallBetween(first.userId, second.userId),
    ).toBeNull();
  });

  test("keeps free users matchable under the capped paid queue score", async () => {
    const free = { ...first, userId: crypto.randomUUID() };
    const paid = { ...second, userId: crypto.randomUUID() };
    const seekerOne = { ...first, userId: crypto.randomUUID() };
    const seekerTwo = { ...second, userId: crypto.randomUUID() };
    store.setBlockChecker((one, two) =>
      Promise.resolve(
        new Set([one, two]).has(free.userId) &&
          new Set([one, two]).has(paid.userId),
      ),
    );
    try {
      expect((await store.joinQueue(free, "video", criteria)).match).toBeNull();
      expect(
        (await store.joinQueue(paid, "video", criteria, 2)).match,
      ).toBeNull();
      const firstMatch = (await store.joinQueue(seekerOne, "video", criteria))
        .match!;
      expect([firstMatch.first, firstMatch.second]).toContain(paid.userId);
      const secondMatch = (await store.joinQueue(seekerTwo, "video", criteria))
        .match!;
      expect([secondMatch.first, secondMatch.second]).toContain(free.userId);
      await store.closeMatch(firstMatch.id, seekerOne.userId);
      await store.closeMatch(secondMatch.id, seekerTwo.userId);
    } finally {
      store.setBlockChecker(() => Promise.resolve(false));
    }
  });
});
