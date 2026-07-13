import { and, asc, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import {
  adminAuditLogs,
  adminRoles,
  appeals,
  callParticipants,
  calls,
  encounterParticipants,
  encounters,
  messages,
  moderationActions,
  moderationCases,
  reportEvidence,
  reports,
  sanctions,
  threadMembers,
} from "./schema.js";
const roleRank = {
  support: 1,
  moderator: 2,
  admin: 3,
  superadmin: 4,
};
const RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;
const ESCALATION_MINUTES = { standard: 24 * 60, high: 60, urgent: 15 };
export class ModerationRepository {
  db;
  constructor(db) {
    this.db = db;
  }
  async createReport(reporterId, input, now = new Date()) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(reports)
        .where(
          and(
            eq(reports.reporterId, reporterId),
            eq(reports.clientRequestId, input.clientRequestId),
          ),
        )
        .limit(1);
      if (existing) return existing;
      let subjectId;
      let excerpt;
      if (input.messageId) {
        const [row] = await tx
          .select({
            senderId: messages.senderId,
            body: messages.body,
            encounterId: encounters.id,
          })
          .from(messages)
          .innerJoin(
            threadMembers,
            and(
              eq(threadMembers.threadId, messages.threadId),
              eq(threadMembers.userId, reporterId),
            ),
          )
          .leftJoin(
            encounters,
            eq(encounters.id, input.encounterId ?? sql`null`),
          )
          .where(eq(messages.id, input.messageId))
          .limit(1);
        if (!row || row.senderId === reporterId)
          throw new Error("report_context_unavailable");
        subjectId = row.senderId;
        excerpt = row.body?.slice(0, 500);
      } else if (input.encounterId) {
        const rows = await tx
          .select({ userId: encounterParticipants.userId })
          .from(encounterParticipants)
          .where(eq(encounterParticipants.encounterId, input.encounterId));
        if (!rows.some((x) => x.userId === reporterId) || rows.length !== 2)
          throw new Error("report_context_unavailable");
        subjectId = rows.find((x) => x.userId !== reporterId).userId;
      } else if (input.callId) {
        const rows = await tx
          .select({ userId: callParticipants.userId })
          .from(callParticipants)
          .where(eq(callParticipants.callId, input.callId));
        if (!rows.some((x) => x.userId === reporterId) || rows.length !== 2)
          throw new Error("report_context_unavailable");
        subjectId = rows.find((x) => x.userId !== reporterId).userId;
      }
      if (!subjectId) throw new Error("report_context_unavailable");
      const retentionUntil = new Date(now.getTime() + RETENTION_MS);
      const recent = await tx
        .select({ count: sql`count(*)::int` })
        .from(reports)
        .where(
          and(
            eq(reports.reporterId, reporterId),
            gt(reports.createdAt, new Date(now.getTime() - 60 * 60_000)),
          ),
        );
      const [created] = await tx
        .insert(reports)
        .values({
          reporterId,
          subjectId,
          encounterId: input.encounterId,
          callId: input.callId,
          messageId: input.messageId,
          reason: input.reason,
          note: input.note?.normalize("NFC").trim() || null,
          clientRequestId: input.clientRequestId,
          flaggedAsSpam: (recent[0]?.count ?? 0) >= 10,
          retentionUntil,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      const priority =
        input.reason === "minor_safety" || input.reason === "self_harm"
          ? "urgent"
          : input.reason === "hate_or_threats"
            ? "high"
            : "standard";
      await tx
        .insert(moderationCases)
        .values({ reportId: created.id, subjectId, priority, retentionUntil });
      if (excerpt)
        await tx.insert(reportEvidence).values({
          reportId: created.id,
          encounterId: input.encounterId,
          messageId: input.messageId,
          excerpt,
          retentionReason: "reported_message_excerpt",
          expiresAt: retentionUntil,
        });
      await tx
        .update(encounterParticipants)
        .set({ reportedAt: now })
        .where(
          and(
            eq(encounterParticipants.userId, reporterId),
            input.encounterId
              ? eq(encounterParticipants.encounterId, input.encounterId)
              : sql`false`,
          ),
        );
      if (input.leaveAfterSubmit && input.encounterId)
        await tx
          .update(encounters)
          .set({
            state: "ended",
            endedAt: now,
            completionReason: "reported_and_left",
            updatedAt: now,
          })
          .where(eq(encounters.id, input.encounterId));
      if (input.leaveAfterSubmit && input.callId)
        await tx
          .update(calls)
          .set({
            state: "ended",
            endedAt: now,
            completionReason: "reported_and_left",
          })
          .where(eq(calls.id, input.callId));
      return created;
    });
  }
  async myReports(userId) {
    return this.db
      .select({
        id: reports.id,
        reason: reports.reason,
        state: reports.state,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.reporterId, userId))
      .orderBy(desc(reports.createdAt))
      .limit(100);
  }
  async role(userId) {
    const [row] = await this.db
      .select({ role: adminRoles.role })
      .from(adminRoles)
      .where(and(eq(adminRoles.userId, userId), isNull(adminRoles.revokedAt)))
      .limit(1);
    return row?.role ?? null;
  }
  async requireRole(userId, minimum) {
    const role = await this.role(userId);
    if (!role || roleRank[role] < roleRank[minimum])
      throw new Error("admin_forbidden");
    return role;
  }
  async queue(actorId, purpose, filters = {}) {
    await this.requireRole(actorId, "support");
    return this.db.transaction(async (tx) => {
      const items = await tx
        .select({
          id: moderationCases.id,
          reportId: moderationCases.reportId,
          state: moderationCases.state,
          priority: moderationCases.priority,
          assignedTo: moderationCases.assignedTo,
          reason: reports.reason,
          createdAt: moderationCases.createdAt,
        })
        .from(moderationCases)
        .innerJoin(reports, eq(reports.id, moderationCases.reportId))
        .where(
          and(
            filters.state
              ? eq(moderationCases.state, filters.state)
              : undefined,
            filters.priority
              ? eq(moderationCases.priority, filters.priority)
              : undefined,
          ),
        )
        .orderBy(
          sql`case ${moderationCases.priority} when 'urgent' then 0 when 'high' then 1 else 2 end`,
          asc(moderationCases.createdAt),
        )
        .limit(100);
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: "case.queue.read",
        targetType: "case_queue",
        targetId: actorId,
        purpose,
        result: "success",
        changeSummary: { count: items.length },
      });
      return items.map((item) => ({
        ...item,
        escalationDueAt: new Date(
          item.createdAt.getTime() + ESCALATION_MINUTES[item.priority] * 60_000,
        ),
        escalationOverdue:
          Date.now() >
          item.createdAt.getTime() + ESCALATION_MINUTES[item.priority] * 60_000,
      }));
    });
  }
  async caseDetail(actorId, caseId, purpose, revealEvidence = false) {
    await this.requireRole(actorId, revealEvidence ? "moderator" : "support");
    return this.db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          id: moderationCases.id,
          reportId: reports.id,
          subjectId: moderationCases.subjectId,
          state: moderationCases.state,
          priority: moderationCases.priority,
          assignedTo: moderationCases.assignedTo,
          reason: reports.reason,
          note: reports.note,
          createdAt: reports.createdAt,
        })
        .from(moderationCases)
        .innerJoin(reports, eq(reports.id, moderationCases.reportId))
        .where(eq(moderationCases.id, caseId))
        .limit(1);
      if (!item) throw new Error("case_not_found");
      const evidence = revealEvidence
        ? await tx
            .select({
              id: reportEvidence.id,
              excerpt: reportEvidence.excerpt,
              retentionReason: reportEvidence.retentionReason,
              expiresAt: reportEvidence.expiresAt,
            })
            .from(reportEvidence)
            .where(eq(reportEvidence.reportId, item.reportId))
        : [];
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: revealEvidence ? "case.evidence.reveal" : "case.read",
        targetType: "moderation_case",
        targetId: caseId,
        caseId,
        purpose,
        result: "success",
        changeSummary: { evidenceRevealed: revealEvidence },
      });
      return { ...item, evidence };
    });
  }
  async assign(actorId, caseId, assigneeId, purpose) {
    await this.requireRole(actorId, "moderator");
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(moderationCases)
        .set({
          assignedTo: assigneeId,
          state: "reviewing",
          updatedAt: new Date(),
        })
        .where(eq(moderationCases.id, caseId))
        .returning();
      if (!row) throw new Error("case_not_found");
      await tx.insert(moderationActions).values({
        caseId,
        actorId,
        action: "case.assigned",
        summary: { assigneeId },
      });
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: "case.assign",
        targetType: "moderation_case",
        targetId: caseId,
        caseId,
        purpose,
        result: "success",
        changeSummary: { assigneeId },
      });
      return row;
    });
  }
  async applySanction(actorId, caseId, input, purpose) {
    const highRisk =
      input.permanent ||
      input.type === "full_ban" ||
      input.type === "temporary_suspension";
    await this.requireRole(actorId, highRisk ? "admin" : "moderator");
    if (input.permanent && input.evidenceReferences.length === 0)
      throw new Error("evidence_required");
    return this.db.transaction(async (tx) => {
      const [item] = await tx
        .select({ subjectId: moderationCases.subjectId })
        .from(moderationCases)
        .where(eq(moderationCases.id, caseId))
        .limit(1);
      if (!item) throw new Error("case_not_found");
      const [row] = await tx
        .insert(sanctions)
        .values({
          subjectId: item.subjectId,
          caseId,
          actorId,
          type: input.type,
          permanent: input.permanent,
          endsAt: input.permanent ? null : input.endsAt,
          reason: input.reason,
          evidenceReferences: input.evidenceReferences,
        })
        .returning();
      await tx.insert(moderationActions).values({
        caseId,
        actorId,
        action: "sanction.applied",
        summary: {
          sanctionId: row.id,
          type: input.type,
          permanent: input.permanent,
        },
      });
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: "sanction.apply",
        targetType: "sanction",
        targetId: row.id,
        caseId,
        purpose,
        result: "success",
        changeSummary: { type: input.type, permanent: input.permanent },
      });
      return row;
    });
  }
  async reverseSanction(actorId, sanctionId, reason, purpose) {
    await this.requireRole(actorId, "admin");
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(sanctions)
        .set({
          state: "reversed",
          reversedBy: actorId,
          reversedAt: new Date(),
          reversalReason: reason,
          updatedAt: new Date(),
        })
        .where(and(eq(sanctions.id, sanctionId), eq(sanctions.state, "active")))
        .returning();
      if (!row) throw new Error("sanction_not_found");
      await tx.insert(moderationActions).values({
        caseId: row.caseId,
        actorId,
        action: "sanction.reversed",
        summary: { sanctionId },
      });
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: "sanction.reverse",
        targetType: "sanction",
        targetId: sanctionId,
        caseId: row.caseId,
        purpose,
        result: "success",
        changeSummary: { reasonCode: "reviewed_reversal" },
      });
      return row;
    });
  }
  async activeSanctions(userId, now = new Date()) {
    return this.db
      .select()
      .from(sanctions)
      .where(
        and(
          eq(sanctions.subjectId, userId),
          eq(sanctions.state, "active"),
          lt(sanctions.startsAt, now),
          or(eq(sanctions.permanent, true), gt(sanctions.endsAt, now)),
        ),
      );
  }
  async restriction(userId, feature) {
    const active = await this.activeSanctions(userId);
    const types = new Set(active.map((x) => x.type));
    if (types.has("full_ban") || types.has("temporary_suspension"))
      return "account_suspended";
    if (feature === "matching" && types.has("matching_restriction"))
      return "account_limited";
    if (
      ["messages", "requests", "calls"].includes(feature) &&
      types.has("contact_restriction")
    )
      return "account_limited";
    if (feature === "profile" && types.has("profile_removal"))
      return "account_limited";
    if (types.has("verification_challenge") && feature !== "profile")
      return "account_limited";
    return null;
  }
  async submitAppeal(userId, sanctionId, statement) {
    const [sanction] = await this.db
      .select({ id: sanctions.id })
      .from(sanctions)
      .where(and(eq(sanctions.id, sanctionId), eq(sanctions.subjectId, userId)))
      .limit(1);
    if (!sanction) throw new Error("sanction_not_found");
    const [row] = await this.db
      .insert(appeals)
      .values({
        sanctionId,
        appellantId: userId,
        statement: statement.normalize("NFC").trim(),
      })
      .onConflictDoNothing()
      .returning();
    if (!row) throw new Error("appeal_exists");
    return row;
  }
  async mySanctions(userId) {
    return this.db
      .select({
        id: sanctions.id,
        type: sanctions.type,
        startsAt: sanctions.startsAt,
        endsAt: sanctions.endsAt,
        permanent: sanctions.permanent,
        reason: sanctions.reason,
        state: sanctions.state,
      })
      .from(sanctions)
      .where(eq(sanctions.subjectId, userId))
      .orderBy(desc(sanctions.createdAt));
  }
  async appealsQueue(actorId, purpose) {
    await this.requireRole(actorId, "moderator");
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: appeals.id,
          sanctionId: appeals.sanctionId,
          state: appeals.state,
          createdAt: appeals.createdAt,
        })
        .from(appeals)
        .orderBy(desc(appeals.createdAt))
        .limit(100);
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: "appeal.queue.read",
        targetType: "appeal_queue",
        targetId: actorId,
        purpose,
        result: "success",
        changeSummary: { count: rows.length },
      });
      return rows;
    });
  }
  async reviewAppeal(actorId, appealId, decision, reason, purpose) {
    await this.requireRole(actorId, "moderator");
    return this.db.transaction(async (tx) => {
      const [appeal] = await tx
        .select({
          sanctionId: appeals.sanctionId,
          sanctionActor: sanctions.actorId,
          caseId: sanctions.caseId,
        })
        .from(appeals)
        .innerJoin(sanctions, eq(sanctions.id, appeals.sanctionId))
        .where(eq(appeals.id, appealId))
        .limit(1);
      if (!appeal || appeal.sanctionActor === actorId)
        throw new Error("separate_reviewer_required");
      const [row] = await tx
        .update(appeals)
        .set({
          state: decision,
          reviewerId: actorId,
          decisionReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(appeals.id, appealId))
        .returning();
      if (decision === "granted")
        await tx
          .update(sanctions)
          .set({
            state: "reversed",
            reversedBy: actorId,
            reversedAt: new Date(),
            reversalReason: "appeal_granted",
            updatedAt: new Date(),
          })
          .where(eq(sanctions.id, appeal.sanctionId));
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: "appeal.review",
        targetType: "appeal",
        targetId: appealId,
        caseId: appeal.caseId,
        purpose,
        result: "success",
        changeSummary: { decision },
      });
      return row;
    });
  }
  async expire(now = new Date()) {
    const rows = await this.db
      .update(sanctions)
      .set({ state: "expired", updatedAt: now })
      .where(
        and(
          eq(sanctions.state, "active"),
          eq(sanctions.permanent, false),
          lt(sanctions.endsAt, now),
        ),
      )
      .returning({ id: sanctions.id, subjectId: sanctions.subjectId });
    return rows;
  }
}
