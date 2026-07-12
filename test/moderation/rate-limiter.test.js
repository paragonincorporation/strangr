import test from "node:test";
import assert from "node:assert/strict";
import { TokenBucket } from "../../server/moderation/rate-limiter.js";

test("token bucket blocks bursts and refills predictably", () => {
  let now = 0;
  const limiter = new TokenBucket({
    capacity: 2,
    refillEveryMs: 1_000,
    now: () => now,
  });
  assert.equal(limiter.consume("session").allowed, true);
  assert.equal(limiter.consume("session").allowed, true);
  assert.equal(limiter.consume("session").allowed, false);
  now = 1_000;
  assert.equal(limiter.consume("session").allowed, true);
});
