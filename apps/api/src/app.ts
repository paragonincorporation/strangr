import { createHmac, randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import cors from "@fastify/cors";
import { parseServerConfig, type ServerConfig } from "@paramingle/config";
import {
  avatarUploadFinalizeRequestSchema,
  avatarUploadInitRequestSchema,
  blockCreateRequestSchema,
  friendRequestActionSchema,
  friendRequestCreateSchema,
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
  muteRequestSchema,
  directMessageSendSchema,
  readCursorSchema,
  messageDeleteSchema,
  directCallCreateSchema,
  directCallActionSchema,
  reportCreateSchema,
  caseAssignSchema,
  sanctionCreateSchema,
  sanctionReverseSchema,
  appealCreateSchema,
  appealReviewSchema,
} from "@paramingle/contracts";
import {
  BlockRepository,
  EncounterRepository,
  FriendRepository,
  CommunicationRepository,
  ModerationRepository,
  createAesGcmFieldEncryptor,
  createDatabase,
} from "@paramingle/database";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { AccountService, DomainError } from "./account-service.js";
import {
  capabilityError,
  createSupabaseTokenVerifier,
  type Capability,
  type TokenVerifier,
  type VerifiedIdentity,
} from "./auth.js";
import { AvatarService, SupabaseStorage } from "./avatar-service.js";
import { RedisRealtimeStore, type RealtimeIdentity } from "./realtime.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      identity: VerifiedIdentity;
      user: {
        id: string;
        accountState: AccountState;
        emailVerified: boolean;
      };
    };
  }
}

