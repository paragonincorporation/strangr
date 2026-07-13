import type { Database } from "./client.js";
import { reports, sanctions } from "./schema.js";
export type AdminRole = "support" | "moderator" | "admin" | "superadmin";
export type ModerationFeature =
  "matching" | "messages" | "requests" | "calls" | "profile" | "realtime";
export declare class ModerationRepository {
  private readonly db;
  constructor(db: Database);
  createReport(
    reporterId: string,
    input: {
      clientRequestId: string;
      reason: typeof reports.$inferInsert.reason;
      note?: string | undefined;
      encounterId?: string | undefined;
      callId?: string | undefined;
      messageId?: string | undefined;
      leaveAfterSubmit: boolean;
    },
    now?: Date,
  ): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    state: "submitted" | "triaged" | "closed";
    retentionUntil: Date;
    encounterId: string | null;
    subjectId: string;
    messageId: string | null;
    callId: string | null;
    reporterId: string;
    reason:
      | "sexual_content"
      | "harassment"
      | "hate_or_threats"
      | "minor_safety"
      | "spam_or_scam"
      | "self_harm"
      | "other";
    note: string | null;
    clientRequestId: string;
    flaggedAsSpam: boolean;
  }>;
  myReports(userId: string): Promise<
    {
      id: string;
      reason:
        | "sexual_content"
        | "harassment"
        | "hate_or_threats"
        | "minor_safety"
        | "spam_or_scam"
        | "self_harm"
        | "other";
      state: "submitted" | "triaged" | "closed";
      createdAt: Date;
    }[]
  >;
  role(
    userId: string,
  ): Promise<"support" | "moderator" | "admin" | "superadmin" | null>;
  requireRole(
    userId: string,
    minimum: AdminRole,
  ): Promise<"support" | "moderator" | "admin" | "superadmin">;
  queue(
    actorId: string,
    purpose: string,
    filters?: {
      state?: "open" | "reviewing" | "resolved" | undefined;
      priority?: "standard" | "high" | "urgent" | undefined;
    },
  ): Promise<
    {
      escalationDueAt: Date;
      escalationOverdue: boolean;
      id: string;
      reportId: string;
      state: "open" | "reviewing" | "resolved";
      priority: "standard" | "high" | "urgent";
      assignedTo: string | null;
      reason:
        | "sexual_content"
        | "harassment"
        | "hate_or_threats"
        | "minor_safety"
        | "spam_or_scam"
        | "self_harm"
        | "other";
      createdAt: Date;
    }[]
  >;
  caseDetail(
    actorId: string,
    caseId: string,
    purpose: string,
    revealEvidence?: boolean,
  ): Promise<{
    evidence: {
      id: string;
      excerpt: string;
      retentionReason: string;
      expiresAt: Date;
    }[];
    id: string;
    reportId: string;
    subjectId: string;
    state: "open" | "reviewing" | "resolved";
    priority: "standard" | "high" | "urgent";
    assignedTo: string | null;
    reason:
      | "sexual_content"
      | "harassment"
      | "hate_or_threats"
      | "minor_safety"
      | "spam_or_scam"
      | "self_harm"
      | "other";
    note: string | null;
    createdAt: Date;
  }>;
  assign(
    actorId: string,
    caseId: string,
    assigneeId: string,
    purpose: string,
  ): Promise<{
    id: string;
    reportId: string;
    subjectId: string;
    state: "open" | "reviewing" | "resolved";
    priority: "standard" | "high" | "urgent";
    assignedTo: string | null;
    retentionUntil: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
  applySanction(
    actorId: string,
    caseId: string,
    input: {
      type: typeof sanctions.$inferInsert.type;
      permanent: boolean;
      endsAt?: Date | undefined;
      reason: string;
      evidenceReferences: string[];
    },
    purpose: string,
  ): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    actorId: string;
    state: "active" | "expired" | "reversed";
    subjectId: string;
    type:
      | "warning"
      | "matching_restriction"
      | "contact_restriction"
      | "temporary_suspension"
      | "full_ban"
      | "profile_removal"
      | "verification_challenge";
    reason: string;
    caseId: string;
    startsAt: Date;
    endsAt: Date | null;
    permanent: boolean;
    evidenceReferences: string[];
    reversedBy: string | null;
    reversedAt: Date | null;
    reversalReason: string | null;
  }>;
  reverseSanction(
    actorId: string,
    sanctionId: string,
    reason: string,
    purpose: string,
  ): Promise<{
    id: string;
    subjectId: string;
    caseId: string;
    type:
      | "warning"
      | "matching_restriction"
      | "contact_restriction"
      | "temporary_suspension"
      | "full_ban"
      | "profile_removal"
      | "verification_challenge";
    startsAt: Date;
    endsAt: Date | null;
    permanent: boolean;
    reason: string;
    evidenceReferences: string[];
    actorId: string;
    state: "active" | "expired" | "reversed";
    reversedBy: string | null;
    reversedAt: Date | null;
    reversalReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  activeSanctions(
    userId: string,
    now?: Date,
  ): Promise<
    {
      id: string;
      subjectId: string;
      caseId: string;
      type:
        | "warning"
        | "matching_restriction"
        | "contact_restriction"
        | "temporary_suspension"
        | "full_ban"
        | "profile_removal"
        | "verification_challenge";
      startsAt: Date;
      endsAt: Date | null;
      permanent: boolean;
      reason: string;
      evidenceReferences: string[];
      actorId: string;
      state: "active" | "expired" | "reversed";
      reversedBy: string | null;
      reversedAt: Date | null;
      reversalReason: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >;
  restriction(
    userId: string,
    feature: ModerationFeature,
  ): Promise<"account_suspended" | "account_limited" | null>;
  submitAppeal(
    userId: string,
    sanctionId: string,
    statement: string,
  ): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    state: "submitted" | "reviewing" | "upheld" | "granted";
    sanctionId: string;
    appellantId: string;
    statement: string;
    reviewerId: string | null;
    decisionReason: string | null;
  }>;
  mySanctions(userId: string): Promise<
    {
      id: string;
      type:
        | "warning"
        | "matching_restriction"
        | "contact_restriction"
        | "temporary_suspension"
        | "full_ban"
        | "profile_removal"
        | "verification_challenge";
      startsAt: Date;
      endsAt: Date | null;
      permanent: boolean;
      reason: string;
      state: "active" | "expired" | "reversed";
    }[]
  >;
  appealsQueue(
    actorId: string,
    purpose: string,
  ): Promise<
    {
      id: string;
      sanctionId: string;
      state: "submitted" | "reviewing" | "upheld" | "granted";
      createdAt: Date;
    }[]
  >;
  reviewAppeal(
    actorId: string,
    appealId: string,
    decision: "upheld" | "granted",
    reason: string,
    purpose: string,
  ): Promise<{
    id: string;
    sanctionId: string;
    appellantId: string;
    statement: string;
    state: "submitted" | "reviewing" | "upheld" | "granted";
    reviewerId: string | null;
    decisionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  expire(now?: Date): Promise<
    {
      id: string;
      subjectId: string;
    }[]
  >;
}
