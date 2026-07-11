import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { MatchMode } from '@strangr/contracts'
import type { Database } from './client.js'
import {
  blocks,
  friendRequests,
  friendships,
  callParticipants,
  calls,
  encounterParticipants,
  encounters,
  messages,
  privacySettings,
  profiles,
  reportEvidence,
  threadMembers,
  threads,
} from './schema.js'

const ENCOUNTER_TTL_MS = 48 * 60 * 60 * 1000
const CALL_TTL_MS = 90 * 24 * 60 * 60 * 1000

export class BlockRepository {
  constructor(private readonly database: Database) {}

  async hasEitherDirection(first: string, second: string): Promise<boolean> {
    const [row] = await this.database
      .select({ id: blocks.id })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, first), eq(blocks.blockedId, second)),
          and(eq(blocks.blockerId, second), eq(blocks.blockedId, first)),
        ),
      )
      .limit(1)
    return row !== undefined
  }

  async create(blockerId: string, blockedId: string, reasonCategory: string) {
    if (blockerId === blockedId) throw new Error('self_block')
    const [row] = await this.database
      .insert(blocks)
      .values({ blockerId, blockedId, reasonCategory })
      .onConflictDoUpdate({
        target: [blocks.blockerId, blocks.blockedId],
        set: { reasonCategory, updatedAt: new Date() },
      })
      .returning({ id: blocks.id, createdAt: blocks.createdAt })
    await this.database
      .update(encounterParticipants)
      .set({ hiddenAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          inArray(encounterParticipants.userId, [blockerId, blockedId]),
          inArray(
            encounterParticipants.encounterId,
            this.database
              .select({ id: encounterParticipants.encounterId })
              .from(encounterParticipants)
              .where(eq(encounterParticipants.userId, blockedId)),
          ),
        ),
      )
    await this.database
      .update(friendRequests)
      .set({
        state: 'cancelled',
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(friendRequests.state, 'pending'),
          or(
            and(
              eq(friendRequests.senderId, blockerId),
              eq(friendRequests.recipientId, blockedId),
            ),
            and(
              eq(friendRequests.senderId, blockedId),
              eq(friendRequests.recipientId, blockerId),
            ),
          ),
        ),
      )
    const [first, second] =
      blockerId < blockedId ? [blockerId, blockedId] : [blockedId, blockerId]
    await this.database
      .update(friendships)
      .set({ state: 'ended', endedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(friendships.firstUserId, first),
          eq(friendships.secondUserId, second),
          eq(friendships.state, 'active'),
        ),
      )
    return row!
  }

  async remove(blockerId: string, blockedId: string) {
    await this.database
      .delete(blocks)
      .where(
        and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)),
      )
  }

  async blocksUsername(viewerId: string, username: string) {
    const [target] = await this.database
      .select({ id: profiles.userId })
      .from(profiles)
      .where(
        eq(
          profiles.normalizedUsername,
          username.trim().normalize('NFKC').toLowerCase(),
        ),
      )
      .limit(1)
    return target ? this.hasEitherDirection(viewerId, target.id) : false
  }
}

export class EncounterRepository {
  constructor(private readonly database: Database) {}

  async start(
    id: string,
    mode: MatchMode,
    participantIds: [string, string],
    now = new Date(),
  ) {
    const expiresAt = new Date(now.getTime() + ENCOUNTER_TTL_MS)
    await this.database.transaction(async (tx) => {
      await tx
        .insert(encounters)
        .values({ id, mode, startedAt: now, visibleUntil: expiresAt })
        .onConflictDoNothing()
      const [thread] = await tx
        .insert(threads)
        .values({ type: 'random', encounterId: id, expiresAt })
        .onConflictDoNothing({ target: threads.encounterId })
        .returning({ id: threads.id })
      const threadId =
        thread?.id ??
        (
          await tx
            .select({ id: threads.id })
            .from(threads)
            .where(eq(threads.encounterId, id))
            .limit(1)
        )[0]!.id
      await tx
        .insert(encounterParticipants)
        .values(participantIds.map((userId) => ({ encounterId: id, userId })))
        .onConflictDoNothing()
      await tx
        .insert(threadMembers)
        .values(participantIds.map((userId) => ({ threadId, userId })))
        .onConflictDoNothing()
      if (mode === 'video') {
        const [call] = await tx
          .insert(calls)
          .values({
            encounterId: id,
            type: 'random',
            mode,
            startedAt: now,
            expiresAt: new Date(now.getTime() + CALL_TTL_MS),
          })
          .returning({ id: calls.id })
        await tx
          .insert(callParticipants)
          .values(
            participantIds.map((userId) => ({ callId: call!.id, userId })),
          )
      }
    })
  }

