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
});
