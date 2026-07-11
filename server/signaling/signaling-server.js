import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'
import { cleanChatText, parseEnvelope, send } from './protocol.js'
import { startHeartbeat } from './heartbeat.js'

export class SignalingServer {
  constructor({
    port,
    sessions,
    queue,
    recentPairs,
    pairLimiter,
    chatLimiter,
    reconnectGraceMs,
    heartbeatIntervalMs,
  }) {
    this.sessions = sessions
    this.queue = queue
    this.recentPairs = recentPairs
    this.pairLimiter = pairLimiter
    this.chatLimiter = chatLimiter
    this.reconnectGraceMs = reconnectGraceMs
    this.pairs = new Map()
    this.wss = new WebSocketServer({ port, maxPayload: 16_384 })
    this.wss.on('connection', (socket) => this.#onConnection(socket))
    startHeartbeat(this.wss, heartbeatIntervalMs)

    this.cleanupInterval = setInterval(() => this.#cleanup(), 10_000)
    this.cleanupInterval.unref?.()
    this.wss.on('close', () => clearInterval(this.cleanupInterval))
  }

  address() {
    return this.wss.address()
  }

  close() {
    clearInterval(this.cleanupInterval)
    for (const client of this.wss.clients) client.terminate()
    return new Promise((resolve) => this.wss.close(resolve))
  }

  #onConnection(socket) {
    socket.isAlive = true
    socket.on('pong', () => { socket.isAlive = true })

    const provisional = this.sessions.create(socket)
    socket.session = provisional

    const readyTimer = setTimeout(() => {
      if (socket.session === provisional && provisional.socketReady) {
        this.#sendSessionReady(provisional)
      }
    }, 30)

    socket.on('message', (raw) => {
      const parsed = parseEnvelope(raw)
      if (!parsed.ok) {
        send(socket, 'error', { code: parsed.code, message: 'That message could not be processed.' })
        return
      }
      this.#handle(socket, parsed.envelope)
    })

    socket.on('close', () => {
      clearTimeout(readyTimer)
      this.#onClose(socket)
    })
    socket.on('error', () => {})
  }

  #handle(socket, envelope) {
    const session = socket.session
    if (!session) return
    const { type, payload, requestId } = envelope

    if (type === 'session.resume') {
      this.#resume(socket, session, payload, requestId)
      return
    }
    if (type === 'match.join') {
      this.#join(session, payload.mode, requestId)
      return
    }
    if (type === 'match.next') {
      this.#next(session, requestId)
      return
    }
    if (type === 'match.cancel') {
      this.queue.remove(session.id)
      send(socket, 'match.cancelled', {}, requestId)
      return
    }
    if (type === 'session.end') {
      session.explicitEnd = true
      this.queue.remove(session.id)
      this.#endPair(session, 'ended')
      this.sessions.remove(session.id)
      socket.close(1000, 'Session ended')
      return
    }
    if (type === 'rtc.signal') this.#relayRtc(session, payload, requestId)
    if (type === 'chat.message') this.#relayChat(session, payload, requestId)
    if (type === 'chat.typing') this.#relay(session, 'chat.typing', { typing: Boolean(payload.typing) })
    if (type === 'media.state') this.#relay(session, 'media.state', {
      audio: Boolean(payload.audio),
      video: Boolean(payload.video),
    })
  }

  #sendSessionReady(session) {
    send(session.socket, 'session.ready', {
      sessionId: session.id,
      resumeToken: session.resumeToken,
    })
  }

  #resume(socket, provisional, payload, requestId) {
    const resumed = this.sessions.resume(payload.sessionId, payload.resumeToken, socket)
    if (!resumed || resumed === provisional) {
      send(socket, 'session.resume_failed', { code: 'invalid_or_expired' }, requestId)
      this.#sendSessionReady(provisional)
      return
    }

    this.sessions.remove(provisional.id)
    socket.session = resumed
    const pair = resumed.pairId ? this.pairs.get(resumed.pairId) : null
    send(socket, 'session.resumed', {
      sessionId: resumed.id,
      pairId: pair?.id || null,
      role: pair ? (pair.initiatorId === resumed.id ? 'initiator' : 'responder') : null,
      mode: pair?.mode || resumed.mode,
      reportToken: resumed.reportToken,
    }, requestId)

    if (pair) {
      const peer = this.#peerFor(resumed)
      send(peer?.socket, 'peer.status', { status: 'resumed' })
    }
  }

  #join(session, mode, requestId) {
    if (!['video', 'text'].includes(mode)) {
      send(session.socket, 'error', { code: 'invalid_mode', message: 'Choose video or text chat.' }, requestId)
      return
    }
    if (session.pairId) return

    const limit = this.pairLimiter.consume(session.id)
    if (!limit.allowed) {
      send(session.socket, 'rate_limited', { scope: 'matching', retryAfterMs: limit.retryAfterMs }, requestId)
      return
    }

    session.mode = mode
    const result = this.queue.enqueue(session, mode)
    if (result.peer) {
      this.#pair(session, result.peer, mode)
      return
    }
    send(session.socket, 'match.queued', {
      mode,
      queuedAt: result.queuedAt,
      queueSize: result.queueSize,
    }, requestId)
  }

  #next(session, requestId) {
    const mode = session.mode || 'video'
    const limit = this.pairLimiter.consume(session.id)
    if (!limit.allowed) {
      send(session.socket, 'rate_limited', { scope: 'matching', retryAfterMs: limit.retryAfterMs }, requestId)
      return
    }
    this.queue.remove(session.id)
    this.#endPair(session, 'next')
    session.mode = mode
    const result = this.queue.enqueue(session, mode)
    if (result.peer) this.#pair(session, result.peer, mode)
    else send(session.socket, 'match.queued', {
      mode,
      queuedAt: result.queuedAt,
      queueSize: result.queueSize,
    }, requestId)
  }

  #pair(first, second, mode) {
    if (first.pairId || second.pairId || !first.socketReady || !second.socketReady) return
    const pairId = randomUUID()
    const firstReportToken = randomUUID()
    const secondReportToken = randomUUID()
    const pair = {
      id: pairId,
      mode,
      firstId: first.id,
      secondId: second.id,
      initiatorId: first.id,
    }
    this.pairs.set(pairId, pair)
    first.pairId = pairId
    second.pairId = pairId
    first.mode = mode
    second.mode = mode
    first.reportToken = firstReportToken
    second.reportToken = secondReportToken

    send(first.socket, 'match.found', { pairId, mode, role: 'initiator', reportToken: firstReportToken })
    send(second.socket, 'match.found', { pairId, mode, role: 'responder', reportToken: secondReportToken })
  }

  #endPair(session, reason) {
    if (!session.pairId) return
    const pair = this.pairs.get(session.pairId)
    if (!pair) {
      session.pairId = null
      session.reportToken = null
      return
    }
    const first = this.sessions.get(pair.firstId)
    const second = this.sessions.get(pair.secondId)
    this.recentPairs.remember(pair.firstId, pair.secondId)
    this.pairs.delete(pair.id)

    for (const member of [first, second]) {
      if (!member) continue
      member.pairId = null
      member.reportToken = null
    }

    const peer = session.id === pair.firstId ? second : first
    send(peer?.socket, 'peer.status', { status: 'left', reason })
  }

  #relayRtc(session, payload, requestId) {
    if (payload.pairId !== session.pairId || !payload.signal || typeof payload.signal !== 'object') {
      send(session.socket, 'error', { code: 'stale_pair', message: 'That connection is no longer active.' }, requestId)
      return
    }
    this.#relay(session, 'rtc.signal', { pairId: session.pairId, signal: payload.signal })
  }

  #relayChat(session, payload, requestId) {
    const text = cleanChatText(payload.text)
    if (!text || payload.pairId !== session.pairId) return
    const limit = this.chatLimiter.consume(session.id)
    if (!limit.allowed) {
      send(session.socket, 'rate_limited', { scope: 'chat', retryAfterMs: limit.retryAfterMs }, requestId)
      return
    }
    this.#relay(session, 'chat.message', { pairId: session.pairId, text })
    send(session.socket, 'chat.sent', { text }, requestId)
  }

  #relay(session, type, payload) {
    const peer = this.#peerFor(session)
    if (peer?.socketReady) send(peer.socket, type, payload)
  }

  #peerFor(session) {
    const pair = session.pairId ? this.pairs.get(session.pairId) : null
    if (!pair) return null
    return this.sessions.get(pair.firstId === session.id ? pair.secondId : pair.firstId)
  }

  #onClose(socket) {
    const session = socket.session
    if (!session || session.socket !== socket) return
    session.socketReady = false
    this.queue.remove(session.id)

    if (session.explicitEnd || !session.pairId) {
      this.sessions.remove(session.id)
      return
    }

    session.disconnectedAt = Date.now()
    const peer = this.#peerFor(session)
    send(peer?.socket, 'peer.status', {
      status: 'reconnecting',
      graceMs: this.reconnectGraceMs,
    })
    session.reconnectTimer = setTimeout(() => {
      if (session.socketReady) return
      this.#endPair(session, 'reconnect_timeout')
      this.sessions.remove(session.id)
    }, this.reconnectGraceMs)
    session.reconnectTimer.unref?.()
  }

  #cleanup() {
    for (const session of this.queue.prune()) {
      send(session.socket, 'match.timeout', { mode: session.mode })
    }
    this.recentPairs.prune()
  }
}