  async connected(id: string, now = new Date()) {
    await this.database
      .update(calls)
      .set({ connectedAt: now })
      .where(and(eq(calls.encounterId, id), isNull(calls.connectedAt)))
  }

  async end(
    id: string,
    reason: string,
    actorId: string,
    diagnostic?: string,
    now = new Date(),
  ) {
    await this.database.transaction(async (tx) => {
      await tx
        .update(encounters)
        .set({
          state: 'ended',
          endedAt: now,
          completionReason: reason,
          ...(diagnostic ? { diagnosticsCategory: diagnostic } : {}),
          updatedAt: now,
        })
        .where(and(eq(encounters.id, id), eq(encounters.state, 'active')))
      await tx
        .update(encounterParticipants)
        .set({ result: reason, updatedAt: now })
        .where(
          and(
            eq(encounterParticipants.encounterId, id),
            eq(encounterParticipants.userId, actorId),
          ),
        )
      await tx
        .update(calls)
        .set({
          endedAt: now,
          completionReason: reason,
          ...(diagnostic ? { diagnosticsCategory: diagnostic } : {}),
        })
        .where(and(eq(calls.encounterId, id), isNull(calls.endedAt)))
    })
  }

  async addRandomMessage(
    encounterId: string,
    senderId: string,
    clientMessageId: string,
    sequence: number,
    body: string,
    sentAt = new Date(),
  ) {
    const clean = body.normalize('NFC').trim()
    if (!clean || [...clean].length > 2_000) throw new Error('invalid_message')
    const [thread] = await this.database
      .select({ id: threads.id, expiresAt: threads.expiresAt })
      .from(threads)
      .where(
        and(eq(threads.encounterId, encounterId), eq(threads.type, 'random')),
      )
      .limit(1)
    if (!thread?.expiresAt || thread.expiresAt <= sentAt)
      throw new Error('encounter_expired')
    const [row] = await this.database
      .insert(messages)
      .values({
        threadId: thread.id,
        senderId,
        type: 'random',
        clientMessageId,
        serverSequence: sequence,
        body: clean,
        sentAt,
        expiresAt: thread.expiresAt,
      })
      .onConflictDoNothing()
      .returning({ id: messages.id, body: messages.body })
    if (row) return row
    return (
      await this.database
        .select({ id: messages.id, body: messages.body })
        .from(messages)
        .where(
          and(
            eq(messages.threadId, thread.id),
            eq(messages.clientMessageId, clientMessageId),
          ),
        )
        .limit(1)
    )[0]!
  }

