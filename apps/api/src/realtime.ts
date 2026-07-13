import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AgeCohort, MatchMode } from "@paramingle/contracts";
import type { MatchCriteria } from "@paramingle/database";
import { createClient, type RedisClientType } from "redis";

export interface RealtimeIdentity {
  userId: string;
  sessionId: string;
  cohort: AgeCohort;
  country?: string;
  capacityReservationId?: string;
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
  connectedAt?: string;
}
export interface DirectCallLease {
  callId: string;
  callerId: string;
  recipientId: string;
  expiresAt: string;
}

function acceptsGender(
  preference: MatchCriteria["genderPreference"],
  identity: MatchCriteria["genderIdentity"],
) {
  return (
    preference === "everyone" ||
    (preference === "men" && identity === "man") ||
    (preference === "women" && identity === "woman") ||
    (preference === "nonbinary" && identity === "nonbinary")
  );
}

export function criteriaCompatible(
  first: MatchCriteria,
  second: MatchCriteria,
  waitMs = 0,
) {
  if (
    !acceptsGender(first.genderPreference, second.genderIdentity) ||
    !acceptsGender(second.genderPreference, first.genderIdentity)
  )
    return false;
  const relax =
    first.allowPreferenceRelaxation && second.allowPreferenceRelaxation;
  const countryLanguageRelaxed = relax && waitMs >= 30_000;
  const interestsRelaxed = relax && waitMs >= 15_000;
  if (
    !countryLanguageRelaxed &&
    ((first.countryPreference && first.countryPreference !== second.country) ||
      (second.countryPreference &&
        second.countryPreference !== first.country) ||
      (first.languagePreference &&
        first.languagePreference !== second.language) ||
      (second.languagePreference &&
        second.languagePreference !== first.language))
  )
    return false;
  const shares = (wanted: string[], offered: string[]) =>
    wanted.length === 0 || wanted.some((tag) => offered.includes(tag));
  return (
    interestsRelaxed ||
    (shares(first.interestTags, second.interests) &&
      shares(second.interestTags, first.interests))
  );
}

