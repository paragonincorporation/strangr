import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { RedisRealtimeStore } from '../../apps/api/src/realtime.js'

const namespace = `strangr-test-${process.pid}-${Date.now()}`
const store = new RedisRealtimeStore(process.env.REDIS_URL ?? 'redis://localhost:6379', namespace)
const first = {
  userId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  cohort: 'adult_18_plus' as const,
}
const second = {
  userId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  cohort: 'adult_18_plus' as const,
}

beforeAll(() => store.connect())
afterAll(async () => {
  const keys: string[] = []
  for await (const batch of store.client.scanIterator({ MATCH: `${namespace}:*` }))
    keys.push(...batch)
  if (keys.length) await store.client.sendCommand(['DEL', ...keys])
  await store.close()
})

describe('Redis realtime primitives', () => {
  test('consumes a ticket exactly once under concurrency', async () => {
    const issued = await store.createTicket(first)
    const results = await Promise.all([
      store.consumeTicket(issued.ticket),
      store.consumeTicket(issued.ticket),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
  })
  test('partitions cohorts and atomically pairs eligible users', async () => {
    expect((await store.joinQueue(first, 'text')).match).toBeNull()
    const minor = { ...second, userId: crypto.randomUUID(), cohort: 'minor_16_17' as const }
    expect((await store.joinQueue(minor, 'text')).match).toBeNull()
    const paired = await store.joinQueue(second, 'text')
    expect(new Set([paired.match?.first, paired.match?.second])).toEqual(
      new Set([first.userId, second.userId]),
    )
  })
  test('shares rate limits and rejects stale match membership', async () => {
    expect((await store.rateLimit('device:a', 1, 10)).allowed).toBe(true)
    expect((await store.rateLimit('device:a', 1, 10)).allowed).toBe(false)
    expect(await store.acknowledge(crypto.randomUUID(), first.userId)).toBe(false)
  })
})
