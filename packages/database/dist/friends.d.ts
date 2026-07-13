import type { Database } from "./client.js";
export type FriendMutation = {
  state: "pending" | "friends";
  requestId?: string;
  friendshipId?: string;
};
export declare class FriendRepository {
  private readonly db;
  constructor(db: Database);
  createRequest(
    senderId: string,
    recipientId: string,
    encounterId: string,
    now?: Date,
  ): Promise<FriendMutation>;
  resolve(
    actorId: string,
    requestId: string,
    action: "accept" | "reject" | "cancel",
    now?: Date,
  ): Promise<
    | {
        state: "reject" | "cancel";
        friendshipId?: never;
      }
    | {
        state: string;
        friendshipId: string;
      }
  >;
  requests(userId: string): Promise<
    {
      id: string;
      createdAt: Date;
      expiresAt: Date;
      userId: string;
      username: string;
      displayName: string;
    }[]
  >;
  list(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    items: {
      id: string;
      user_id: string;
      username: string;
      normalized_username: string;
      display_name: string;
      show_presence: boolean;
    }[];
    nextCursor: string | null;
  }>;
  unfriend(actorId: string, friendshipId: string, now?: Date): Promise<boolean>;
  mute(
    actorId: string,
    targetId: string,
    scope: "all" | "messages" | "calls",
    expiresAt?: Date,
  ): Promise<void>;
  unmute(
    actorId: string,
    targetId: string,
    scope: "all" | "messages" | "calls",
  ): Promise<void>;
  counts(userId: string): Promise<{
    incomingRequests: number;
    unreadMessages: number;
  }>;
  presenceViewers(subjectId: string): Promise<string[]>;
  cleanup(
    batch?: number,
    now?: Date,
    dryRun?: boolean,
  ): Promise<{
    expiredRequests: number;
    purgedRequests: number;
    dryRun: boolean;
  }>;
}
