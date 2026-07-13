import type { Database } from "./client.js";
export declare class CommunicationRepository {
  private readonly db;
  constructor(db: Database);
  listThreads(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    items: {
      unread: number;
      id: string;
      userId: string;
      username: string;
      displayName: string;
      readSequence: number;
      lastSequence: number;
      lastMessageAt: Date;
    }[];
    nextCursor: string | null;
  }>;
  messages(
    userId: string,
    threadId: string,
    beforeSequence?: number,
    limit?: number,
  ): Promise<{
    items: {
      body: string | null;
      id: string;
      senderId: string;
      clientMessageId: string;
      sequence: number;
      sentAt: Date;
      deletedAt: Date | null;
    }[];
    nextCursor: string | null;
  }>;
  send(
    userId: string,
    threadId: string,
    clientMessageId: string,
    body: string,
    now?: Date,
  ): Promise<{
    recipientId: string;
    id: string;
    threadId: string;
    senderId: string;
    type: "random" | "direct";
    clientMessageId: string;
    serverSequence: number;
    body: string | null;
    sentAt: Date;
    deletedForEveryoneAt: Date | null;
    expiresAt: Date | null;
  }>;
  markRead(userId: string, threadId: string, sequence: number): Promise<number>;
  deleteMessage(
    userId: string,
    messageId: string,
    everyone: boolean,
    deleteWindowMs: number,
    now?: Date,
  ): Promise<
    | {
        deletedFor: "me";
        deletedAt?: never;
      }
    | {
        deletedFor: "everyone";
        deletedAt: Date;
      }
  >;
  unreadCount(userId: string): Promise<number>;
  createCall(
    callerId: string,
    friendId: string,
    mode: "voice" | "video",
    now?: Date,
  ): Promise<{
    callerId: string;
    recipientId: string;
    mode: "video" | "voice";
    id: string;
    state: string;
    expiresAt: Date;
    startedAt: Date;
    endedAt: Date | null;
    connectedAt: Date | null;
    completionReason: string | null;
    diagnosticsCategory: string | null;
    encounterId: string | null;
    type: "random" | "direct";
    threadId: string | null;
    invitedBy: string | null;
  }>;
  callAction(
    userId: string,
    callId: string,
    action: "accept" | "reject" | "cancel" | "end",
    now?: Date,
  ): Promise<{
    callId: string;
    state: string;
    threadId: string;
    peerId: string;
  }>;
  terminateDirectCallForBlock(
    callId: string,
    firstUserId: string,
    secondUserId: string,
    now?: Date,
  ): Promise<boolean>;
  authorizeCall(
    userId: string,
    callId: string,
  ): Promise<{
    peerId: string;
    state: string;
  }>;
  expireCall(callId: string, now?: Date): Promise<boolean>;
  expireUnanswered(
    ringSeconds: number,
    limit?: number,
    now?: Date,
  ): Promise<number>;
  cleanupCalls(limit?: number, now?: Date, dryRun?: boolean): Promise<number>;
}
