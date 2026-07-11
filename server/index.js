import http from 'node:http'
import { config } from './config.js'
import { createApp } from './http/create-app.js'
import { TokenBucket } from './moderation/rate-limiter.js'
import { RecentPairs } from './queue/recent-pairs.js'
import { MatchmakingQueue } from './queue/matchmaking-queue.js'
import { SessionRegistry } from './signaling/session-registry.js'
import { SignalingServer } from './signaling/signaling-server.js'

const sessions = new SessionRegistry({ reconnectGraceMs: config.reconnectGraceMs })
const recentPairs = new RecentPairs({ ttlMs: config.recentPairTtlMs })
const queue = new MatchmakingQueue({ ttlMs: config.queueEntryTtlMs, recentPairs })
const pairLimiter = new TokenBucket({ capacity: 4, refillEveryMs: 2_000 })
const chatLimiter = new TokenBucket({ capacity: 20, refillEveryMs: 500 })
const reportLimiter = new TokenBucket({ capacity: 2, refillEveryMs: 30_000 })

const app = createApp({ config, sessions, reportLimiter })
const httpServer = http.createServer(app)
const signalingServer = new SignalingServer({
  port: config.wsPort,
  sessions,
  queue,
  recentPairs,
  pairLimiter,
  chatLimiter,
  reconnectGraceMs: config.reconnectGraceMs,
  heartbeatIntervalMs: config.heartbeatIntervalMs,
})

httpServer.listen(config.serverPort, '0.0.0.0', () => {
  console.info(`Strangr web: http://localhost:${config.serverPort}`)
  console.info(`Strangr signaling: ws://localhost:${config.wsPort}`)
})

const shutdown = async () => {
  await signalingServer.close()
  httpServer.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
