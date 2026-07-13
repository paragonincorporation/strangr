import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  blocks,
  callParticipants,
  calls,
  friendships,
  messageHiddenFor,
  messages,
  profiles,
  threadMembers,
  threads,
  users,
} from "./schema.js";
const MAX_MESSAGE_LENGTH = 2_000;
const CALL_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;
function cleanMessage(body) {
  const value = body.normalize("NFC").trim();
  if (!value || [...value].length > MAX_MESSAGE_LENGTH)
    throw new Error("invalid_message");
  return value;
}
async function directAccess(tx, userId, threadId) {
  const other = alias(threadMembers, "other_member");
  const [row] = await tx
    .select({ otherUserId: other.userId })
    .from(threads)
    .innerJoin(
      threadMembers,
      and(
        eq(threadMembers.threadId, threads.id),
        eq(threadMembers.userId, userId),
      ),
    )
    .innerJoin(
      other,
      and(eq(other.threadId, threads.id), sql`${other.userId} <> ${userId}`),
    )
    .innerJoin(
      friendships,
      and(
        eq(friendships.threadId, threads.id),
        eq(friendships.state, "active"),
      ),
    )
    .innerJoin(users, eq(users.id, other.userId))
    .where(
      and(
        eq(threads.id, threadId),
        eq(threads.type, "direct"),
        eq(users.accountState, "active"),
        eq(users.emailVerified, true),
      ),
    )
    .limit(1);
  if (!row) throw new Error("thread_unavailable");
  const [blocked] = await tx
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(
          eq(blocks.blockerId, userId),
          eq(blocks.blockedId, row.otherUserId),
        ),
        and(
          eq(blocks.blockerId, row.otherUserId),
          eq(blocks.blockedId, userId),
        ),
      ),
    )
    .limit(1);
  if (blocked) throw new Error("relationship_unavailable");
  return row;
}
export class CommunicationRepository {
  db;
  constructor(db) {
    this.db = db;
  }
  async listThreads(userId, cursor, limit = 20) {
    const before = cursor
      ? Number(Buffer.from(cursor, "base64url").toString("utf8"))
      : Number.MAX_SAFE_INTEGER;
    const other = alias(threadMembers, "other_member");
    const rows = await this.db
      .select({
        id: threads.id,
        userId: other.userId,
        username: profiles.username,
        displayName: profiles.displayName,
        readSequence: threadMembers.readSequence,
        lastSequence: sql`coalesce(max(${messages.serverSequence}),0)::bigint`,
        lastMessageAt: sql`coalesce(max(${messages.sentAt}),${threads.createdAt})`,
      })
      .from(threads)
      .innerJoin(
        threadMembers,
        and(
          eq(threadMembers.threadId, threads.id),
          eq(threadMembers.userId, userId),
        ),
      )
      .innerJoin(
        other,
        and(eq(other.threadId, threads.id), sql`${other.userId} <> ${userId}`),
      )
      .innerJoin(profiles, eq(profiles.userId, other.userId))
      .innerJoin(
        friendships,
        and(
          eq(friendships.threadId, threads.id),
          eq(friendships.state, "active"),
        ),
      )
      .leftJoin(
        messages,
        and(
          eq(messages.threadId, threads.id),
          lt(messages.serverSequence, before + 1),
        ),
      )
      .where(
        and(
          eq(threads.type, "direct"),
          isNull(threadMembers.hiddenAt),
          sql`not exists(select 1 from blocks b where (b.blocker_id=${userId} and b.blocked_id=${other.userId}) or (b.blocker_id=${other.userId} and b.blocked_id=${userId}))`,
        ),
      )
      .groupBy(
        threads.id,
        other.userId,
        profiles.username,
        profiles.displayName,
        threadMembers.readSequence,
      )
      .orderBy(
        desc(sql`coalesce(max(${messages.sentAt}),${threads.createdAt})`),
      )
      .limit(limit + 1);
    const items = rows.slice(0, limit).map((row) => ({
      ...row,
      unread: Math.max(0, Number(row.lastSequence) - Number(row.readSequence)),
    }));
    return {
      items,
      nextCursor:
        rows.length > limit
          ? Buffer.from(String(rows[limit - 1].lastSequence)).toString(
              "base64url",
            )
          : null,
    };
  }
  async messages(userId, threadId, beforeSequence, limit = 50) {
    return this.db.transaction(async (tx) => {
      await directAccess(tx, userId, threadId);
      const rows = await tx
        .select({
          id: messages.id,
          senderId: messages.senderId,
          clientMessageId: messages.clientMessageId,
          sequence: messages.serverSequence,
          body: messages.body,
          sentAt: messages.sentAt,
          deletedAt: messages.deletedForEveryoneAt,
        })
        .from(messages)
        .where(
          and(
            eq(messages.threadId, threadId),
            beforeSequence
              ? lt(messages.serverSequence, beforeSequence)
              : undefined,
            sql`not exists(select 1 from message_hidden_for mh where mh.message_id=${messages.id} and mh.user_id=${userId})`,
          ),
        )
        .orderBy(desc(messages.serverSequence))
        .limit(limit + 1);
      return {
        items: rows
          .slice(0, limit)
          .reverse()
          .map((row) => ({ ...row, body: row.deletedAt ? null : row.body })),
        nextCursor:
          rows.length > limit ? String(rows[limit - 1].sequence) : null,
      };
    });
  }
  async send(userId, threadId, clientMessageId, body, now = new Date()) {
    const clean = cleanMessage(body);
    return this.db.transaction(async (tx) => {
      const access = await directAccess(tx, userId, threadId);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${threadId}))`,
      );
      const [existing] = await tx
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.threadId, threadId),
            eq(messages.clientMessageId, clientMessageId),
          ),
        )
        .limit(1);
      if (existing) {
        if (existing.senderId !== userId || existing.body !== clean)
          throw new Error("idempotency_conflict");
        return { ...existing, recipientId: access.otherUserId };
      }
      const [sequence] = await tx
        .select({
          value: sql`coalesce(max(${messages.serverSequence}),0)+1`,
        })
        .from(messages)
        .where(eq(messages.threadId, threadId));
      const [created] = await tx
        .insert(messages)
        .values({
          threadId,
          senderId: userId,
          type: "direct",
          clientMessageId,
          serverSequence: Number(sequence.value),
          body: clean,
          sentAt: now,
        })
        .returning();
      return { ...created, recipientId: access.otherUserId };
    });
  }
  async markRead(userId, threadId, sequence) {
    return this.db.transaction(async (tx) => {
      await directAccess(tx, userId, threadId);
      const [last] = await tx
        .select({ value: messages.serverSequence })
        .from(messages)
        .where(
          and(
            eq(messages.threadId, threadId),
            lt(messages.serverSequence, sequence + 1),
          ),
        )
        .orderBy(desc(messages.serverSequence))
        .limit(1);
      if (!last) return 0;
      const [updated] = await tx
        .update(threadMembers)
        .set({
          readSequence: sql`greatest(${threadMembers.readSequence},${last.value})`,
        })
        .where(
          and(
            eq(threadMembers.threadId, threadId),
            eq(threadMembers.userId, userId),
          ),
        )
        .returning({ value: threadMembers.readSequence });
      return updated?.value ?? 0;
    });
  }
  async deleteMessage(
    userId,
    messageId,
    everyone,
    deleteWindowMs,
    now = new Date(),
  ) {
    return this.db.transaction(async (tx) => {
      const [message] = await tx
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .for("update")
        .limit(1);
      if (!message) throw new Error("message_unavailable");
      await directAccess(tx, userId, message.threadId);
      if (!everyone) {
        await tx
          .insert(messageHiddenFor)
          .values({ messageId, userId, hiddenAt: now })
          .onConflictDoNothing();
        return { deletedFor: "me" };
      }
      if (
        message.senderId !== userId ||
        now.getTime() - message.sentAt.getTime() > deleteWindowMs
      )
        throw new Error("delete_window_expired");
      await tx
        .update(messages)
        .set({ body: null, deletedForEveryoneAt: now })
        .where(eq(messages.id, messageId));
      return { deletedFor: "everyone", deletedAt: now };
    });
  }
  async unreadCount(userId) {
    const result = await this.db.execute(
      sql`select coalesce(sum(greatest(last_sequence-tm.read_sequence,0)),0)::int count from thread_members tm join friendships f on f.thread_id=tm.thread_id and f.state='active' join lateral (select coalesce(max(m.server_sequence),0) last_sequence from messages m where m.thread_id=tm.thread_id and m.sender_id<>${userId}) x on true where tm.user_id=${userId}`,
    );
    return result.rows[0]?.count ?? 0;
  }
  async createCall(callerId, friendId, mode, now = new Date()) {
    if (callerId === friendId) throw new Error("call_unavailable");
    return this.db.transaction(async (tx) => {
      const [friendship] = await tx
        .select({ threadId: friendships.threadId })
        .from(friendships)
        .where(
          and(
            eq(friendships.state, "active"),
            or(
              and(
                eq(friendships.firstUserId, callerId),
                eq(friendships.secondUserId, friendId),
              ),
              and(
                eq(friendships.firstUserId, friendId),
                eq(friendships.secondUserId, callerId),
              ),
            ),
          ),
        )
        .limit(1);
      if (!friendship) throw new Error("call_unavailable");
      await directAccess(tx, callerId, friendship.threadId);
      const [call] = await tx
        .insert(calls)
        .values({
          threadId: friendship.threadId,
          type: "direct",
          mode,
          state: "inviting",
          invitedBy: callerId,
          startedAt: now,
          expiresAt: new Date(now.getTime() + CALL_RETENTION_MS),
        })
        .returning();
      await tx.insert(callParticipants).values([
        { callId: call.id, userId: callerId, result: "inviting" },
        { callId: call.id, userId: friendId, result: "ringing" },
      ]);
      return { ...call, callerId, recipientId: friendId };
    });
  }
  async callAction(userId, callId, action, now = new Date()) {
    return this.db.transaction(async (tx) => {
      const [call] = await tx
        .select()
        .from(calls)
        .innerJoin(
          callParticipants,
          and(
            eq(callParticipants.callId, calls.id),
            eq(callParticipants.userId, userId),
          ),
        )
        .where(and(eq(calls.id, callId), eq(calls.type, "direct")))
        .for("update")
        .limit(1);
      if (!call?.calls.threadId) throw new Error("call_unavailable");
      await directAccess(tx, userId, call.calls.threadId);
      const current = call.calls.state;
      if (
        action === "accept" &&
        current !== "ringing" &&
        current !== "inviting"
      )
        throw new Error("call_stale");
      if (
        ["reject", "cancel"].includes(action) &&
        !["ringing", "inviting"].includes(current)
      )
        throw new Error("call_stale");
      const state =
        action === "accept"
          ? "connecting"
          : action === "reject"
            ? "declined"
            : action === "cancel"
              ? "cancelled"
              : "ended";
      await tx
        .update(calls)
        .set({
          state,
          ...(action === "accept"
            ? { connectedAt: now }
            : { endedAt: now, completionReason: state }),
        })
        .where(eq(calls.id, callId));
      const [peer] = await tx
        .select({ userId: callParticipants.userId })
        .from(callParticipants)
        .where(
          and(
            eq(callParticipants.callId, callId),
            sql`${callParticipants.userId} <> ${userId}`,
          ),
        )
        .limit(1);
      return {
        callId,
        state,
        threadId: call.calls.threadId,
        peerId: peer.userId,
      };
    });
  }
  async terminateDirectCallForBlock(
    callId,
    firstUserId,
    secondUserId,
    now = new Date(),
  ) {
    const ended = await this.db
      .update(calls)
      .set({
        state: "ended",
        endedAt: now,
        completionReason: "blocked",
      })
      .where(
        and(
          eq(calls.id, callId),
          eq(calls.type, "direct"),
          sql`exists(select 1 from ${callParticipants} first_participant where first_participant.call_id=${calls.id} and first_participant.user_id=${firstUserId})`,
          sql`exists(select 1 from ${callParticipants} second_participant where second_participant.call_id=${calls.id} and second_participant.user_id=${secondUserId})`,
        ),
      )
      .returning({ id: calls.id });
    return ended.length === 1;
  }
  async authorizeCall(userId, callId) {
    return this.db.transaction(async (tx) => {
      const [call] = await tx
        .select({ threadId: calls.threadId, state: calls.state })
        .from(calls)
        .innerJoin(
          callParticipants,
          and(
            eq(callParticipants.callId, calls.id),
            eq(callParticipants.userId, userId),
          ),
        )
        .where(and(eq(calls.id, callId), eq(calls.type, "direct")))
        .limit(1);
      if (!call?.threadId || !["connecting", "connected"].includes(call.state))
        throw new Error("call_stale");
      const access = await directAccess(tx, userId, call.threadId);
      return { peerId: access.otherUserId, state: call.state };
    });
  }
  async expireCall(callId, now = new Date()) {
    const [row] = await this.db
      .update(calls)
      .set({ state: "missed", endedAt: now, completionReason: "missed" })
      .where(
        and(
          eq(calls.id, callId),
          inArray(calls.state, ["inviting", "ringing"]),
        ),
      )
      .returning({ id: calls.id });
    return Boolean(row);
  }
  async expireUnanswered(ringSeconds, limit = 500, now = new Date()) {
    const cutoff = new Date(now.getTime() - ringSeconds * 1_000);
    const rows = await this.db
      .update(calls)
      .set({ state: "missed", endedAt: now, completionReason: "missed" })
      .where(
        and(
          eq(calls.type, "direct"),
          inArray(calls.state, ["inviting", "ringing"]),
          lt(calls.startedAt, cutoff),
          inArray(
            calls.id,
            this.db
              .select({ id: calls.id })
              .from(calls)
              .where(lt(calls.startedAt, cutoff))
              .limit(limit),
          ),
        ),
      )
      .returning({ id: calls.id });
    return rows.length;
  }
  async cleanupCalls(limit = 500, now = new Date(), dryRun = false) {
    const rows = await this.db
      .select({ id: calls.id })
      .from(calls)
      .where(lt(calls.expiresAt, now))
      .orderBy(asc(calls.expiresAt))
      .limit(limit);
    if (!dryRun && rows.length)
      await this.db.delete(calls).where(
        inArray(
          calls.id,
          rows.map((row) => row.id),
        ),
      );
    return rows.length;
  }
}
