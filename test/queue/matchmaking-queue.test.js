import test from "node:test";
import assert from "node:assert/strict";
import { MatchmakingQueue } from "../../server/queue/matchmaking-queue.js";
import { RecentPairs } from "../../server/queue/recent-pairs.js";

const session = (id) => ({ id, socketReady: true, pairId: null });

test("queues one idempotent entry per session and matches the same mode", () => {
  let now = 1_000;
  const recentPairs = new RecentPairs({ now: () => now });
  const queue = new MatchmakingQueue({
    recentPairs,
    now: () => now,
    random: () => 0,
  });
  const first = session("first");
  const second = session("second");

  assert.equal(queue.enqueue(first, "video").queued, true);
  assert.equal(queue.enqueue(first, "video").queued, true);
  assert.equal(queue.size("video"), 1);
  assert.equal(queue.enqueue(second, "text").queued, true);
  assert.equal(queue.size(), 2);

  const third = session("third");
  const match = queue.enqueue(third, "video");
  assert.equal(match.peer, first);
  assert.equal(queue.size("video"), 0);
  assert.equal(queue.size("text"), 1);
});

test("recent peers are excluded until the window expires", () => {
  let now = 5_000;
  const recentPairs = new RecentPairs({ ttlMs: 1_000, now: () => now });
  const queue = new MatchmakingQueue({
    recentPairs,
    now: () => now,
    random: () => 0,
  });
  const first = session("first");
  const second = session("second");
  recentPairs.remember(first.id, second.id);

  queue.enqueue(first, "video");
  assert.equal(queue.enqueue(second, "video").peer, null);
  assert.equal(queue.size("video"), 2);

  queue.remove(second.id);
  now += 1_001;
  assert.equal(queue.enqueue(second, "video").peer, first);
});

test("prune removes abandoned and expired entries", () => {
  let now = 0;
  const queue = new MatchmakingQueue({
    ttlMs: 100,
    recentPairs: new RecentPairs({ now: () => now }),
    now: () => now,
  });
  const expired = session("expired");
  const dead = session("dead");
  queue.enqueue(expired, "text");
  queue.enqueue(dead, "video");
  dead.socketReady = false;
  now = 101;

  assert.deepEqual(new Set(queue.prune()), new Set([expired, dead]));
  assert.equal(queue.size(), 0);
});
