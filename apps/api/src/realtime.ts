import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { AgeCohort, MatchMode } from '@strangr/contracts'
import { createClient, type RedisClientType } from 'redis'

export interface RealtimeIdentity {
  userId: string
  sessionId: string
  cohort: AgeCohort
}
export interface TicketRecord extends RealtimeIdentity {
  expiresAt: string
}
export interface MatchRecord {
  id: string
  mode: MatchMode
  first: string
  second: string
  expiresAt: string
}

export class RedisRealtimeStore {
  readonly client: RedisClientType
  private readonly prefix: string
  constructor(url: string, namespace = 'strangr') {
    this.client = createClient({ url })
    this.prefix = namespace
  }
  private key(...parts: string[]) {
    return [this.prefix, ...parts].join(':')
  }
  async connect() {
    if (!this.client.isOpen) await this.client.connect()
  }
  async close() {
    if (this.client.isOpen) await this.client.quit()
  }
  async health() {
    return (await this.client.ping()) === 'PONG'
  }
  async createTicket(identity: RealtimeIdentity, ttlSeconds = 30) {
    const ticket = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
    await this.client.set(
      this.key('ticket', hash(ticket)),
      JSON.stringify({ ...identity, expiresAt }),
      { EX: ttlSeconds, NX: true },
    )
    return { ticket, expiresAt }
  }
  async consumeTicket(ticket: string): Promise<TicketRecord | null> {
    if (ticket.length < 32 || ticket.length > 256) return null
    const value = await this.client.sendCommand(['GETDEL', this.key('ticket', hash(ticket))])
    if (typeof value !== 'string') return null
    return JSON.parse(value) as TicketRecord
  }
  async bindConnection(identity: RealtimeIdentity, connectionId: string, ttlSeconds = 45) {
    await this.client.set(this.key('connection', connectionId), JSON.stringify(identity), {
      EX: ttlSeconds,
    })
    await this.client.sAdd(this.key('user-connections', identity.userId), connectionId)
    await this.client.expire(this.key('user-connections', identity.userId), ttlSeconds)
  }
  async renewConnection(identity: RealtimeIdentity, connectionId: string, ttlSeconds = 45) {
    await this.bindConnection(identity, connectionId, ttlSeconds)
  }
  async unbindConnection(identity: RealtimeIdentity, connectionId: string) {
    await Promise.all([
      this.client.del(this.key('connection', connectionId)),
      this.client.sRem(this.key('user-connections', identity.userId), connectionId),
    ])
  }
  async isSessionRevoked(sessionId: string) {
    return (await this.client.exists(this.key('revoked-session', sessionId))) === 1
  }
  async revokeSession(sessionId: string) {
    await this.client.set(this.key('revoked-session', sessionId), '1', { EX: 86_400 })
    await this.client.publish(this.key('session-revoked'), sessionId)
  }
  async rateLimit(scope: string, limit: number, windowSeconds: number) {
    const key = this.key('limit', scope)
    const count = await this.client.incr(key)
    if (count === 1) await this.client.expire(key, windowSeconds)
    return { allowed: count <= limit, retryAfterMs: await this.client.pTTL(key) }
  }
  async joinQueue(
    identity: RealtimeIdentity,
    mode: MatchMode,
  ): Promise<{ queuedAt: string; match: MatchRecord | null }> {
    const queuedAt = new Date().toISOString()
    const partition = `${identity.cohort}:${mode}`
    const activeKey = this.key('active', identity.userId)
    const queueKey = this.key('queue', partition)
    const entryKey = this.key('queue-entry', identity.userId)
    const matchId = randomUUID()
    const expiresAt = new Date(Date.now() + 20_000).toISOString()
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
          '20000',
          this.key('queue-entry') + ':',
          this.key('active') + ':',
          this.key('deny') + ':',
          this.key('match') + ':',
          expiresAt,
        ],
      },
    )) as string[]
    if (result[0] === 'busy') throw new Error('already_queued')
    return {
      queuedAt,
      match:
        result[0] === 'matched' && result[1]
          ? { id: matchId, mode, first: result[1], second: identity.userId, expiresAt }
          : null,
    }
  }
  async getMatch(matchId: string): Promise<MatchRecord | null> {
    const value = await this.client.get(this.key('match', matchId))
    return value ? (JSON.parse(value) as MatchRecord) : null
  }
  async acknowledge(matchId: string, userId: string) {
    const match = await this.getMatch(matchId)
    if (!match || (match.first !== userId && match.second !== userId)) return false
    await this.client.sAdd(this.key('match-acks', matchId), userId)
    await this.client.expire(this.key('match-acks', matchId), 20)
    return (await this.client.sCard(this.key('match-acks', matchId))) === 2
  }
  async closeMatch(matchId: string, userId: string, recentTtlSeconds = 60) {
    const match = await this.getMatch(matchId)
    if (!match || (match.first !== userId && match.second !== userId)) return null
    await this.client
      .multi()
      .del(this.key('match', matchId))
      .del(this.key('match-acks', matchId))
      .del(this.key('active', match.first))
      .del(this.key('active', match.second))
      .set(this.key('deny', match.first, match.second), '1', { EX: recentTtlSeconds })
      .exec()
    return match
  }
  async nextSequence(matchId: string) {
    return this.client.incr(this.key('match-sequence', matchId))
  }
  async publishUser(userId: string, message: string) {
    await this.client.publish(this.key('user-events', userId), message)
  }
  async subscribeUserEvents(handler: (userId: string, message: string) => void) {
    const subscriber = this.client.duplicate()
    await subscriber.connect()
    await subscriber.pSubscribe(this.key('user-events', '*'), (message, channel) =>
      handler(channel.split(':').at(-1)!, message),
    )
    return subscriber
  }
}
function hash(ticket: string) {
  return createHash('sha256').update(ticket).digest('hex')
}
