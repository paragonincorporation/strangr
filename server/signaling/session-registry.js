import { randomUUID } from 'node:crypto'

export class SessionRegistry {
  constructor({ reconnectGraceMs = 60_000, now = Date.now } = {}) {
    this.reconnectGraceMs = reconnectGraceMs
    this.now = now
    this.sessions = new Map()
    this.tokens = new Map()
  }

  create(socket) {
    const session = {
      id: randomUUID(),
      resumeToken: randomUUID(),
      socket,
      socketReady: true,
      pairId: null,
      mode: null,
      reportToken: null,
      disconnectedAt: null,
      reconnectTimer: null,
      explicitEnd: false,
    }
    this.sessions.set(session.id, session)
    this.tokens.set(session.resumeToken, session.id)
    return session
  }

  get(sessionId) {
    return this.sessions.get(sessionId)
  }

  resume(sessionId, token, socket) {
    const session = this.sessions.get(sessionId)
    if (!session || session.resumeToken !== token || this.tokens.get(token) !== sessionId) return null
    if (session.disconnectedAt && this.now() - session.disconnectedAt > this.reconnectGraceMs) return null
    session.socket = socket
    session.socketReady = true
    session.disconnectedAt = null
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer)
    session.reconnectTimer = null
    return session
  }

  remove(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer)
    this.tokens.delete(session.resumeToken)
    this.sessions.delete(sessionId)
    return session
  }

  size() {
    return this.sessions.size
  }
}
