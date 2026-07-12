import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AgeCohort, MatchMode } from "@paramingle/contracts";
import { createClient, type RedisClientType } from "redis";

export interface RealtimeIdentity {
  userId: string;
  sessionId: string;
  cohort: AgeCohort;
}
export interface TicketRecord extends RealtimeIdentity {
  expiresAt: string;
}
export interface MatchRecord {
  id: string;
  mode: MatchMode;
  first: string;
  second: string;
  expiresAt: string;
}
export interface DirectCallLease {
  callId: string;
  callerId: string;
  recipientId: string;
  expiresAt: string;
}

export class RedisRealtimeStore {
  readonly client: RedisClientType;
  private readonly prefix: string;
  private blockChecker:
    ((first: string, second: string) => Promise<boolean>) | undefined;
  constructor(url: string, namespace = "paramingle") {
    this.client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) =>
          retries > 3 ? false : Math.min(100 * 2 ** retries, 1_000),
      },
    });
    this.client.on("error", () => undefined);
    this.prefix = namespace;
  }
  setBlockChecker(
    checker: (first: string, second: string) => Promise<boolean>,
  ) {
    this.blockChecker = checker;
  }
  private key(...parts: string[]) {
    return [this.prefix, ...parts].join(":");
  }
  async connect() {
    if (!this.client.isOpen) await this.client.connect();
  }
  async close() {
    if (this.client.isOpen) await this.client.quit();
  }
  async health() {
    return (await this.client.ping()) === "PONG";
  }
  async createTicket(identity: RealtimeIdentity, ttlSeconds = 30) {
    const ticket = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await this.client.set(
      this.key("ticket", hash(ticket)),
      JSON.stringify({ ...identity, expiresAt }),
      { EX: ttlSeconds, NX: true },
    );
    return { ticket, expiresAt };
  }
  async consumeTicket(ticket: string): Promise<TicketRecord | null> {
    if (ticket.length < 32 || ticket.length > 256) return null;
    const value = await this.client.sendCommand([
      "GETDEL",
      this.key("ticket", hash(ticket)),
    ]);
    if (typeof value !== "string") return null;
    return JSON.parse(value) as TicketRecord;
  }
  async bindConnection(
    identity: RealtimeIdentity,
    connectionId: string,
    ttlSeconds = 45,
  ) {
    await this.client.set(
      this.key("connection", connectionId),
      JSON.stringify(identity),
      {
        EX: ttlSeconds,
      },
    );
    await this.client.sAdd(
      this.key("user-connections", identity.userId),
      connectionId,
    );
    await this.client.expire(
      this.key("user-connections", identity.userId),
      ttlSeconds,
    );
  }
  async renewConnection(
    identity: RealtimeIdentity,
    connectionId: string,
    ttlSeconds = 45,
  ) {
    await this.bindConnection(identity, connectionId, ttlSeconds);
  }
  async unbindConnection(identity: RealtimeIdentity, connectionId: string) {
    await Promise.all([
      this.client.del(this.key("connection", connectionId)),
      this.client.sRem(
        this.key("user-connections", identity.userId),
        connectionId,
      ),
    ]);
  }
  async isUserOnline(userId: string) {
    return (await this.client.sCard(this.key("user-connections", userId))) > 0;
  }
  async isSessionRevoked(sessionId: string) {
    return (
      (await this.client.exists(this.key("revoked-session", sessionId))) === 1
    );
  }
  async revokeSession(sessionId: string) {
    await this.client.set(this.key("revoked-session", sessionId), "1", {
      EX: 86_400,
    });
    await this.client.publish(this.key("session-revoked"), sessionId);
  }
  async isUserRevoked(userId: string) {
    return (await this.client.exists(this.key("revoked-user", userId))) === 1;
  }
  async revokeUser(userId: string) {
    await this.client.set(this.key("revoked-user", userId), "1", { EX: 60 });
    for (const partition of [
      "minor_16_17:text",
      "minor_16_17:video",
      "adult_18_plus:text",
      "adult_18_plus:video",
    ])
      await this.client.zRem(this.key("queue", partition), userId);
    const active = await this.client.get(this.key("active", userId));
    if (active && active !== "queued") {
      const direct = active.startsWith("{")
        ? (JSON.parse(active) as DirectCallLease)
        : null;
      if (direct?.callId) await this.releaseDirectCall(direct.callId);
      else await this.closeMatch(active, userId, 86_400);
    }
    await this.client.del([
      this.key("active", userId),
      this.key("queue-entry", userId),
    ]);
    await this.publishUser(
      userId,
      JSON.stringify({
        version: 1,
        type: "capability.revoked",
        requestId: randomUUID(),
        payload: { reason: "moderation" },
      }),
    );
  }
  async restoreUser(userId: string) {
    await this.client.del(this.key("revoked-user", userId));
  }
  async rateLimit(scope: string, limit: number, windowSeconds: number) {
    const key = this.key("limit", scope);
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, windowSeconds);
    return {
      allowed: count <= limit,
      retryAfterMs: await this.client.pTTL(key),
    };
  }
  async joinQueue(
    identity: RealtimeIdentity,
    mode: MatchMode,
  ): Promise<{ queuedAt: string; match: MatchRecord | null }> {
    const queuedAt = new Date().toISOString();
    const partition = `${identity.cohort}:${mode}`;
    const activeKey = this.key("active", identity.userId);
    const queueKey = this.key("queue", partition);
    const entryKey = this.key("queue-entry", identity.userId);
    const matchId = randomUUID();
    const expiresAt = new Date(Date.now() + 20_000).toISOString();
    if (this.blockChecker) {
      const candidates = await this.client.zRange(queueKey, 0, 24);
      for (const candidate of candidates)
        if (await this.blockChecker(identity.userId, candidate))
          await this.client.set(
            this.key("deny", identity.userId, candidate),
            "1",
            { EX: 120 },
          );
    }
    const result = (await this.client.eval(
      `if redis.call('EXISTS', KEYS[1]) == 1 then return {'busy'} end
       local candidates=redis.call('ZRANGE',KEYS[2],0,24)
       local peer=nil
       for _,id in ipairs(candidates) do
         if id ~= ARGV[1] and redis.call('GET',ARGV[7]..id)=='queued' and redis.call('EXISTS',ARGV[8]..ARGV[1]..':'..id)==0 and redis.call('EXISTS',ARGV[8]..id..':'..ARGV[1])==0 then peer=id break end
       end
       if peer then
         redis.call('ZREM',KEYS[2],peer)
         redis.call('DEL',ARGV[6]..peer)
         redis.call('SET',KEYS[1],ARGV[4],'PX',ARGV[5])
         redis.call('SET',ARGV[7]..peer,ARGV[4],'PX',ARGV[5])
         redis.call('SET',ARGV[9]..ARGV[4],cjson.encode({id=ARGV[4],mode=ARGV[3],first=peer,second=ARGV[1],expiresAt=ARGV[10]}),'PX',ARGV[5])
         return {'matched',peer}
       end
       redis.call('ZADD',KEYS[2],ARGV[2],ARGV[1])
       redis.call('SET',KEYS[3],ARGV[3],'PX',120000)
       redis.call('SET',KEYS[1],'queued','PX',120000)
       return {'queued'}`,
      {
        keys: [activeKey, queueKey, entryKey],
        arguments: [
          identity.userId,
          String(Date.now()),
          mode,
          matchId,
          "20000",
          this.key("queue-entry") + ":",
          this.key("active") + ":",
          this.key("deny") + ":",
          this.key("match") + ":",
          expiresAt,
        ],
      },
    )) as string[];
    if (result[0] === "busy") throw new Error("already_queued");
    return {
      queuedAt,
      match:
        result[0] === "matched" && result[1]
          ? {
              id: matchId,
              mode,
              first: result[1],
              second: identity.userId,
              expiresAt,
            }
          : null,
    };
  }
  async getMatch(matchId: string): Promise<MatchRecord | null> {
    const value = await this.client.get(this.key("match", matchId));
    return value ? (JSON.parse(value) as MatchRecord) : null;
  }
  async acknowledge(matchId: string, userId: string) {
    const match = await this.getMatch(matchId);
    if (!match || (match.first !== userId && match.second !== userId))
      return false;
    await this.client.sAdd(this.key("match-acks", matchId), userId);
    await this.client.expire(this.key("match-acks", matchId), 20);
    return (await this.client.sCard(this.key("match-acks", matchId))) === 2;
  }
  async closeMatch(matchId: string, userId: string, recentTtlSeconds = 60) {
    const match = await this.getMatch(matchId);
    if (!match || (match.first !== userId && match.second !== userId))
      return null;
    await this.client
      .multi()
      .del(this.key("match", matchId))
      .del(this.key("match-acks", matchId))
      .del(this.key("active", match.first))
      .del(this.key("active", match.second))
      .set(this.key("deny", match.first, match.second), "1", {
        EX: recentTtlSeconds,
      })
      .exec();
    return match;
  }
  async blockPair(first: string, second: string) {
    await this.client
      .multi()
      .set(this.key("deny", first, second), "1", { EX: 86_400 })
      .set(this.key("deny", second, first), "1", { EX: 86_400 })
      .zRem(this.key("queue", "minor_16_17:text"), [first, second])
      .zRem(this.key("queue", "minor_16_17:video"), [first, second])
      .zRem(this.key("queue", "adult_18_plus:text"), [first, second])
      .zRem(this.key("queue", "adult_18_plus:video"), [first, second])
      .exec();
    for (const userId of [first, second]) {
      const active = await this.client.get(this.key("active", userId));
      if (active && active !== "queued")
        await this.closeMatch(active, userId, 86_400);
      else
        await this.client.del([
          this.key("active", userId),
          this.key("queue-entry", userId),
        ]);
    }
  }
  async activeMatchBetween(first: string, second: string) {
    const active = await this.client.get(this.key("active", first));
    if (!active || active === "queued") return null;
    const match = await this.getMatch(active);
    return match && [match.first, match.second].includes(second) ? match : null;
  }
  async acquireDirectCall(
    callId: string,
    callerId: string,
    recipientId: string,
    ttlSeconds = 30,
  ) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1_000).toISOString();
    const value = JSON.stringify({ callId, callerId, recipientId, expiresAt });
    const result = await this.client.eval(
      `if redis.call('EXISTS',KEYS[1])==1 or redis.call('EXISTS',KEYS[2])==1 then return 0 end
       redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2]); redis.call('SET',KEYS[2],ARGV[1],'EX',ARGV[2]); redis.call('SET',KEYS[3],ARGV[1],'EX',ARGV[2]); return 1`,
      {
        keys: [
          this.key("active", callerId),
          this.key("active", recipientId),
          this.key("direct-call", callId),
        ],
        arguments: [value, String(ttlSeconds)],
      },
    );
    return Number(result) === 1
      ? { callId, callerId, recipientId, expiresAt }
      : null;
  }
  async getDirectCall(callId: string): Promise<DirectCallLease | null> {
    const value = await this.client.get(this.key("direct-call", callId));
    return value ? (JSON.parse(value) as DirectCallLease) : null;
  }
  async renewDirectCall(callId: string, userId: string, ttlSeconds = 45) {
    const call = await this.getDirectCall(callId);
    if (!call || ![call.callerId, call.recipientId].includes(userId))
      return null;
    const value = JSON.stringify({
      ...call,
      expiresAt: new Date(Date.now() + ttlSeconds * 1_000).toISOString(),
    });
    await this.client
      .multi()
      .set(this.key("direct-call", callId), value, { EX: ttlSeconds })
      .set(this.key("active", call.callerId), value, { EX: ttlSeconds })
      .set(this.key("active", call.recipientId), value, { EX: ttlSeconds })
      .exec();
    return call;
  }
  async releaseDirectCall(callId: string) {
    const call = await this.getDirectCall(callId);
    if (!call) return null;
    await this.client.del([
      this.key("direct-call", callId),
      this.key("active", call.callerId),
      this.key("active", call.recipientId),
    ]);
    return call;
  }
  async nextSequence(matchId: string) {
    return this.client.incr(this.key("match-sequence", matchId));
  }
  async publishUser(userId: string, message: string) {
    await this.client.publish(this.key("user-events", userId), message);
  }
  async subscribeUserEvents(
    handler: (userId: string, message: string) => void,
  ) {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    await subscriber.pSubscribe(
      this.key("user-events", "*"),
      (message, channel) => handler(channel.split(":").at(-1)!, message),
    );
    return subscriber;
  }
}
function hash(ticket: string) {
  return createHash("sha256").update(ticket).digest("hex");
}