export interface CreateAppOptions {
  config?: ServerConfig;
  tokenVerifier?: TokenVerifier;
  accounts?: AccountService;
  avatars?: AvatarService;
  realtime?: RedisRealtimeStore;
  encounters?: EncounterRepository;
  blocks?: BlockRepository;
  friends?: FriendRepository;
  communications?: CommunicationRepository;
  moderation?: ModerationRepository;
}

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? parseServerConfig(process.env);
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  const allowedOrigins = new Set([
    ...config.WEB_ALLOWED_ORIGINS,
    ...config.ADMIN_ALLOWED_ORIGINS,
    ...config.PREVIEW_ALLOWED_ORIGINS,
  ]);
  const originAllowed = (origin: string | undefined) =>
    origin === undefined
      ? config.NODE_ENV !== "production"
      : allowedOrigins.has(origin);
  const connection =
    options.accounts &&
    options.avatars &&
    options.encounters &&
    options.blocks &&
    options.friends &&
    options.communications &&
    options.moderation
      ? null
      : createDatabase(config.DATABASE_URL);
  const encryptor = createAesGcmFieldEncryptor(
    Buffer.from(config.BIRTH_DATE_ENCRYPTION_KEY, "base64"),
    config.BIRTH_DATE_KEY_ID,
  );
  const accounts =
    options.accounts ??
    new AccountService(connection!.db, encryptor, {
      terms: config.CURRENT_TERMS_VERSION,
      guidelines: config.CURRENT_GUIDELINES_VERSION,
    });
  const avatars =
    options.avatars ??
    new AvatarService(
      connection!.db,
      new SupabaseStorage(
        config.SUPABASE_URL,
        config.SUPABASE_STORAGE_BUCKET,
        config.SUPABASE_SERVICE_ROLE_KEY,
      ),
    );
  const verifier = options.tokenVerifier ?? createSupabaseTokenVerifier(config);
  const realtime = options.realtime ?? new RedisRealtimeStore(config.REDIS_URL);
  const encounters =
    options.encounters ?? new EncounterRepository(connection!.db);
  const blocks = options.blocks ?? new BlockRepository(connection!.db);
  const friends = options.friends ?? new FriendRepository(connection!.db);
  const communications =
    options.communications ?? new CommunicationRepository(connection!.db);
  const moderation =
    options.moderation ?? new ModerationRepository(connection!.db);
  if ("setBlockChecker" in realtime)
    realtime.setBlockChecker((first, second) =>
      blocks.hasEitherDirection(first, second),
    );
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 16_384 });
  const localSockets = new Map<string, WebSocket>();
  let subscriber: Awaited<
    ReturnType<RedisRealtimeStore["subscribeUserEvents"]>
  > | null = null;
  app.addHook("onReady", async () => {
    try {
      await realtime.connect();
      subscriber = await realtime.subscribeUserEvents((userId, message) => {
        for (const [key, socket] of localSockets)
          if (
            key.startsWith(`${userId}:`) &&
            socket.readyState === WebSocket.OPEN
          ) {
            socket.send(message);
            if (message.includes('"type":"capability.revoked"'))
              socket.close(4003, "Capability revoked");
          }
      });
    } catch (cause) {
      app.log.warn(
        { err: cause },
        "realtime dependency unavailable at startup",
      );
    }
  });

  void app.register(swagger, {
    openapi: { info: { title: "Paramingle API", version: "1.0.0" } },
  });
  void app.register(cors, {
    origin(origin, callback) {
      callback(null, originAllowed(origin));
    },
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["authorization", "content-type", "x-device-label"],
    maxAge: 600,
  });
  if (config.OPENAPI_ENABLED && config.NODE_ENV !== "production")
    void app.register(swaggerUi, { routePrefix: "/documentation" });

  app.get("/health/live", {}, () => ({ ok: true }));

  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply
        .code(401)
        .send(error("unauthenticated", "Authentication required", request.id));
    }
    try {
      const identity = await verifier.verify(header.slice(7));
      const user = await accounts.reconcile(
        identity,
        typeof request.headers["x-device-label"] === "string"
          ? request.headers["x-device-label"].slice(0, 120)
          : null,
      );
      request.auth = {
        identity,
        user: {
          id: user.id,
          accountState: user.accountState,
          emailVerified: user.emailVerified,
        },
      };
    } catch {
      return reply
        .code(401)
        .send(
          error(
            "unauthenticated",
            "Invalid or expired access token",
            request.id,
          ),
        );
    }
  };
  const guard =
    (
      capability: Capability,
      feature?:
        "matching" | "messages" | "requests" | "calls" | "profile" | "realtime",
    ) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      await authenticate(request, reply);
      if (reply.sent) return;
      const auth = request.auth!;
      const code = capabilityError(
        auth.user.accountState,
        auth.user.emailVerified,
        capability,
      );
      if (code)
        return reply
          .code(403)
          .send(
            error(code, "This account cannot perform that action", request.id),
          );
      if (feature) {
        const restriction = await moderation.restriction(auth.user.id, feature);
        if (restriction)
          return reply
            .code(403)
            .send(
              error(
                restriction,
                "This account cannot perform that action",
                request.id,
              ),
            );
      }
    };
  const adminGuard =
    (
      minimum: "support" | "moderator" | "admin" | "superadmin",
      highRisk = false,
    ) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      await authenticate(request, reply);
      if (reply.sent) return;
      const origin = request.headers.origin;
      if (origin && !config.ADMIN_ALLOWED_ORIGINS.includes(origin))
        return reply
          .code(403)
          .send(error("forbidden", "Admin origin required", request.id));
      const identity = request.auth!.identity;
      const maxAge = highRisk ? 5 * 60 : 8 * 60 * 60;
      if (
        identity.assuranceLevel !== "aal2" ||
        !identity.authenticatedAt ||
        Date.now() / 1000 - identity.authenticatedAt > maxAge
      )
        return reply
          .code(403)
          .send(
            error(
              "forbidden",
              highRisk
                ? "Recent MFA reauthentication required"
                : "MFA required",
              request.id,
            ),
          );
      try {
        await moderation.requireRole(request.auth!.user.id, minimum);
      } catch {
        return reply
          .code(403)
          .send(error("forbidden", "Admin permission required", request.id));
      }
    };
  const route =
    <T>(
      schema: z.ZodType<T>,
      handler: (request: FastifyRequest, value: T) => Promise<unknown>,
    ) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = schema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send(
          error("bad_request", "Request validation failed", request.id, {
            issues: parsed.error.issues.map((x) => ({
              path: x.path.join("."),
              message: x.message,
            })),
          }),
        );
      try {
        return await handler(request, parsed.data);
      } catch (e) {
        return domainReply(reply, request.id, e);
      }
    };
  app.get(
    "/v1/me",
    { preHandler: guard("inspect_self") },
    async (req, reply) => {
      try {
        return await accounts.me(req.auth!.user.id);
      } catch (e) {
        return domainReply(reply, req.id, e);
      }
    },
  );
  app.get("/v1/me/sessions", { preHandler: guard("inspect_self") }, (req) =>
    accounts.sessions(req.auth!.user.id),
  );
  app.delete(
    "/v1/me/sessions/:id",
    { preHandler: guard("inspect_self") },
    async (req, reply) => {
      try {
        const sessionId = (req.params as { id: string }).id;
        await accounts.revokeSession(req.auth!.user.id, sessionId);
        await realtime.revokeSession(sessionId);
        return reply.code(204).send();
      } catch (e) {
        return domainReply(reply, req.id, e);
      }
    },
  );
  app.post(
    "/v1/realtime/tickets",
    { preHandler: guard("contact", "realtime") },
    async (req, reply) => {
      try {
        const identity = await accounts.realtimeIdentity(
          req.auth!.user.id,
          req.auth!.identity.authSessionId,
        );
        return await realtime.createTicket(identity);
      } catch (cause) {
        return domainReply(reply, req.id, cause);
      }
    },
  );
  app.post(
    "/v1/matches/tickets",
    { preHandler: guard("contact", "matching") },
    route(matchJoinRequestSchema, async (req, input) => {
      const identity = await accounts.realtimeIdentity(
        req.auth!.user.id,
        req.auth!.identity.authSessionId,
      );
      const limit = await realtime.rateLimit(
        `match:user:${identity.userId}`,
        20,
        60,
      );
      if (!limit.allowed)
        throw new DomainError(
          "rate_limited",
          `Retry in ${Math.max(1, Math.ceil(limit.retryAfterMs / 1000))} seconds`,
          429,
        );
      const result = await realtime.joinQueue(identity, input.mode);
      if (result.match) {
        await encounters.start(result.match.id, result.match.mode, [
          result.match.first,
          result.match.second,
        ]);
        await publishMatch(realtime, result.match);
      }
      return {
        state: result.match ? "matched" : "queued",
        mode: input.mode,
        queuedAt: result.queuedAt,
      };
    }),
  );
  app.post(
    "/v1/rtc/credentials",
    { preHandler: guard("contact") },
    async (req, reply) => {
      try {
        const identity = await accounts.realtimeIdentity(
          req.auth!.user.id,
          req.auth!.identity.authSessionId,
        );
        const expires = Math.floor(Date.now() / 1000) + 300;
        const username = `${expires}:${identity.userId}`;
        const credential = createHmac("sha256", config.TURN_CREDENTIAL_SECRET)
          .update(username)
          .digest("base64");
        return {
          iceServers: [
            {
              urls: config.TURN_URLS.split(",").map((x) => x.trim()),
              username,
              credential,
            },
          ],
          expiresAt: new Date(expires * 1000).toISOString(),
        };
      } catch (cause) {
        return domainReply(reply, req.id, cause);
      }
    },
  );
  app.post(
    "/v1/me/onboarding",
    { preHandler: guard("profile_setup") },
    route(onboardingRequestSchema, (req, input) =>
      accounts.onboarding(req.auth!.user.id, input),
    ),
  );
  app.patch(
    "/v1/profiles/me",
    { preHandler: guard("profile_setup") },
    route(profilePatchRequestSchema, (req, input) =>
      accounts.patchProfile(req.auth!.user.id, input),
    ),
  );
  app.patch(
    "/v1/profiles/me/visibility",
    { preHandler: guard("profile_setup") },
    route(visibilityPatchRequestSchema, (req, input) =>
      accounts.patchVisibility(req.auth!.user.id, input.fields),
    ),
  );
  app.get(
    "/v1/profiles/:username",
    { preHandler: guard("contact") },
    async (req, reply) => {
      try {
        if (
          await blocks.blocksUsername(
            req.auth!.user.id,
            (req.params as { username: string }).username,
          )
        )
          throw new DomainError("not_found", "Profile unavailable", 404);
        return await accounts.profile(
          req.auth!.user.id,
          (req.params as { username: string }).username,
        );
      } catch (e) {
        return domainReply(reply, req.id, e);
      }
    },
  );
  app.get(
    "/v1/encounters",
    { preHandler: guard("contact") },
    async (req, reply) => {
      try {
        const query = req.query as {
          cursor?: string;
          limit?: string;
          window?: string;
        };
        if (query.window !== undefined && query.window !== "48h")
          throw new DomainError(
            "bad_request",
            "Only the 48 hour window is available",
          );
        const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));
        if (!Number.isInteger(limit))
          throw new DomainError("bad_request", "Invalid limit");
        return await encounters.list(req.auth!.user.id, query.cursor, limit);
      } catch (cause) {
        return domainReply(reply, req.id, cause);
      }
    },
  );
  app.delete(
    "/v1/encounters/:id/view",
    { preHandler: guard("contact") },
    async (req, reply) => {
      try {
        const hidden = await encounters.hide(
          req.auth!.user.id,
          (req.params as { id: string }).id,
        );
        if (!hidden)
          throw new DomainError("not_found", "Encounter unavailable", 404);
        return reply.code(204).send();
      } catch (cause) {
        return domainReply(reply, req.id, cause);
      }
    },
  );
  app.post(
    "/v1/blocks",
    { preHandler: guard("contact") },
    route(blockCreateRequestSchema, async (req, input) => {
      if (input.userId === req.auth!.user.id)
        throw new DomainError("bad_request", "Cannot block this account");
      const created = await blocks.create(
        req.auth!.user.id,
        input.userId,
        input.reasonCategory,
      );
      const activeMatch = await realtime.activeMatchBetween(
        req.auth!.user.id,
        input.userId,
      );
      await realtime.blockPair(req.auth!.user.id, input.userId);
      if (activeMatch) {
        await encounters.end(activeMatch.id, "blocked", req.auth!.user.id);
        const requestId = randomUUID();
        for (const userId of [req.auth!.user.id, input.userId])
          await realtime.publishUser(
            userId,
            JSON.stringify({
              version: PROTOCOL_VERSION,
              type: "match.ended",
              requestId,
              payload: { matchId: activeMatch.id, reason: "blocked" },
            }),
          );
      }
      return { id: created.id, createdAt: created.createdAt.toISOString() };
    }),
  );
  app.delete(
    "/v1/blocks/:userId",
    { preHandler: guard("contact") },
    async (req, reply) => {
      await blocks.remove(
        req.auth!.user.id,
        (req.params as { userId: string }).userId,
      );
      return reply.code(204).send();
    },
  );
  app.post(
    "/v1/friend-requests",
    { preHandler: guard("contact") },
    route(friendRequestCreateSchema, async (req, input) => {
      try {
        return await friends.createRequest(
          req.auth!.user.id,
          input.userId,
          input.encounterId,
        );
      } catch (cause) {
        throw socialError(cause);
      }
    }),
  );
  app.get(
    "/v1/friend-requests",
    { preHandler: guard("contact") },
    async (req) => ({
      items: await friends.requests(req.auth!.user.id),
    }),
  );
  app.post(
    "/v1/friend-requests/:id/actions",
    { preHandler: guard("contact") },
    route(friendRequestActionSchema, async (req, input) => {
      try {
        return await friends.resolve(
          req.auth!.user.id,
          (req.params as { id: string }).id,
          input.action,
        );
      } catch (cause) {
        throw socialError(cause);
      }
    }),
  );
  app.get("/v1/friends", { preHandler: guard("contact") }, async (req) => {
    const query = req.query as { cursor?: string; limit?: string };
    const result = await friends.list(
      req.auth!.user.id,
      query.cursor,
      Math.min(50, Math.max(1, Number(query.limit ?? 20))),
    );
    return {
      items: await Promise.all(
        result.items.map(async (item) => ({
          id: item.id,
          user: {
            id: item.user_id,
            username: item.username,
            displayName: item.display_name,
          },
          presence:
            item.show_presence && (await realtime.isUserOnline(item.user_id))
              ? "online"
              : "hidden",
        })),
      ),
      nextCursor: result.nextCursor,
    };
  });
  app.delete(
    "/v1/friends/:id",
    { preHandler: guard("contact") },
    async (req, reply) => {
      if (
        !(await friends.unfriend(
          req.auth!.user.id,
          (req.params as { id: string }).id,
        ))
      )
        return reply
          .code(404)
          .send(error("not_found", "Friend unavailable", req.id));
      return reply.code(204).send();
    },
  );
  app.put(
    "/v1/mutes/:userId",
    { preHandler: guard("contact") },
    route(muteRequestSchema, async (req, input) => {
      await friends.mute(
        req.auth!.user.id,
        (req.params as { userId: string }).userId,
        input.scope,
        input.expiresAt ? new Date(input.expiresAt) : undefined,
      );
      return { muted: true };
    }),
  );
  app.delete(
    "/v1/mutes/:userId",
    { preHandler: guard("contact") },
    async (req, reply) => {
      const query = req.query as { scope?: "all" | "messages" | "calls" };
      await friends.unmute(
        req.auth!.user.id,
        (req.params as { userId: string }).userId,
        query.scope ?? "all",
      );
      return reply.code(204).send();
    },
  );
  app.get("/v1/counts", { preHandler: guard("contact") }, (req) =>
    Promise.all([
      friends.counts(req.auth!.user.id),
      communications.unreadCount(req.auth!.user.id),
    ]).then(([counts, unreadMessages]) => ({ ...counts, unreadMessages })),
  );
  app.get("/v1/threads", { preHandler: guard("contact") }, async (req) => {
    const query = req.query as { cursor?: string; limit?: string };
    return communications.listThreads(
      req.auth!.user.id,
      query.cursor,
      Math.min(50, Math.max(1, Number(query.limit ?? 20))),
    );
  });
  app.get(
    "/v1/threads/:id/messages",
    { preHandler: guard("contact") },
    async (req, reply) => {
      try {
        const query = req.query as { cursor?: string; limit?: string };
        const cursor =
          query.cursor === undefined ? undefined : Number(query.cursor);
        if (
          cursor !== undefined &&
          (!Number.isSafeInteger(cursor) || cursor < 1)
        )
          throw new DomainError("bad_request", "Invalid message cursor");
        return await communications.messages(
          req.auth!.user.id,
          (req.params as { id: string }).id,
          cursor,
          Math.min(100, Math.max(1, Number(query.limit ?? 50))),
        );
      } catch (cause) {
        return domainReply(reply, req.id, socialError(cause));
      }
    },
  );
  app.post(
    "/v1/threads/:id/messages",
    { preHandler: guard("contact", "messages") },
    route(directMessageSendSchema, async (req, input) => {
      const limit = await realtime.rateLimit(
        `direct-message:user:${req.auth!.user.id}`,
        60,
        60,
      );
      if (!limit.allowed)
        throw new DomainError(
          "rate_limited",
          "Message rate limit reached",
          429,
        );
      try {
        const message = await communications.send(
          req.auth!.user.id,
          (req.params as { id: string }).id,
          input.clientMessageId,
          input.body,
        );
        const payload = {
          threadId: message.threadId,
          message: {
            id: message.id,
            senderId: message.senderId,
            clientMessageId: message.clientMessageId,
            sequence: message.serverSequence,
            body: message.body!,
            sentAt: message.sentAt.toISOString(),
          },
        };
        const event = JSON.stringify({
          version: PROTOCOL_VERSION,
          type: "message.created",
          requestId: req.id,
          payload,
        });
        await Promise.all(
          [req.auth!.user.id, message.recipientId].map((id) =>
            realtime.publishUser(id, event),
          ),
        );
        return payload.message;
      } catch (cause) {
        throw socialError(cause);
      }
    }),
  );
  app.put(
    "/v1/threads/:id/read",
    { preHandler: guard("contact") },
    route(readCursorSchema, async (req, input) => ({
      sequence: await communications.markRead(
        req.auth!.user.id,
        (req.params as { id: string }).id,
        input.sequence,
      ),
    })),
  );
  app.delete(
    "/v1/messages/:id",
    { preHandler: guard("contact") },
    route(messageDeleteSchema, async (req, input) => {
      try {
        return await communications.deleteMessage(
          req.auth!.user.id,
          (req.params as { id: string }).id,
          input.scope === "everyone",
          config.MESSAGE_DELETE_FOR_EVERYONE_SECONDS * 1_000,
        );
      } catch (cause) {
        throw socialError(cause);
      }
    }),
  );
  app.post(
    "/v1/calls/direct",
    { preHandler: guard("contact", "calls") },
    route(directCallCreateSchema, async (req, input) => {
      if (!(await realtime.isUserOnline(input.friendId)))
        throw new DomainError(
          "conflict",
          "Friend is not available for an in-session call",
          409,
        );
      const call = await communications.createCall(
        req.auth!.user.id,
        input.friendId,
        input.mode,
      );
      const lease = await realtime.acquireDirectCall(
        call.id,
        call.callerId,
        call.recipientId,
        config.DIRECT_CALL_RING_SECONDS,
      );
      if (!lease) {
        await communications.callAction(req.auth!.user.id, call.id, "cancel");
        throw new DomainError("conflict", "Friend is busy", 409);
      }
      const payload = {
        callId: call.id,
        callerId: call.callerId,
        mode: call.mode,
        expiresAt: lease.expiresAt,
      };
      await realtime.publishUser(
        call.recipientId,
        JSON.stringify({
          version: PROTOCOL_VERSION,
          type: "call.invite",
          requestId: req.id,
          payload,
        }),
      );
      const missedTimer = setTimeout(() => {
        void communications.expireCall(call.id).then(async (expired) => {
          if (!expired) return;
          await realtime.releaseDirectCall(call.id);
          const event = JSON.stringify({
            version: PROTOCOL_VERSION,
            type: "call.missed",
            requestId: randomUUID(),
            payload: { callId: call.id },
          });
          await Promise.all(
            [call.callerId, call.recipientId].map((id) =>
              realtime.publishUser(id, event),
            ),
          );
        });
      }, config.DIRECT_CALL_RING_SECONDS * 1_000);
      missedTimer.unref();
      return payload;
    }),
  );
  app.post(
    "/v1/calls/direct/:id/actions",
    { preHandler: guard("contact", "calls") },
    route(directCallActionSchema, async (req, input) => {
      try {
        const id = (req.params as { id: string }).id;
        const lease = await realtime.getDirectCall(id);
        if (
          !lease ||
          ![lease.callerId, lease.recipientId].includes(req.auth!.user.id)
        )
          throw new Error("call_stale");
        const result = await communications.callAction(
          req.auth!.user.id,
          id,
          input.action,
        );
        if (input.action === "accept")
          await realtime.renewDirectCall(id, req.auth!.user.id, 45);
        else await realtime.releaseDirectCall(id);
        const type =
          input.action === "accept"
            ? "call.connecting"
            : input.action === "reject"
              ? "call.declined"
              : input.action === "cancel"
                ? "call.cancelled"
                : "call.ended";
        await Promise.all(
          [req.auth!.user.id, result.peerId].map((userId) =>
            realtime.publishUser(
              userId,
              JSON.stringify({
                version: PROTOCOL_VERSION,
                type,
                requestId: req.id,
                payload: { callId: id },
              }),
            ),
          ),
        );
        return result;
      } catch (cause) {
        throw socialError(cause);
      }
    }),
  );
  app.post(
    "/v1/reports",
    { preHandler: authenticate },
    route(reportCreateSchema, async (req, input) => {
      const report = await moderation.createReport(req.auth!.user.id, input);
      if (input.leaveAfterSubmit) {
        if (input.encounterId)
          await realtime.closeMatch(input.encounterId, req.auth!.user.id);
        if (input.callId) await realtime.releaseDirectCall(input.callId);
      }
      return {
        id: report.id,
        state: report.state,
        createdAt: report.createdAt,
      };
    }),
  );
  app.get("/v1/reports/me", { preHandler: authenticate }, (req) =>
    moderation.myReports(req.auth!.user.id),
  );
  app.get("/v1/sanctions/me", { preHandler: authenticate }, (req) =>
    moderation.mySanctions(req.auth!.user.id),
  );
  app.post(
    "/v1/appeals",
    { preHandler: authenticate },
    route(appealCreateSchema, (req, input) =>
      moderation.submitAppeal(
        req.auth!.user.id,
        input.sanctionId,
        input.statement,
      ),
    ),
  );

  app.get(
    "/v1/admin/cases",
    { preHandler: adminGuard("support") },
    async (req) => {
      const query = req.query as {
        state?: "open" | "reviewing" | "resolved";
        priority?: "standard" | "high" | "urgent";
        purpose?: string;
      };
      if (!query.purpose || query.purpose.trim().length < 8)
        throw new DomainError("bad_request", "A case purpose is required");
      return moderation.queue(req.auth!.user.id, query.purpose, {
        state: query.state,
        priority: query.priority,
      });
    },
  );
  app.get(
    "/v1/admin/cases/:id",
    { preHandler: adminGuard("support") },
    async (req) => {
      const query = req.query as { purpose?: string; revealEvidence?: string };
      if (!query.purpose || query.purpose.trim().length < 8)
        throw new DomainError("bad_request", "A case purpose is required");
      return moderation.caseDetail(
        req.auth!.user.id,
        (req.params as { id: string }).id,
        query.purpose,
        query.revealEvidence === "true",
      );
    },
  );
  app.post(
    "/v1/admin/cases/:id/assign",
    { preHandler: adminGuard("moderator") },
    route(caseAssignSchema, (req, input) =>
      moderation.assign(
        req.auth!.user.id,
        (req.params as { id: string }).id,
        input.assigneeId,
        input.purpose,
      ),
    ),
  );
  app.post(
    "/v1/admin/cases/:id/sanctions",
    { preHandler: adminGuard("moderator", true) },
    route(sanctionCreateSchema, async (req, input) => {
      const row = await moderation.applySanction(
        req.auth!.user.id,
        (req.params as { id: string }).id,
        { ...input, endsAt: input.endsAt ? new Date(input.endsAt) : undefined },
        input.purpose,
      );
      if (
        [
          "matching_restriction",
          "contact_restriction",
          "temporary_suspension",
          "full_ban",
          "verification_challenge",
        ].includes(row.type)
      )
        await realtime.revokeUser(row.subjectId);
      return row;
    }),
  );
  app.post(
    "/v1/admin/sanctions/:id/reverse",
    { preHandler: adminGuard("admin", true) },
    route(sanctionReverseSchema, async (req, input) => {
      const row = await moderation.reverseSanction(
        req.auth!.user.id,
        (req.params as { id: string }).id,
        input.reason,
        input.purpose,
      );
      await realtime.restoreUser(row.subjectId);
      return row;
    }),
  );
  app.get(
    "/v1/admin/appeals",
    { preHandler: adminGuard("moderator") },
    async (req) => {
      const purpose = (req.query as { purpose?: string }).purpose;
      if (!purpose || purpose.length < 8)
        throw new DomainError("bad_request", "A review purpose is required");
      return moderation.appealsQueue(req.auth!.user.id, purpose);
    },
  );
  app.post(
    "/v1/admin/appeals/:id/review",
    { preHandler: adminGuard("moderator", true) },
    route(appealReviewSchema, (req, input) =>
      moderation.reviewAppeal(
        req.auth!.user.id,
        (req.params as { id: string }).id,
        input.decision,
        input.reason,
        input.purpose,
      ),
    ),
  );
  app.get(
    "/v1/profiles/:username/avatar",
    { preHandler: guard("contact") },
    async (req, reply) => {
      try {
        if (
          await blocks.blocksUsername(
            req.auth!.user.id,
            (req.params as { username: string }).username,
          )
        )
          throw new DomainError("not_found", "Avatar unavailable", 404);
        const ownerId = await accounts.avatarOwner(
          req.auth!.user.id,
          (req.params as { username: string }).username,
        );
        return reply.redirect(await avatars.signedAvatar(ownerId));
      } catch (cause) {
        return domainReply(reply, req.id, cause);
      }
    },
  );
  app.post(
    "/v1/me/avatar-uploads",
    { preHandler: guard("profile_setup") },
    route(avatarUploadInitRequestSchema, (req, input) =>
      avatars.init(req.auth!.user.id, input.contentType, input.byteSize),
    ),
  );
  app.addContentTypeParser(
    ["image/jpeg", "image/png", "image/webp"],
    { parseAs: "buffer", bodyLimit: 5 * 1024 * 1024 },
    (_req, body, done) => done(null, body),
  );
  app.put(
    "/v1/me/avatar-uploads/:id/content",
    { preHandler: guard("profile_setup") },
    async (req, reply) => {
      try {
        const body = req.body;
        if (!Buffer.isBuffer(body))
          throw new DomainError("bad_request", "Raster image body required");
        await avatars.upload(
          req.auth!.user.id,
          (req.params as { id: string }).id,
          body,
          req.headers["content-type"] ?? "",
        );
        return reply.code(204).send();
      } catch (e) {
        return domainReply(reply, req.id, e);
      }
    },
  );
  app.post(
    "/v1/me/avatar-uploads/finalize",
    { preHandler: guard("profile_setup") },
    route(avatarUploadFinalizeRequestSchema, (req, input) =>
      avatars.finalize(req.auth!.user.id, input.uploadId),
    ),
  );
  app.get(
    "/health/ready",
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
          dependencies: { postgres: "up" as const, redis: "up" as const },
        };
      } catch {
        return reply
          .code(503)
          .send({ ok: false, dependencies: { postgres: "up", redis: "down" } });
      }
    },
  );

  sockets.on(
    "connection",
    (
      socket: WebSocket,
      _request: IncomingMessage,
      identity: RealtimeIdentity,
    ) => {
      const connectionId = randomUUID();
      localSockets.set(`${identity.userId}:${connectionId}`, socket);
      void realtime.bindConnection(identity, connectionId);
      void publishPresence(friends, realtime, identity.userId, true);
      let malformed = 0;
      let alive = true;
      const heartbeat = setInterval(() => {
        void realtime
          .isSessionRevoked(identity.sessionId)
          .then(async (revoked) => {
            revoked ||= await realtime.isUserRevoked(identity.userId);
            revoked ||= Boolean(
              await moderation.restriction(identity.userId, "realtime"),
            );
            if (!alive || revoked) {
              socket.close(4001, "Session unavailable");
              return;
            }
            alive = false;
            socket.ping();
            void realtime.renewConnection(identity, connectionId);
          })
          .catch(() => socket.close(1013, "Realtime dependency unavailable"));
      }, 15_000);
      socket.on("pong", () => {
        alive = true;
      });
      socket.send(
        JSON.stringify(
          serverRealtimeEnvelopeSchema.parse({
            version: PROTOCOL_VERSION,
            type: "connection.ready",
            requestId: randomUUID(),
            payload: { protocolVersion: PROTOCOL_VERSION, connectionId },
          }),
        ),
      );
      socket.on("message", (message: RawData, isBinary: boolean) => {
        if (isBinary) {
          socket.close(1003, "Text messages only");
          return;
        }
        const text = Array.isArray(message)
          ? Buffer.concat(message).toString("utf8")
          : message instanceof ArrayBuffer
            ? Buffer.from(message).toString("utf8")
            : message.toString("utf8");
        const parsed = parseClientRealtimeMessage(text);
        if (!parsed.success) {
          malformed++;
          if (parsed.error === "payload_too_large" || malformed >= 3)
            socket.close(
              parsed.error === "payload_too_large" ? 1009 : 1008,
              parsed.error,
            );
          return;
        }
        const event = parsed.data;
        void handleRealtime(
          event,
          identity,
          realtime,
          encounters,
          blocks,
          communications,
          moderation,
        )
          .then(async (messages) => {
            for (const item of messages)
              await realtime.publishUser(
                item.userId,
                JSON.stringify(serverRealtimeEnvelopeSchema.parse(item.event)),
              );
          })
          .catch(() =>
            socket.send(
              JSON.stringify({
                version: PROTOCOL_VERSION,
                type: "error",
                requestId: event.requestId,
                payload: { code: "bad_request", message: "Command rejected" },
              }),
            ),
          );
        if (event.type === "connection.ping")
          socket.send(
            JSON.stringify(
              serverRealtimeEnvelopeSchema.parse({
                version: PROTOCOL_VERSION,
                type: "connection.pong",
                requestId: event.requestId,
                payload: event.payload,
              }),
            ),
          );
      });
      socket.on("close", () => {
        clearInterval(heartbeat);
        localSockets.delete(`${identity.userId}:${connectionId}`);
        void realtime.unbindConnection(identity, connectionId);
        void publishPresence(friends, realtime, identity.userId, false);
      });
    },
  );

  app.server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    if (!originAllowed(request.headers.origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    const ticket = url.searchParams.get("ticket");
    if (!ticket) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    void realtime
      .consumeTicket(ticket)
      .then(async (identity) => {
        if (
          !identity ||
          (await realtime.isSessionRevoked(identity.sessionId)) ||
          (await realtime.isUserRevoked(identity.userId))
        ) {
          socket.write(
            "HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n",
          );
          socket.destroy();
          return;
        }
        sockets.handleUpgrade(request, socket, head, (webSocket) =>
          sockets.emit("connection", webSocket, request, identity),
        );
      })
      .catch(() => socket.destroy());
  });
  app.addHook("onClose", () => {
    for (const socket of sockets.clients) {
      if (socket.readyState === WebSocket.OPEN)
        socket.close(1001, "Server shutting down");
      else socket.terminate();
    }
  });
  app.addHook("onClose", async () => {
    if (subscriber?.isOpen) await subscriber.quit();
    await realtime.close();
  });
  if (connection) app.addHook("onClose", () => connection.pool.end());
  return app;
}