export function textSkipCooldown(match: MatchRecord, now = Date.now()) {
  if (match.mode !== "text") return { allowed: true, retryAfterMs: 0 };
  const connectedAt = match.connectedAt
    ? new Date(match.connectedAt).getTime()
    : Number.NaN;
  const skipAllowedAt = connectedAt + 25_000;
  const retryAfterMs = skipAllowedAt - now;
  return {
    allowed: Number.isFinite(connectedAt) && retryAfterMs <= 0,
    retryAfterMs: Number.isFinite(retryAfterMs)
      ? Math.max(0, retryAfterMs)
      : 25_000,
    skipAllowedAt: Number.isFinite(skipAllowedAt)
      ? new Date(skipAllowedAt).toISOString()
      : undefined,
  };
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
  async createTicket(
    identity: RealtimeIdentity,
    ttlSeconds = 30,
    capacity?: { global: number; country: number },
  ) {
    const ticket = randomBytes(32).toString("base64url");
    const capacityReservationId = hash(ticket);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    if (capacity) {
      if (!identity.country) throw new Error("capacity_country_missing");
      const expiresAtMs = Date.now() + ttlSeconds * 1_000;
      const accepted = await this.client.eval(
        `redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1])
         redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',ARGV[1])
         if redis.call('ZCARD',KEYS[1]) >= tonumber(ARGV[2]) or redis.call('ZCARD',KEYS[2]) >= tonumber(ARGV[3]) then return 0 end
         redis.call('ZADD',KEYS[1],ARGV[4],ARGV[5]); redis.call('ZADD',KEYS[2],ARGV[4],ARGV[5]); return 1`,
        {
          keys: [
            this.key("capacity", "global"),
            this.key("capacity", "country", identity.country),
          ],
          arguments: [
            String(Date.now()),
            String(capacity.global),
            String(capacity.country),
            String(expiresAtMs),
            capacityReservationId,
          ],
        },
      );
      if (Number(accepted) !== 1) throw new Error("capacity_full");
    }
    const stored = await this.client.set(
      this.key("ticket", hash(ticket)),
      JSON.stringify({ ...identity, capacityReservationId, expiresAt }),
      { EX: ttlSeconds, NX: true },
    );
    if (!stored && identity.country)
      await this.releaseCapacity(identity.country, capacityReservationId);
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
    if (identity.country) {
      const expiresAtMs = Date.now() + ttlSeconds * 1_000;
      const transaction = this.client.multi();
      if (identity.capacityReservationId)
        transaction
          .zRem(this.key("capacity", "global"), identity.capacityReservationId)
          .zRem(
            this.key("capacity", "country", identity.country),
            identity.capacityReservationId,
          );
      await transaction
        .zAdd(this.key("capacity", "global"), {
          score: expiresAtMs,
          value: connectionId,
        })
        .zAdd(this.key("capacity", "country", identity.country), {
          score: expiresAtMs,
          value: connectionId,
        })
        .exec();
    }
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
    const operations = [
      this.client.del(this.key("connection", connectionId)),
      this.client.sRem(
        this.key("user-connections", identity.userId),
        connectionId,
      ),
    ];
    if (identity.country)
      operations.push(
        this.client.zRem(this.key("capacity", "global"), connectionId),
        this.client.zRem(
          this.key("capacity", "country", identity.country),
          connectionId,
        ),
      );
    await Promise.all(operations);
  }
  async capacitySnapshot(country: string) {
    const now = Date.now();
    await Promise.all([
      this.client.zRemRangeByScore(this.key("capacity", "global"), "-inf", now),
      this.client.zRemRangeByScore(
        this.key("capacity", "country", country),
        "-inf",
        now,
      ),
    ]);
    const [global, local] = await Promise.all([
      this.client.zCard(this.key("capacity", "global")),
      this.client.zCard(this.key("capacity", "country", country)),
    ]);
    return { global, country: local };
  }
  async redisMemoryBytes() {
    const info = await this.client.info("memory");
    const match = /^used_memory:(\d+)$/m.exec(info);
    return match ? Number(match[1]) : null;
  }
  private async releaseCapacity(country: string, member: string) {
    await Promise.all([
      this.client.zRem(this.key("capacity", "global"), member),
      this.client.zRem(this.key("capacity", "country", country), member),
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
  async repeatedContent(
    scope: string,
    content: string,
    limit = 4,
    windowSeconds = 60,
  ) {
    const digest = createHash("sha256")
      .update(content.normalize("NFC").trim().toLocaleLowerCase())
      .digest("hex")
      .slice(0, 24);
    return this.rateLimit(`repeat:${scope}:${digest}`, limit, windowSeconds);
  }
  async joinQueue(
    identity: RealtimeIdentity,
    mode: MatchMode,
    criteria: MatchCriteria,
    priorityWeight = 1,
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
    const candidates = await this.client.zRangeWithScores(queueKey, 0, 24);
    for (const candidate of candidates) {
      const raw = await this.client.get(
        this.key("queue-entry", candidate.value),
      );
      const compatible = (() => {
        try {
          return Boolean(
            raw &&
            criteriaCompatible(
              criteria,
              JSON.parse(raw) as MatchCriteria,
              Date.now() - candidate.score,
            ),
          );
        } catch {
          return false;
        }
      })();
      if (!compatible)
        await this.client.set(
          this.key("deny", identity.userId, candidate.value),
          "1",
          { EX: 5 },
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
       redis.call('SET',KEYS[3],ARGV[11],'PX',120000)
       redis.call('SET',KEYS[1],'queued','PX',120000)
       return {'queued'}`,
      {
        keys: [activeKey, queueKey, entryKey],
        arguments: [
          identity.userId,
          String(Date.now() - (priorityWeight > 1 ? 5_000 : 0)),
          mode,
          matchId,
          "20000",
          this.key("queue-entry") + ":",
          this.key("active") + ":",
          this.key("deny") + ":",
          this.key("match") + ":",
          expiresAt,
          JSON.stringify(criteria),
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
  async acquireReconnectMatch(first: string, second: string, mode: MatchMode) {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 20_000).toISOString();
    const match: MatchRecord = { id, mode, first, second, expiresAt };
    const acquired = await this.client.eval(
      `if redis.call('EXISTS',KEYS[1])==1 or redis.call('EXISTS',KEYS[2])==1 then return 0 end
       redis.call('ZREM',KEYS[4],ARGV[1]); redis.call('ZREM',KEYS[4],ARGV[2])
       redis.call('DEL',KEYS[5],KEYS[6])
       redis.call('SET',KEYS[1],ARGV[3],'PX',20000); redis.call('SET',KEYS[2],ARGV[3],'PX',20000)
       redis.call('SET',KEYS[3],ARGV[4],'PX',20000); return 1`,
      {
        keys: [
          this.key("active", first),
          this.key("active", second),
          this.key("match", id),
          this.key("queue", `adult_18_plus:${mode}`),
          this.key("queue-entry", first),
          this.key("queue-entry", second),
        ],
        arguments: [first, second, id, JSON.stringify(match)],
      },
    );
    return Number(acquired) === 1 ? match : null;
  }
  async acknowledge(matchId: string, userId: string) {
    const match = await this.getMatch(matchId);
    if (!match || (match.first !== userId && match.second !== userId))
      return null;
    const connectedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1_000).toISOString();
    const result = await this.client.eval(
      `local raw=redis.call('GET',KEYS[1])
       if not raw then return nil end
       redis.call('SADD',KEYS[2],ARGV[1])
       redis.call('EXPIRE',KEYS[2],20)
       if redis.call('SCARD',KEYS[2]) < 2 then return nil end
       local match=cjson.decode(raw)
       if not match.connectedAt then match.connectedAt=ARGV[2] end
       match.expiresAt=ARGV[3]
       local updated=cjson.encode(match)
       redis.call('SET',KEYS[1],updated,'EX',ARGV[4])
       redis.call('SET',KEYS[3],ARGV[5],'EX',ARGV[4])
       redis.call('SET',KEYS[4],ARGV[5],'EX',ARGV[4])
       redis.call('EXPIRE',KEYS[2],ARGV[4])
       return match.connectedAt`,
      {
        keys: [
          this.key("match", matchId),
          this.key("match-acks", matchId),
          this.key("active", match.first),
          this.key("active", match.second),
        ],
        arguments: [
          userId,
          connectedAt,
          expiresAt,
          String(6 * 60 * 60),
          matchId,
        ],
      },
    );
    return typeof result === "string" ? result : null;
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
      if (active && active !== "queued") {
        const direct = active.startsWith("{")
          ? (JSON.parse(active) as DirectCallLease)
          : null;
        if (direct?.callId) await this.releaseDirectCall(direct.callId);
        else await this.closeMatch(active, userId, 86_400);
      } else
        await this.client.del([
          this.key("active", userId),
          this.key("queue-entry", userId),
        ]);
    }
  }
  async activeDirectCallBetween(first: string, second: string) {
    const active = await this.client.get(this.key("active", first));
    if (!active?.startsWith("{")) return null;
    const call = JSON.parse(active) as DirectCallLease;
    return [call.callerId, call.recipientId].includes(second) ? call : null;
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
