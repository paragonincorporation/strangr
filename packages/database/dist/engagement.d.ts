import type { Database } from "./client.js";
export declare const RECONNECT_ENTITLEMENT = "matching.reconnect";
export declare const PAID_REVEAL_ENTITLEMENT = "call_card.paid_override";
export declare class EngagementRepository {
  private readonly db;
  private readonly entitlements;
  constructor(db: Database);
  markConnected(encounterId: string, now?: Date): Promise<void>;
  finalizeTiming(
    encounterId: string,
    now?: Date,
  ): Promise<{
    eligible: boolean;
    windowClosesAt: Date | null;
  }>;
  rating(
    encounterId: string,
    raterId: string,
    outcome: "like" | "dislike",
    now?: Date,
  ): Promise<{
    encounterId: string;
    outcome: "like" | "dislike";
    submittedAt: Date;
    resolved: boolean;
    peerOutcome: "like" | "dislike" | null;
  }>;
  ratingSummary(userId: string): Promise<{
    totalLikes: number;
    totalRatings: number;
  }>;
  ratingAnomalySummary(now?: Date): Promise<{
    windowHours: number;
    repeatedPairs: number;
    coordinatedLikePairs: number;
  }>;
  revealOwnCard(
    encounterId: string,
    subjectId: string,
    now?: Date,
  ): Promise<{
    id: string;
    source: "subject_consent" | "maxed_entitlement";
    revokedAt: Date | null;
    encounterId: string;
    subjectId: string;
    viewerId: string;
    revealedAt: Date;
  }>;
  authorizeCallCard(
    encounterId: string,
    viewerId: string,
    now?: Date,
  ): Promise<{
    subjectId: string;
    revealSource: "subject_consent" | "maxed_entitlement";
  }>;
  revokePair(first: string, second: string, now?: Date): Promise<void>;
  createReconnect(
    requesterId: string,
    previousEncounterId: string,
    now?: Date,
  ): Promise<{
    mode: "text" | "video";
    id: string;
    createdAt: Date;
    updatedAt: Date;
    state: "pending" | "accepted" | "declined" | "expired" | "invalidated";
    expiresAt: Date;
    requesterId: string;
    recipientId: string;
    previousEncounterId: string;
    resolvedAt: Date | null;
  }>;
  resolveReconnect(
    id: string,
    recipientId: string,
    action: "accept" | "decline",
    now?: Date,
  ): Promise<{
    state: string;
    mode: "text" | "video";
    createdAt: Date;
    updatedAt: Date;
    id: string;
    requesterId: string;
    recipientId: string;
    previousEncounterId: string;
    expiresAt: Date;
    resolvedAt: Date | null;
  }>;
  private peer;
  private upsertReveal;
  private revokeReveal;
  private blocked;
  private assertPairEligible;
}
