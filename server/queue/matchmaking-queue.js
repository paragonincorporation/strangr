const MODES = new Set(['video', 'text'])

export class MatchmakingQueue {
  constructor({ ttlMs = 120_000, recentPairs, now = Date.now, random = Math.random } = {}) {
    this.ttlMs = ttlMs
    this.recentPairs = recentPairs
    this.now = now
    this.random = random
    this.entries = new Map()
  }

  enqueue(session, mode) {
    if (!MODES.has(mode)) throw new Error('Unsupported match mode')
    this.remove(session.id)

    const eligible = [...this.entries.values()].filter((entry) => (
      entry.mode === mode
      && entry.session.id !== session.id
      && entry.session.socketReady
      && !entry.session.pairId
      && !this.recentPairs?.has(session.id, entry.session.id)
    ))

    if (eligible.length) {
      const index = Math.floor(this.random() * eligible.length)
      const peerEntry = eligible[index]
      this.entries.delete(peerEntry.session.id)
      return { peer: peerEntry.session, queued: false }
    }

    const queuedAt = this.now()
    this.entries.set(session.id, {
      session,
      mode,
      queuedAt,
      expiresAt: queuedAt + this.ttlMs,
    })
    return { peer: null, queued: true, queuedAt, queueSize: this.size(mode) }
  }

  remove(sessionId) {
    return this.entries.delete(sessionId)
  }

  has(sessionId) {
    return this.entries.has(sessionId)
  }

  size(mode) {
    return [...this.entries.values()].filter((entry) => !mode || entry.mode === mode).length
  }

  prune() {
    const expired = []
    const currentTime = this.now()
    for (const [sessionId, entry] of this.entries) {
      if (entry.expiresAt <= currentTime || !entry.session.socketReady) {
        this.entries.delete(sessionId)
        expired.push(entry.session)
      }
    }
    return expired
  }
}
