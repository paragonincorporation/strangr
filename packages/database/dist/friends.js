import { and, asc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  blocks,
  encounterParticipants,
  encounters,
  friendRequests,
  friendships,
  mutes,
  privacySettings,
  profiles,
  threadMembers,
  threads,
} from "./schema.js";
const REQUEST_PURGE_MS = 30 * 24 * 60 * 60 * 1000;
const pair = (a, b) => (a < b ? [a, b] : [b, a]);
export class FriendRepository {
  db;
  constructor(db) {
    this.db = db;
  }
  async createRequest(senderId, recipientId, encounterId, now = new Date()) {
    if (senderId === recipientId) throw new Error("self_request");
    return this.db.transaction(async (tx) => {
      const [first, second] = pair(senderId, recipientId);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${first}:${second}`}))`,
      );
      if (await relationBlocked(tx, senderId, recipientId))
        throw new Error("relationship_unavailable");
      const [eligible] = await tx
        .select({ id: encounters.id })
        .from(encounters)
        .innerJoin(
          encounterParticipants,
          eq(encounterParticipants.encounterId, encounters.id),
        )
        .where(
          and(
            eq(encounters.id, encounterId),
            gt(encounters.visibleUntil, now),
            eq(encounterParticipants.userId, senderId),
            sql`exists(select 1 from encounter_participants ep where ep.encounter_id=${encounters.id} and ep.user_id=${recipientId})`,
          ),
        )
        .limit(1);
      if (!eligible) throw new Error("encounter_unavailable");
      const [privacy] = await tx
        .select({ allowed: privacySettings.allowEncounterRequests })
        .from(privacySettings)
        .where(eq(privacySettings.userId, recipientId))
        .limit(1);
      if (!privacy?.allowed) throw new Error("requests_disabled");
      const [existingFriend] = await tx
        .select({ id: friendships.id })
        .from(friendships)
        .where(
          and(
            eq(friendships.firstUserId, first),
            eq(friendships.secondUserId, second),
            eq(friendships.state, "active"),
          ),
        )
        .limit(1);
      if (existingFriend)
        return { state: "friends", friendshipId: existingFriend.id };
      const [opposite] = await tx
        .select({ id: friendRequests.id })
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.senderId, recipientId),
            eq(friendRequests.recipientId, senderId),
            eq(friendRequests.state, "pending"),
            gt(friendRequests.expiresAt, now),
          ),
        )
        .for("update")
        .limit(1);
      if (opposite) {
        await tx
          .update(friendRequests)
          .set({ state: "accepted", resolvedAt: now, updatedAt: now })
          .where(eq(friendRequests.id, opposite.id));
        const friendship = await createFriendship(
          tx,
          first,
          second,
          encounterId,
          now,
        );
        return { state: "friends", friendshipId: friendship.id };
      }
      const expiresAt = new Date(
        Math.min(
          now.getTime() + 48 * 60 * 60 * 1000,
          (
            await tx
              .select({ until: encounters.visibleUntil })
              .from(encounters)
              .where(eq(encounters.id, encounterId))
              .limit(1)
          )[0].until.getTime(),
        ),
      );
      const [request] = await tx
        .insert(friendRequests)
        .values({
          senderId,
          recipientId,
          sourceEncounterId: encounterId,
          expiresAt,
          purgeAt: new Date(expiresAt.getTime() + REQUEST_PURGE_MS),
        })
        .onConflictDoNothing()
        .returning({ id: friendRequests.id });
      if (request) return { state: "pending", requestId: request.id };
      const [same] = await tx
        .select({ id: friendRequests.id })
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.senderId, senderId),
            eq(friendRequests.recipientId, recipientId),
            eq(friendRequests.state, "pending"),
          ),
        )
        .limit(1);
      return { state: "pending", requestId: same.id };
    });
  }
  async resolve(actorId, requestId, action, now = new Date()) {
    return this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(friendRequests)
        .where(eq(friendRequests.id, requestId))
        .for("update")
        .limit(1);
      if (!request || request.state !== "pending")
        throw new Error("request_unavailable");
      if (
        action === "cancel"
          ? request.senderId !== actorId
          : request.recipientId !== actorId
      )
        throw new Error("request_unavailable");
      if (request.expiresAt <= now) {
        await tx
          .update(friendRequests)
          .set({ state: "expired", resolvedAt: now, updatedAt: now })
          .where(eq(friendRequests.id, request.id));
        throw new Error("request_expired");
      }
      if (await relationBlocked(tx, request.senderId, request.recipientId))
        throw new Error("relationship_unavailable");
      if (action !== "accept") {
        await tx
          .update(friendRequests)
          .set({
            state: action === "reject" ? "rejected" : "cancelled",
            resolvedAt: now,
            updatedAt: now,
          })
          .where(eq(friendRequests.id, request.id));
        return { state: action };
      }
      const [first, second] = pair(request.senderId, request.recipientId);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${first}:${second}`}))`,
      );
      await tx
        .update(friendRequests)
        .set({ state: "accepted", resolvedAt: now, updatedAt: now })
        .where(eq(friendRequests.id, request.id));
      return {
        state: "friends",
        friendshipId: (
          await createFriendship(
            tx,
            first,
            second,
            request.sourceEncounterId,
            now,
          )
        ).id,
      };
    });
  }
  async requests(userId) {
    const sender = alias(profiles, "request_sender");
    return this.db
      .select({
        id: friendRequests.id,
        createdAt: friendRequests.createdAt,
        expiresAt: friendRequests.expiresAt,
        userId: sender.userId,
        username: sender.username,
        displayName: sender.displayName,
      })
      .from(friendRequests)
      .innerJoin(sender, eq(sender.userId, friendRequests.senderId))
      .where(
        and(
          eq(friendRequests.recipientId, userId),
          eq(friendRequests.state, "pending"),
          gt(friendRequests.expiresAt, new Date()),
          sql`not exists(select 1 from blocks b where (b.blocker_id=${userId} and b.blocked_id=${sender.userId}) or (b.blocker_id=${sender.userId} and b.blocked_id=${userId})`,
        ),
      )
      .orderBy(asc(friendRequests.createdAt));
  }
  async list(userId, cursor, limit = 50) {
    const after = cursor
      ? Buffer.from(cursor, "base64url").toString("utf8")
      : "";
    const rows = await this.db.execute(
      sql`select f.id, p.user_id, p.username, p.normalized_username, p.display_name, coalesce(ps.show_presence,false) show_presence from friendships f join profiles p on p.user_id=case when f.first_user_id=${userId} then f.second_user_id else f.first_user_id end left join privacy_settings ps on ps.user_id=p.user_id where f.state='active' and (${userId}=f.first_user_id or ${userId}=f.second_user_id) and p.normalized_username > ${after} and not exists(select 1 from blocks b where (b.blocker_id=${userId} and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=${userId})) order by p.normalized_username limit ${limit + 1}`,
    );
    return {
      items: rows.rows.slice(0, limit),
      nextCursor:
        rows.rows.length > limit
          ? Buffer.from(rows.rows[limit - 1].normalized_username).toString(
              "base64url",
            )
          : null,
    };
  }
  async unfriend(actorId, friendshipId, now = new Date()) {
    const result = await this.db
      .update(friendships)
      .set({ state: "ended", endedAt: now, updatedAt: now })
      .where(
        and(
          eq(friendships.id, friendshipId),
          eq(friendships.state, "active"),
          or(
            eq(friendships.firstUserId, actorId),
            eq(friendships.secondUserId, actorId),
          ),
        ),
      )
      .returning({ id: friendships.id });
    return result.length > 0;
  }
  async mute(actorId, targetId, scope, expiresAt) {
    if (actorId === targetId) throw new Error("self_mute");
    await this.db
      .insert(mutes)
      .values({
        muterId: actorId,
        mutedId: targetId,
        scope,
        ...(expiresAt ? { expiresAt } : {}),
      })
      .onConflictDoUpdate({
        target: [mutes.muterId, mutes.mutedId, mutes.scope],
        set: { expiresAt: expiresAt ?? null, updatedAt: new Date() },
      });
  }
  async unmute(actorId, targetId, scope) {
    await this.db
      .delete(mutes)
      .where(
        and(
          eq(mutes.muterId, actorId),
          eq(mutes.mutedId, targetId),
          eq(mutes.scope, scope),
        ),
      );
  }
  async counts(userId) {
    const [requests] = await this.db
      .select({ count: sql`count(*)::int` })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.recipientId, userId),
          eq(friendRequests.state, "pending"),
          gt(friendRequests.expiresAt, new Date()),
        ),
      );
    return { incomingRequests: requests?.count ?? 0, unreadMessages: 0 };
  }
  async presenceViewers(subjectId) {
    const [privacy] = await this.db
      .select({ show: privacySettings.showPresence })
      .from(privacySettings)
      .where(eq(privacySettings.userId, subjectId))
      .limit(1);
    if (!privacy?.show) return [];
    const rows = await this.db
      .select({
        first: friendships.firstUserId,
        second: friendships.secondUserId,
      })
      .from(friendships)
      .where(
        and(
          eq(friendships.state, "active"),
          or(
            eq(friendships.firstUserId, subjectId),
            eq(friendships.secondUserId, subjectId),
          ),
        ),
      );
    const candidates = rows.map((row) =>
      row.first === subjectId ? row.second : row.first,
    );
    const allowed = [];
    for (const viewer of candidates)
      if (!(await relationBlocked(this.db, subjectId, viewer)))
        allowed.push(viewer);
    return allowed;
  }
  async cleanup(batch = 500, now = new Date(), dryRun = false) {
    const expired = await this.db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.state, "pending"),
          lt(friendRequests.expiresAt, now),
        ),
      )
      .limit(batch);
    const purge = await this.db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(lt(friendRequests.purgeAt, now))
      .limit(batch);
    if (!dryRun) {
      if (expired.length)
        await this.db
          .update(friendRequests)
          .set({ state: "expired", resolvedAt: now, updatedAt: now })
          .where(
            inArray(
              friendRequests.id,
              expired.map((x) => x.id),
            ),
          );
      if (purge.length)
        await this.db.delete(friendRequests).where(
          inArray(
            friendRequests.id,
            purge.map((x) => x.id),
          ),
        );
    }
    return {
      expiredRequests: expired.length,
      purgedRequests: purge.length,
      dryRun,
    };
  }
}
async function relationBlocked(tx, first, second) {
  const rows = await tx
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, first), eq(blocks.blockedId, second)),
        and(eq(blocks.blockerId, second), eq(blocks.blockedId, first)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
async function createFriendship(tx, first, second, encounterId, now) {
  const [existing] = await tx
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.firstUserId, first),
        eq(friendships.secondUserId, second),
        eq(friendships.state, "active"),
      ),
    )
    .limit(1);
  if (existing) return existing;
  const [thread] = await tx
    .insert(threads)
    .values({ type: "direct" })
    .returning({ id: threads.id });
  if (!thread) throw new Error("thread_insert_failed");
  await tx.insert(threadMembers).values([
    { threadId: thread.id, userId: first },
    { threadId: thread.id, userId: second },
  ]);
  const [friendship] = await tx
    .insert(friendships)
    .values({
      firstUserId: first,
      secondUserId: second,
      sourceEncounterId: encounterId,
      threadId: thread.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: friendships.id });
  if (!friendship) throw new Error("friendship_insert_failed");
  return friendship;
}
