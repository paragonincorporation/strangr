import { createHmac, randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cors from '@fastify/cors'
import { parseServerConfig, type ServerConfig } from '@strangr/config'
import {
  avatarUploadFinalizeRequestSchema,
  avatarUploadInitRequestSchema,
  healthResponseSchema,
  onboardingRequestSchema,
  parseClientRealtimeMessage,
  profilePatchRequestSchema,
  PROTOCOL_VERSION,
  serverRealtimeEnvelopeSchema,
  visibilityPatchRequestSchema,
  type AccountState,
  type ClientRealtimeEnvelope,
  matchJoinRequestSchema,
} from '@strangr/contracts'
import { createAesGcmFieldEncryptor, createDatabase } from '@strangr/database'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'
import { WebSocket, WebSocketServer, type RawData } from 'ws'
import { AccountService, DomainError } from './account-service.js'
import {
  capabilityError,
  createSupabaseTokenVerifier,
  type Capability,
  type TokenVerifier,
  type VerifiedIdentity,
} from './auth.js'
import { AvatarService, SupabaseStorage } from './avatar-service.js'
import { RedisRealtimeStore, type RealtimeIdentity } from './realtime.js'

declare module 'fastify' {
  interface FastifyRequest {
    auth?: {
      identity: VerifiedIdentity
      user: {
        id: string
        accountState: AccountState
        emailVerified: boolean
      }
    }
  }
}

export interface CreateAppOptions {
  config?: ServerConfig
  tokenVerifier?: TokenVerifier
  accounts?: AccountService
  avatars?: AvatarService
  realtime?: RedisRealtimeStore
}

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? parseServerConfig(process.env)
  const app = Fastify({ logger: { level: config.LOG_LEVEL } })
  const allowedOrigins = new Set([
    ...config.WEB_ALLOWED_ORIGINS,
    ...config.ADMIN_ALLOWED_ORIGINS,
    ...config.PREVIEW_ALLOWED_ORIGINS,
  ])
  const originAllowed = (origin: string | undefined) =>
    origin === undefined ? config.NODE_ENV !== 'production' : allowedOrigins.has(origin)
  const connection =
    options.accounts && options.avatars ? null : createDatabase(config.DATABASE_URL)
  const encryptor = createAesGcmFieldEncryptor(
    Buffer.from(config.BIRTH_DATE_ENCRYPTION_KEY, 'base64'),
    config.BIRTH_DATE_KEY_ID,
  )
  const accounts =
    options.accounts ??
    new AccountService(connection!.db, encryptor, {
      terms: config.CURRENT_TERMS_VERSION,
      guidelines: config.CURRENT_GUIDELINES_VERSION,
    })
  const avatars =
    options.avatars ??
    new AvatarService(
      connection!.db,
      new SupabaseStorage(
        config.SUPABASE_URL,
        config.SUPABASE_STORAGE_BUCKET,
        config.SUPABASE_SERVICE_ROLE_KEY,
      ),
    )
  const verifier = options.tokenVerifier ?? createSupabaseTokenVerifier(config)
  const realtime = options.realtime ?? new RedisRealtimeStore(config.REDIS_URL)
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 16_384 })
  const localSockets = new Map<string, WebSocket>()
  let subscriber: Awaited<ReturnType<RedisRealtimeStore['subscribeUserEvents']>> | null = null
  app.addHook('onReady', async () => {
    await realtime.connect()
    subscriber = await realtime.subscribeUserEvents((userId, message) => {
      for (const [key, socket] of localSockets)
        if (key.startsWith(`${userId}:`) && socket.readyState === WebSocket.OPEN)
          socket.send(message)
    })
  })

  void app.register(swagger, {
    openapi: { info: { title: 'Strangr API', version: '1.0.0' } },
  })
  void app.register(cors, {
    origin(origin, callback) {
      callback(null, originAllowed(origin))
    },
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'x-device-label'],
    maxAge: 600,
  })
  if (config.OPENAPI_ENABLED && config.NODE_ENV !== 'production')
    void app.register(swaggerUi, { routePrefix: '/documentation' })

  app.get('/health/live', {}, () => ({ ok: true }))

  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return reply.code(401).send(error('unauthenticated', 'Authentication required', request.id))
    }
    try {
      const identity = await verifier.verify(header.slice(7))
      const user = await accounts.reconcile(
        identity,
        typeof request.headers['x-device-label'] === 'string'
          ? request.headers['x-device-label'].slice(0, 120)
          : null,
      )
      request.auth = {
        identity,
        user: {
          id: user.id,
          accountState: user.accountState,
          emailVerified: user.emailVerified,
        },
      }
    } catch {
      return reply
        .code(401)
        .send(error('unauthenticated', 'Invalid or expired access token', request.id))
    }
  }
  const guard =
    (capability: Capability) => async (request: FastifyRequest, reply: FastifyReply) => {
      await authenticate(request, reply)
      if (reply.sent) return
      const auth = request.auth!
      const code = capabilityError(auth.user.accountState, auth.user.emailVerified, capability)
      if (code)
        return reply
          .code(403)
          .send(error(code, 'This account cannot perform that action', request.id))
    }
  const route =
    <T>(schema: z.ZodType<T>, handler: (request: FastifyRequest, value: T) => Promise<unknown>) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = schema.safeParse(request.body)
      if (!parsed.success)
        return reply.code(400).send(
          error('bad_request', 'Request validation failed', request.id, {
            issues: parsed.error.issues.map((x) => ({
              path: x.path.join('.'),
              message: x.message,
            })),
          }),
        )
      try {
        return await handler(request, parsed.data)
      } catch (e) {
        return domainReply(reply, request.id, e)
      }
    }
  app.get('/v1/me', { preHandler: guard('inspect_self') }, async (req, reply) => {
    try {
      return await accounts.me(req.auth!.user.id)
    } catch (e) {
      return domainReply(reply, req.id, e)
    }
  })
  app.get('/v1/me/sessions', { preHandler: guard('inspect_self') }, (req) =>
    accounts.sessions(req.auth!.user.id),
  )
  app.delete('/v1/me/sessions/:id', { preHandler: guard('inspect_self') }, async (req, reply) => {
    try {
      const sessionId = (req.params as { id: string }).id
      await accounts.revokeSession(req.auth!.user.id, sessionId)
      await realtime.revokeSession(sessionId)
      return reply.code(204).send()
    } catch (e) {
      return domainReply(reply, req.id, e)
    }
  })
  app.post('/v1/realtime/tickets', { preHandler: guard('contact') }, async (req, reply) => {
    try {
      const identity = await accounts.realtimeIdentity(
        req.auth!.user.id,
        req.auth!.identity.authSessionId,
      )
      return await realtime.createTicket(identity)
    } catch (cause) {
      return domainReply(reply, req.id, cause)
    }
  })
  app.post(
    '/v1/matches/tickets',
    { preHandler: guard('contact') },
    route(matchJoinRequestSchema, async (req, input) => {
      const identity = await accounts.realtimeIdentity(
        req.auth!.user.id,
        req.auth!.identity.authSessionId,
      )
      const limit = await realtime.rateLimit(`match:user:${identity.userId}`, 20, 60)
      if (!limit.allowed)
        throw new DomainError(
          'rate_limited',
          `Retry in ${Math.max(1, Math.ceil(limit.retryAfterMs / 1000))} seconds`,
          429,
        )
      const result = await realtime.joinQueue(identity, input.mode)
      if (result.match) await publishMatch(realtime, result.match)
      return {
        state: result.match ? 'matched' : 'queued',
        mode: input.mode,
        queuedAt: result.queuedAt,
      }
    }),
  )
  app.post('/v1/rtc/credentials', { preHandler: guard('contact') }, async (req, reply) => {
    try {
      const identity = await accounts.realtimeIdentity(
        req.auth!.user.id,
        req.auth!.identity.authSessionId,
      )
      const expires = Math.floor(Date.now() / 1000) + 300
      const username = `${expires}:${identity.userId}`
      const credential = createHmac('sha256', config.TURN_CREDENTIAL_SECRET)
        .update(username)
        .digest('base64')
      return {
        iceServers: [
          {
            urls: config.TURN_URLS.split(',').map((x) => x.trim()),
            username,
            credential,
          },
        ],
        expiresAt: new Date(expires * 1000).toISOString(),
      }
    } catch (cause) {
      return domainReply(reply, req.id, cause)
    }
  })
  app.post(
    '/v1/me/onboarding',
    { preHandler: guard('profile_setup') },
    route(onboardingRequestSchema, (req, input) => accounts.onboarding(req.auth!.user.id, input)),
  )
  app.patch(
    '/v1/profiles/me',
    { preHandler: guard('profile_setup') },
    route(profilePatchRequestSchema, (req, input) =>
      accounts.patchProfile(req.auth!.user.id, input),
    ),
  )
  app.patch(
    '/v1/profiles/me/visibility',
    { preHandler: guard('profile_setup') },
    route(visibilityPatchRequestSchema, (req, input) =>
      accounts.patchVisibility(req.auth!.user.id, input.fields),
    ),
  )
  app.get('/v1/profiles/:username', { preHandler: guard('contact') }, async (req, reply) => {
    try {
      return await accounts.profile(
        req.auth!.user.id,
        (req.params as { username: string }).username,
      )
    } catch (e) {
      return domainReply(reply, req.id, e)
    }
  })
  app.get('/v1/profiles/:username/avatar', { preHandler: guard('contact') }, async (req, reply) => {
    try {
      const ownerId = await accounts.avatarOwner(
        req.auth!.user.id,
        (req.params as { username: string }).username,
      )
      return reply.redirect(await avatars.signedAvatar(ownerId))
    } catch (cause) {
      return domainReply(reply, req.id, cause)
    }
  })
  app.post(
    '/v1/me/avatar-uploads',
    { preHandler: guard('profile_setup') },
    route(avatarUploadInitRequestSchema, (req, input) =>
      avatars.init(req.auth!.user.id, input.contentType, input.byteSize),
    ),
  )
  app.addContentTypeParser(
    ['image/jpeg', 'image/png', 'image/webp'],
    { parseAs: 'buffer', bodyLimit: 5 * 1024 * 1024 },
    (_req, body, done) => done(null, body),
  )
  app.put(
    '/v1/me/avatar-uploads/:id/content',
    { preHandler: guard('profile_setup') },
    async (req, reply) => {
      try {
        const body = req.body
        if (!Buffer.isBuffer(body))
          throw new DomainError('bad_request', 'Raster image body required')
        await avatars.upload(
          req.auth!.user.id,
          (req.params as { id: string }).id,
          body,
          req.headers['content-type'] ?? '',
        )
        return reply.code(204).send()
      } catch (e) {
        return domainReply(reply, req.id, e)
      }
    },
  )
  app.post(
    '/v1/me/avatar-uploads/finalize',
    { preHandler: guard('profile_setup') },
    route(avatarUploadFinalizeRequestSchema, (req, input) =>
      avatars.finalize(req.auth!.user.id, input.uploadId),
    ),
  )
  app.get(
    '/health/ready',
    {
      schema: {
        response: {
          200: z.toJSONSchema(healthResponseSchema),
          503: z.toJSONSchema(healthResponseSchema),
        },
      },
    },
    async (_req, reply) => {
      try {
        return {
          ok: await realtime.health(),
          dependencies: { postgres: 'up' as const, redis: 'up' as const },
        }
      } catch {
        return reply.code(503).send({ ok: false, dependencies: { postgres: 'up', redis: 'down' } })
      }
    },
  )

  sockets.on(
    'connection',
    (socket: WebSocket, _request: IncomingMessage, identity: RealtimeIdentity) => {
      const connectionId = randomUUID()
      localSockets.set(`${identity.userId}:${connectionId}`, socket)
      void realtime.bindConnection(identity, connectionId)
      let malformed = 0
      let alive = true
      const heartbeat = setInterval(() => {
        void realtime
          .isSessionRevoked(identity.sessionId)
          .then((revoked) => {
            if (!alive || revoked) {
              socket.close(4001, 'Session unavailable')
              return
            }
            alive = false
            socket.ping()
            void realtime.renewConnection(identity, connectionId)
          })
          .catch(() => socket.close(1013, 'Realtime dependency unavailable'))
      }, 15_000)
      socket.on('pong', () => {
        alive = true
      })
      socket.send(
        JSON.stringify(
          serverRealtimeEnvelopeSchema.parse({
            version: PROTOCOL_VERSION,
            type: 'connection.ready',
            requestId: randomUUID(),
            payload: { protocolVersion: PROTOCOL_VERSION, connectionId },
          }),
        ),
      )
      socket.on('message', (message: RawData, isBinary: boolean) => {
        if (isBinary) {
          socket.close(1003, 'Text messages only')
          return
        }
        const text = Array.isArray(message)
          ? Buffer.concat(message).toString('utf8')
          : message instanceof ArrayBuffer
            ? Buffer.from(message).toString('utf8')
            : message.toString('utf8')
        const parsed = parseClientRealtimeMessage(text)
        if (!parsed.success) {
          malformed++
          if (parsed.error === 'payload_too_large' || malformed >= 3)
            socket.close(parsed.error === 'payload_too_large' ? 1009 : 1008, parsed.error)
          return
        }
        const event = parsed.data
        void handleRealtime(event, identity, realtime)
          .then(async (messages) => {
            for (const item of messages)
              await realtime.publishUser(
                item.userId,
                JSON.stringify(serverRealtimeEnvelopeSchema.parse(item.event)),
              )
          })
          .catch(() =>
            socket.send(
              JSON.stringify({
                version: PROTOCOL_VERSION,
                type: 'error',
                requestId: event.requestId,
                payload: { code: 'bad_request', message: 'Command rejected' },
              }),
            ),
          )
        if (event.type === 'connection.ping')
          socket.send(
            JSON.stringify(
              serverRealtimeEnvelopeSchema.parse({
                version: PROTOCOL_VERSION,
                type: 'connection.pong',
                requestId: event.requestId,
                payload: event.payload,
              }),
            ),
          )
      })
      socket.on('close', () => {
        clearInterval(heartbeat)
        localSockets.delete(`${identity.userId}:${connectionId}`)
        void realtime.unbindConnection(identity, connectionId)
      })
    },
  )

  app.server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost')
    if (url.pathname !== '/ws') {
      socket.destroy()
      return
    }
    if (!originAllowed(request.headers.origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    const ticket = url.searchParams.get('ticket')
    if (!ticket) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    void realtime
      .consumeTicket(ticket)
      .then(async (identity) => {
        if (!identity || (await realtime.isSessionRevoked(identity.sessionId))) {
          socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
          socket.destroy()
          return
        }
        sockets.handleUpgrade(request, socket, head, (webSocket) =>
          sockets.emit('connection', webSocket, request, identity),
        )
      })
      .catch(() => socket.destroy())
  })
  app.addHook('onClose', () => {
    for (const socket of sockets.clients) {
      if (socket.readyState === WebSocket.OPEN) socket.close(1001, 'Server shutting down')
      else socket.terminate()
    }
  })
  app.addHook('onClose', async () => {
    if (subscriber?.isOpen) await subscriber.quit()
    await realtime.close()
  })
  if (connection) app.addHook('onClose', () => connection.pool.end())
  return app
}

