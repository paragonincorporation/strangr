export class TokenBucket {
  constructor({ capacity, refillAmount = 1, refillEveryMs, now = Date.now }) {
    this.capacity = capacity;
    this.refillAmount = refillAmount;
    this.refillEveryMs = refillEveryMs;
    this.now = now;
    this.buckets = new Map();
  }

  consume(key, amount = 1) {
    const currentTime = this.now();
    const bucket = this.buckets.get(key) || {
      tokens: this.capacity,
      updatedAt: currentTime,
    };
    const elapsed = Math.max(0, currentTime - bucket.updatedAt);
    const refills = Math.floor(elapsed / this.refillEveryMs);

    if (refills > 0) {
      bucket.tokens = Math.min(
        this.capacity,
        bucket.tokens + refills * this.refillAmount,
      );
      bucket.updatedAt += refills * this.refillEveryMs;
    }

    if (bucket.tokens < amount) {
      this.buckets.set(key, bucket);
      return {
        allowed: false,
        retryAfterMs: Math.max(
          1,
          this.refillEveryMs - (currentTime - bucket.updatedAt),
        ),
      };
    }

    bucket.tokens -= amount;
    this.buckets.set(key, bucket);
    return { allowed: true, retryAfterMs: 0 };
  }

  delete(key) {
    this.buckets.delete(key);
  }
}
