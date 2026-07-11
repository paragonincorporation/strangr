import { describe, expect, test } from 'vitest'
import { transition } from './random-session.js'
describe('random session transitions', () => {
  test('ignores illegal and out-of-order events', () => {
    const idle = { status: 'idle' } as const
    expect(transition(idle, { type: 'CONNECTED' })).toEqual(idle)
  })
  test('moves video intent through media, queue, and match', () => {
    const media = transition({ status: 'idle' }, { type: 'START', mode: 'video' })
    const queued = transition(media, { type: 'MEDIA_READY', mode: 'video' })
    expect(
      transition(queued, {
        type: 'MATCHED',
        mode: 'video',
        matchId: crypto.randomUUID(),
        peerId: crypto.randomUUID(),
      }).status,
    ).toBe('matched')
  })
})