type Outbound = {
  userId: string
  event: z.infer<typeof serverRealtimeEnvelopeSchema>
}
async function publishMatch(
  realtime: RedisRealtimeStore,
  match: Awaited<ReturnType<RedisRealtimeStore['getMatch']>> & {},
) {
  const requestId = randomUUID()
  for (const userId of [match.first, match.second])
    await realtime.publishUser(
      userId,
      JSON.stringify({
        version: PROTOCOL_VERSION,
        type: 'match.found',
        requestId,
        payload: {
          matchId: match.id,
          mode: match.mode,
          peerId: userId === match.first ? match.second : match.first,
          initiator: userId === match.first,
          expiresAt: match.expiresAt,
        },
      }),
    )
}
async function handleRealtime(
  event: ClientRealtimeEnvelope,
  identity: RealtimeIdentity,
  realtime: RedisRealtimeStore,
): Promise<Outbound[]> {
  if (event.type === 'connection.ping') return []
  if (event.type === 'match.join') {
    const result = await realtime.joinQueue(identity, event.payload.mode)
    if (result.match) await publishMatch(realtime, result.match)
    return result.match
      ? []
      : [
          {
            userId: identity.userId,
            event: {
              version: PROTOCOL_VERSION,
              type: 'match.queued',
              requestId: event.requestId,
              payload: { mode: event.payload.mode, queuedAt: result.queuedAt },
            },
          },
        ]
  }
  const match = await realtime.getMatch(event.payload.matchId)
  if (!match || (match.first !== identity.userId && match.second !== identity.userId))
    throw new Error('match_stale')
  const peerId = match.first === identity.userId ? match.second : match.first
  if (event.type === 'match.ack') {
    const connected = await realtime.acknowledge(match.id, identity.userId)
    return connected
      ? [match.first, match.second].map((userId) => ({
          userId,
          event: {
            version: PROTOCOL_VERSION,
            type: 'match.connected' as const,
            requestId: event.requestId,
            payload: { matchId: match.id },
          },
        }))
      : []
  }
  if (event.type === 'match.leave' || event.type === 'match.next') {
    await realtime.closeMatch(match.id, identity.userId)
    const ended: Outbound[] = [match.first, match.second].map((userId) => ({
      userId,
      event: {
        version: PROTOCOL_VERSION,
        type: 'match.ended' as const,
        requestId: event.requestId,
        payload: {
          matchId: match.id,
          reason:
            userId === identity.userId
              ? event.type === 'match.next'
                ? ('next' as const)
                : ('left' as const)
              : ('peer_left' as const),
        },
      },
    }))
    if (event.type === 'match.next') {
      const result = await realtime.joinQueue(identity, match.mode)
      if (result.match) await publishMatch(realtime, result.match)
      else
        ended.push({
          userId: identity.userId,
          event: {
            version: PROTOCOL_VERSION,
            type: 'match.queued',
            requestId: event.requestId,
            payload: { mode: match.mode, queuedAt: result.queuedAt },
          },
        })
    }
    return ended
  }
  if (event.type === 'chat.send') {
    const sequence = await realtime.nextSequence(match.id)
    const sentAt = new Date().toISOString()
    return [
      {
        userId: peerId,
        event: {
          version: PROTOCOL_VERSION,
          type: 'chat.message',
          requestId: event.requestId,
          payload: {
            ...event.payload,
            sequence,
            senderId: identity.userId,
            sentAt,
          },
        },
      },
      {
        userId: identity.userId,
        event: {
          version: PROTOCOL_VERSION,
          type: 'chat.ack',
          requestId: event.requestId,
          payload: {
            matchId: match.id,
            clientMessageId: event.payload.clientMessageId,
            sequence,
          },
        },
      },
    ]
  }
  return [{ userId: peerId, event }]
}

function error(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
) {
  return {
    error: { code, message, requestId, ...(details ? { details } : {}) },
  }
}
function domainReply(reply: FastifyReply, requestId: string, cause: unknown) {
  if (cause instanceof DomainError)
    return reply.code(cause.status).send(error(cause.code, cause.message, requestId))
  reply.log.error({ err: cause }, 'request failed')
  return reply.code(500).send(error('internal_error', 'Request failed', requestId))
}
