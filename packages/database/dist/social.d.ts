import type { MatchMode } from "@paramingle/contracts";
import type { Database } from "./client.js";
export declare class BlockRepository {
  private readonly database;
  constructor(database: Database);
  hasEitherDirection(first: string, second: string): Promise<boolean>;
  create(
    blockerId: string,
    blockedId: string,
    reasonCategory: string,
  ): Promise<{
    id: string;
    createdAt: Date;
  }>;
  remove(blockerId: string, blockedId: string): Promise<void>;
  blocksUsername(viewerId: string, username: string): Promise<boolean>;
}
export declare class EncounterRepository {
  private readonly database;
  constructor(database: Database);
  start(
    id: string,
    mode: MatchMode,
    participantIds: [string, string],
    now?: Date,
  ): Promise<void>;
  connected(id: string, now?: Date): Promise<void>;
  end(
    id: string,
    reason: string,
    actorId: string,
    diagnostic?: string,
    now?: Date,
  ): Promise<void>;
  addRandomMessage(
    encounterId: string,
    senderId: string,
    clientMessageId: string,
    sequence: number,
    body: string,
    sentAt?: Date,
  ): Promise<{
    id: string;
    body: string | null;
  }>;
  list(
    userId: string,
    cursor: string | undefined,
    limit: number,
    now?: Date,
  ): Promise<{
    items: {
      id: string;
      mode: "text" | "video";
      startedAt: Date;
      endedAt: Date | null;
      otherUser: {
        id: string;
        username: string;
        displayName: string;
        avatarAvailable: boolean;
      };
      friendshipState: "none";
      requestState: "none";
      hidden: boolean;
      reported: boolean;
      blocked: boolean;
    }[];
    nextCursor: string | null;
  }>;
  hide(userId: string, encounterId: string): Promise<boolean>;
  preserveEvidence(
    encounterId: string,
    messageId: string,
    reason: string,
    expiresAt: Date,
  ): Promise<import("pg").QueryResult<never>>;
  cleanupExpired(
    batchSize?: number,
    now?: Date,
    dryRun?: boolean,
  ): Promise<{
    expiredMessages: number;
    expiredEncounters: number;
    dryRun: boolean;
    lagSeconds: number;
  }>;
}
