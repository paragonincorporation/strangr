export class RecentPairs {
  constructor({ ttlMs = 60_000, now = Date.now } = {}) {
    this.ttlMs = ttlMs
    this.now = now
    this.entries = new Map()
  }

  remember(firstId, secondId) {
    const expiresAt = this.now() + this.ttlMs
    this.#set(firstId, secondId, expiresAt)
    this.#set(secondId, firstId, expiresAt)
  }

  has(firstId, secondId) {
    const peers = this.entries.get(firstId)
    if (!peers) return false
    const expiresAt = peers.get(secondId)
    if (!expiresAt) return false
    if (expiresAt <= this.now()) {
      peers.delete(secondId)
      if (peers.size === 0) this.entries.delete(firstId)
      return false
    }
    return true
  }

  prune() {
    for (const [sessionId, peers] of this.entries) {
      for (const [peerId, expiresAt] of peers) {
        if (expiresAt <= this.now()) peers.delete(peerId)
      }
      if (peers.size === 0) this.entries.delete(sessionId)
    }
  }

  #set(firstId, secondId, expiresAt) {
    const peers = this.entries.get(firstId) || new Map()
    peers.set(secondId, expiresAt)
    this.entries.set(firstId, peers)
  }
}