type Outbound = {
  userId: string;
  event: z.infer<typeof serverRealtimeEnvelopeSchema>;
};
async function publishMatch(
  realtime: RedisRealtimeStore,
  match: Awaited<ReturnType<RedisRealtimeStore["getMatch"]>> & {},
) {
  const requestId = randomUUID();
  for (const userId of [match.first, match.second])
    await realtime.publishUser(
      userId,
      JSON.stringify({
        version: PROTOCOL_VERSION,
        type: "match.found",
        requestId,
        payload: {
          matchId: match.id,
          mode: match.mode,
          peerId: userId === match.first ? match.second : match.first,
          initiator: userId === match.first,
          expiresAt: match.expiresAt,
        },
      }),
    );
}
async function handleRealtime(
  event: ClientRealtimeEnvelope,
  identity: RealtimeIdentity,
  realtime: RedisRealtimeStore,
  encounters: EncounterRepository,
  blocks: BlockRepository,
  communications: CommunicationRepository,
  moderation: ModerationRepository,
): Promise<Outbound[]> {
  if (event.type === "connection.ping") return [];
  if (event.type === "match.join") {
    if (await moderation.restriction(identity.userId, "matching"))
      throw new Error("capability_revoked");
    const result = await realtime.joinQueue(identity, event.payload.mode);
    if (result.match) {
      await encounters.start(result.match.id, result.match.mode, [
        result.match.first,
        result.match.second,
      ]);
      await publishMatch(realtime, result.match);
    }
    return result.match
      ? []
      : [
          {
            userId: identity.userId,
            event: {
              version: PROTOCOL_VERSION,
              type: "match.queued",
              requestId: event.requestId,
              payload: { mode: event.payload.mode, queuedAt: result.queuedAt },
            },
          },
        ];
  }
  if (
    event.type === "call.accept" ||
    event.type === "call.reject" ||
    event.type === "call.cancel" ||
    event.type === "call.end" ||
    event.type === "call.rtc.offer" ||
    event.type === "call.rtc.answer" ||
    event.type === "call.rtc.ice"
  ) {
    if (await moderation.restriction(identity.userId, "calls"))
      throw new Error("capability_revoked");
    const callId = event.payload.callId;
    const lease = await realtime.getDirectCall(callId);
    if (
      !lease ||
      ![lease.callerId, lease.recipientId].includes(identity.userId)
    )
      throw new Error("call_stale");
    const peerId =
      lease.callerId === identity.userId ? lease.recipientId : lease.callerId;
    if (
      event.type === "call.accept" ||
      event.type === "call.reject" ||
      event.type === "call.cancel" ||
      event.type === "call.end"
    ) {
      const action = event.type.slice(5) as
        "accept" | "reject" | "cancel" | "end";
      await communications.callAction(identity.userId, callId, action);
      if (action === "accept")
        await realtime.renewDirectCall(callId, identity.userId, 45);
      else await realtime.releaseDirectCall(callId);
      const type =
        action === "accept"
          ? "call.connecting"
          : action === "reject"
            ? "call.declined"
            : action === "cancel"
              ? "call.cancelled"
              : "call.ended";
      return [identity.userId, peerId].map((userId) => ({
        userId,
        event: {
          version: PROTOCOL_VERSION,
          type,
          requestId: event.requestId,
          payload: { callId },
        },
      }));
    }
    await communications.authorizeCall(identity.userId, callId);
    await realtime.renewDirectCall(callId, identity.userId, 45);
    return [{ userId: peerId, event }];
  }
  const match = await realtime.getMatch(event.payload.matchId);
  if (
    !match ||
    (match.first !== identity.userId && match.second !== identity.userId)
  )
    throw new Error("match_stale");
  const peerId = match.first === identity.userId ? match.second : match.first;
  if (await blocks.hasEitherDirection(identity.userId, peerId))
    throw new Error("relationship_unavailable");
  if (event.type === "match.ack") {
    const connected = await realtime.acknowledge(match.id, identity.userId);
    if (connected) await encounters.connected(match.id);
    return connected
      ? [match.first, match.second].map((userId) => ({
          userId,
          event: {
            version: PROTOCOL_VERSION,
            type: "match.connected" as const,
            requestId: event.requestId,
            payload: { matchId: match.id },
          },
        }))
      : [];
  }
  if (event.type === "match.leave" || event.type === "match.next") {
    await realtime.closeMatch(match.id, identity.userId);
    await encounters.end(
      match.id,
      event.type === "match.next" ? "next" : "left",
      identity.userId,
    );
    const ended: Outbound[] = [match.first, match.second].map((userId) => ({
      userId,
      event: {
        version: PROTOCOL_VERSION,
        type: "match.ended" as const,
        requestId: event.requestId,
        payload: {
          matchId: match.id,
          reason:
            userId === identity.userId
              ? event.type === "match.next"
                ? ("next" as const)
                : ("left" as const)
              : ("peer_left" as const),
        },
      },
    }));
    if (event.type === "match.next") {
      const result = await realtime.joinQueue(identity, match.mode);
      if (result.match) await publishMatch(realtime, result.match);
      else
        ended.push({
          userId: identity.userId,
          event: {
            version: PROTOCOL_VERSION,
            type: "match.queued",
            requestId: event.requestId,
            payload: { mode: match.mode, queuedAt: result.queuedAt },
          },
        });
    }
    return ended;
  }
  if (event.type === "chat.send") {
    if (await moderation.restriction(identity.userId, "matching"))
      throw new Error("capability_revoked");
    const sequence = await realtime.nextSequence(match.id);
    const sentAt = new Date().toISOString();
    const saved = await encounters.addRandomMessage(
      match.id,
      identity.userId,
      event.payload.clientMessageId,
      sequence,
      event.payload.text,
      new Date(sentAt),
    );
    return [
      {
        userId: peerId,
        event: {
          version: PROTOCOL_VERSION,
          type: "chat.message",
          requestId: event.requestId,
          payload: {
            ...event.payload,
            text: saved.body!,
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
          type: "chat.ack",
          requestId: event.requestId,
          payload: {
            matchId: match.id,
            clientMessageId: event.payload.clientMessageId,
            sequence,
          },
        },
      },
    ];
  }
  return [{ userId: peerId, event }];
}

function error(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
) {
  return {
    error: { code, message, requestId, ...(details ? { details } : {}) },
  };
}
function domainReply(reply: FastifyReply, requestId: string, cause: unknown) {
  if (cause instanceof DomainError)
    return reply
      .code(cause.status)
      .send(error(cause.code, cause.message, requestId));
  reply.log.error({ err: cause }, "request failed");
  return reply
    .code(500)
    .send(error("internal_error", "Request failed", requestId));
}
function socialError(cause: unknown) {
  const code = cause instanceof Error ? cause.message : "request_unavailable";
  if (
    ["self_request", "encounter_unavailable", "requests_disabled"].includes(
      code,
    )
  )
    return new DomainError("bad_request", "Request is not available", 400);
  if (code === "request_expired")
    return new DomainError("conflict", "Request expired", 409);
  return new DomainError("not_found", "Relationship unavailable", 404);
}
async function publishPresence(
  friends: FriendRepository,
  realtime: RedisRealtimeStore,
  userId: string,
  online: boolean,
) {
  const requestId = randomUUID();
  for (const viewerId of await friends.presenceViewers(userId))
    await realtime.publishUser(
      viewerId,
      JSON.stringify({
        version: PROTOCOL_VERSION,
        type: "presence.changed",
        requestId,
        payload: { userId, online },
      }),
    );
}