  async list(
    userId: string,
    cursor: string | undefined,
    limit: number,
    now = new Date(),
  ) {
    const before = cursor ? decodeCursor(cursor) : now
    const peer = alias(encounterParticipants, 'peer_participant')
    const rows = await this.database
      .select({
        id: encounters.id,
        mode: encounters.mode,
        startedAt: encounters.startedAt,
        endedAt: encounters.endedAt,
        peerId: profiles.userId,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarObjectKey: profiles.avatarObjectKey,
        isPrivate: privacySettings.isPrivate,
      })
      .from(encounterParticipants)
      .innerJoin(
        encounters,
        eq(encounters.id, encounterParticipants.encounterId),
      )
      .innerJoin(
        peer,
        and(
          eq(peer.encounterId, encounters.id),
          sql`${peer.userId} <> ${userId}`,
        ),
      )
      .innerJoin(profiles, eq(profiles.userId, peer.userId))
      .leftJoin(privacySettings, eq(privacySettings.userId, profiles.userId))
      .where(
        and(
          eq(encounterParticipants.userId, userId),
          isNull(encounterParticipants.hiddenAt),
          gt(encounters.visibleUntil, now),
          lt(encounters.startedAt, before),
          sql`not exists (select 1 from blocks b where (b.blocker_id=${userId} and b.blocked_id=${profiles.userId}) or (b.blocker_id=${profiles.userId} and b.blocked_id=${userId}))`,
        ),
      )
      .orderBy(desc(encounters.startedAt), desc(encounters.id))
      .limit(limit + 1)
    const page = rows.slice(0, limit).map((row) => ({
      id: row.id,
      mode: row.mode,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      otherUser: {
        id: row.peerId,
        username: row.username,
        displayName: row.isPrivate ? row.username : row.displayName,
        avatarAvailable: Boolean(row.avatarObjectKey),
      },
      friendshipState: 'none' as const,
      requestState: 'none' as const,
      hidden: false,
      reported: false,
      blocked: false,
    }))
    const next =
      rows.length > limit && page.at(-1)
        ? encodeCursor(page.at(-1)!.startedAt)
        : null
    return {
      items: page,
      nextCursor: next,
    }
  }

  async hide(userId: string, encounterId: string) {
    const rows = await this.database
      .update(encounterParticipants)
      .set({ hiddenAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(encounterParticipants.userId, userId),
          eq(encounterParticipants.encounterId, encounterId),
        ),
      )
      .returning({ id: encounterParticipants.encounterId })
    return rows.length > 0
  }

  async preserveEvidence(
    encounterId: string,
    messageId: string,
    reason: string,
    expiresAt: Date,
  ) {
    const [message] = await this.database
      .select({ body: messages.body })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1)
    if (!message) throw new Error('message_not_found')
    return this.database.insert(reportEvidence).values({
      encounterId,
      messageId,
      excerpt: [...message.body].slice(0, 500).join(''),
      retentionReason: reason,
      expiresAt,
    })
  }

  async cleanupExpired(batchSize = 500, now = new Date(), dryRun = false) {
    const expiredMessages = await this.database
      .select({ id: messages.id })
      .from(messages)
      .where(and(lt(messages.expiresAt, now), eq(messages.type, 'random')))
      .orderBy(asc(messages.expiresAt))
      .limit(batchSize)
    const expiredEncounters = await this.database
      .select({ id: encounters.id, visibleUntil: encounters.visibleUntil })
      .from(encounters)
      .where(lt(encounters.visibleUntil, now))
      .orderBy(asc(encounters.visibleUntil))
      .limit(batchSize)
    if (!dryRun) {
      if (expiredMessages.length)
        await this.database.delete(messages).where(
          inArray(
            messages.id,
            expiredMessages.map((x) => x.id),
          ),
        )
      if (expiredEncounters.length)
        await this.database.delete(encounterParticipants).where(
          inArray(
            encounterParticipants.encounterId,
            expiredEncounters.map((x) => x.id),
          ),
        )
      if (expiredEncounters.length)
        await this.database.delete(encounters).where(
          inArray(
            encounters.id,
            expiredEncounters.map((x) => x.id),
          ),
        )
    }
    return {
      expiredMessages: expiredMessages.length,
      expiredEncounters: expiredEncounters.length,
      dryRun,
      lagSeconds: expiredEncounters[0]
        ? Math.max(
            0,
            Math.floor(
              (now.getTime() - expiredEncounters[0].visibleUntil.getTime()) /
                1000,
            ),
          )
        : 0,
    }
  }
}

function encodeCursor(date: Date) {
  return Buffer.from(date.toISOString()).toString('base64url')
}
function decodeCursor(value: string) {
  const date = new Date(Buffer.from(value, 'base64url').toString('utf8'))
  if (!Number.isFinite(date.getTime())) throw new Error('invalid_cursor')
  return date
}
