import { z } from "zod";
export const PROTOCOL_VERSION = 1;
export const MAX_REALTIME_MESSAGE_BYTES = 16_384;
export const internalIdSchema = z.uuid();
export const requestIdSchema = z
    .string()
    .trim()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/);
export const idempotencyKeySchema = z
    .string()
    .trim()
    .min(16)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/);
export const timestampSchema = z.iso.datetime({ offset: true });
export const cursorSchema = z.string().trim().min(1).max(512);
export const cursorPageSchema = z.object({
    cursor: cursorSchema.nullable(),
    hasMore: z.boolean(),
});
export const errorCodeSchema = z.enum([
    "bad_request",
    "unauthenticated",
    "forbidden",
    "not_found",
    "conflict",
    "rate_limited",
    "unsupported_protocol",
    "unknown_command",
    "payload_too_large",
    "internal_error",
    "email_unverified",
    "onboarding_required",
    "account_limited",
    "account_suspended",
    "account_banned",
    "deletion_pending",
    "ticket_invalid",
    "not_in_match",
    "match_stale",
    "already_queued",
]);
export const errorEnvelopeSchema = z.object({
    error: z.object({
        code: errorCodeSchema,
        message: z.string().min(1).max(500),
        requestId: requestIdSchema,
        details: z.record(z.string(), z.unknown()).optional(),
    }),
});
export const accountStateSchema = z.enum([
    "pending_verification",
    "onboarding",
    "active",
    "limited",
    "suspended",
    "deletion_pending",
    "banned",
    "deleted",
]);
export const ageCohortSchema = z.enum(["minor_16_17", "adult_18_plus"]);
export const visibilityAudienceSchema = z.enum([
    "everyone",
    "encounters",
    "friends",
    "only_me",
]);
export const profileFieldSchema = z.enum([
    "avatar",
    "bio",
    "age_band",
    "interests",
    "language",
    "region",
    "online_state",
    "recent_activity",
]);
export const usernameSchema = z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_]+$/);
export const normalizedUsernameSchema = z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/);
export const healthResponseSchema = z.object({
    ok: z.boolean(),
    dependencies: z
        .object({
        postgres: z.enum(["up", "down", "not-configured"]),
        redis: z.enum(["up", "down", "not-configured"]),
    })
        .optional(),
});
export const accountSchema = z.object({
    id: internalIdSchema,
    state: accountStateSchema,
    cohort: ageCohortSchema.nullable(),
    emailVerified: z.boolean(),
    createdAt: timestampSchema,
});
export const profileSchema = z.object({
    username: usernameSchema,
    displayName: z.string().trim().min(1).max(80),
    avatarUrl: z.url().nullable(),
    bio: z.string().max(500),
    interests: z.array(z.string().trim().min(1).max(40)).max(12),
    language: z.string().trim().min(2).max(35).nullable(),
    region: z.string().trim().min(2).max(80).nullable(),
    isPrivate: z.boolean(),
    status: z.string().trim().max(80).default(""),
});
export const onboardingRequestSchema = z.discriminatedUnion("step", [
    z.object({ step: z.literal("birth_date"), birthDate: z.iso.date() }),
    z.object({
        step: z.literal("policies"),
        termsVersion: z.string().trim().min(1).max(64),
        guidelinesVersion: z.string().trim().min(1).max(64),
    }),
    z.object({
        step: z.literal("profile"),
        username: usernameSchema,
        displayName: z.string().trim().min(1).max(80),
        isPrivate: z.boolean(),
    }),
    z.object({
        step: z.literal("preferences"),
        discoverableByUsername: z.boolean(),
        allowEncounterRequests: z.boolean(),
        showPresence: z.boolean(),
        showRecentActivity: z.boolean(),
        retainEncounterHistory: z.boolean(),
        reducedMotion: z.boolean(),
        highContrast: z.boolean(),
    }),
]);
export const profilePatchRequestSchema = profileSchema
    .pick({
    displayName: true,
    bio: true,
    interests: true,
    language: true,
    region: true,
    isPrivate: true,
    status: true,
})
    .partial()
    .refine((value) => Object.keys(value).length > 0, "At least one profile field is required");
export const visibilityPatchRequestSchema = z.object({
    fields: z.record(profileFieldSchema, visibilityAudienceSchema),
});
export const sessionSchema = z.object({
    id: internalIdSchema,
    deviceLabel: z.string().trim().min(1).max(120).nullable(),
    lastSeenAt: timestampSchema,
    revokedAt: timestampSchema.nullable(),
});
export const realtimeTicketResponseSchema = z.object({
    ticket: z.string().min(32).max(256),
    expiresAt: timestampSchema,
});
export const matchModeSchema = z.enum(["text", "video"]);
export const blockReasonSchema = z.enum([
    "safety",
    "harassment",
    "spam",
    "other",
]);
export const blockCreateRequestSchema = z.object({
    userId: internalIdSchema,
    reasonCategory: blockReasonSchema,
});
export const friendRequestCreateSchema = z.object({
    userId: internalIdSchema,
    encounterId: internalIdSchema,
});
export const friendRequestActionSchema = z.object({
    action: z.enum(["accept", "reject", "cancel"]),
});
export const muteRequestSchema = z.object({
    scope: z.enum(["all", "messages", "calls"]).default("all"),
    expiresAt: timestampSchema.optional(),
});
export const directMessageSendSchema = z.object({
    clientMessageId: internalIdSchema,
    body: z.string().trim().min(1).max(2_000),
});
export const readCursorSchema = z.object({
    sequence: z.number().int().nonnegative(),
});
export const messageDeleteSchema = z.object({
    scope: z.enum(["me", "everyone"]),
});
export const directCallCreateSchema = z.object({
    friendId: internalIdSchema,
    mode: z.enum(["voice", "video"]),
});
export const directCallActionSchema = z.object({
    action: z.enum(["accept", "reject", "cancel", "end"]),
});
export const encounterSchema = z.object({
    id: internalIdSchema,
    mode: matchModeSchema,
    startedAt: timestampSchema,
    endedAt: timestampSchema.nullable(),
    otherUser: z.object({
        id: internalIdSchema,
        username: z.string(),
        displayName: z.string(),
        avatarAvailable: z.boolean(),
    }),
    friendshipState: z.literal("none"),
    requestState: z.literal("none"),
    hidden: z.boolean(),
    reported: z.boolean(),
    blocked: z.boolean(),
});
export const encounterListResponseSchema = z.object({
    items: z.array(encounterSchema),
    nextCursor: cursorSchema.nullable(),
});
export const matchJoinRequestSchema = z.object({
    mode: matchModeSchema,
    allowPreferenceRelaxation: z.boolean().default(false),
});
export const matchJoinResponseSchema = z.object({
    state: z.enum(["queued", "matched"]),
    mode: matchModeSchema,
    queuedAt: timestampSchema,
});
export const rtcCredentialsResponseSchema = z.object({
    iceServers: z.array(z.object({
        urls: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
        username: z.string().optional(),
        credential: z.string().optional(),
    })),
    expiresAt: timestampSchema,
});
export const meResponseSchema = z.object({
    account: accountSchema,
    profile: profileSchema.nullable(),
    onboardingSteps: z.array(z.enum(["birth_date", "policies", "profile", "preferences"])),
});
export const profileProjectionSchema = profileSchema
    .partial()
    .required({ username: true, displayName: true });
export const avatarUploadInitRequestSchema = z.object({
    byteSize: z
        .number()
        .int()
        .positive()
        .max(5 * 1024 * 1024),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export const avatarUploadInitResponseSchema = z.object({
    uploadId: internalIdSchema,
    uploadUrl: z.string().min(1),
    expiresAt: timestampSchema,
});
export const avatarUploadFinalizeRequestSchema = z.object({
    uploadId: internalIdSchema,
});
export const avatarResponseSchema = z.object({ avatarUrl: z.string().min(1) });
const connectionReadyPayloadSchema = z.object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    connectionId: internalIdSchema,
});
const connectionPingPayloadSchema = z.object({ sentAt: timestampSchema });
const errorPayloadSchema = z.object({
    code: errorCodeSchema,
    message: z.string().min(1).max(500),
});
const matchIdPayloadSchema = z.object({ matchId: internalIdSchema });
const matchJoinPayloadSchema = matchJoinRequestSchema;
const rtcDescriptionPayloadSchema = matchIdPayloadSchema.extend({
    sdp: z.string().min(1).max(64_000),
});
const rtcIcePayloadSchema = matchIdPayloadSchema.extend({
    candidate: z.string().max(4_096),
    sdpMid: z.string().max(256).nullable(),
    sdpMLineIndex: z.number().int().min(0).max(256).nullable(),
});
const chatSendPayloadSchema = matchIdPayloadSchema.extend({
    clientMessageId: requestIdSchema,
    text: z.string().trim().min(1).max(2_000),
});
const directCallIdPayloadSchema = z.object({ callId: internalIdSchema });
const directRtcDescriptionPayloadSchema = directCallIdPayloadSchema.extend({
    sdp: z.string().min(1).max(64_000),
});
const directRtcIcePayloadSchema = directCallIdPayloadSchema.extend({
    candidate: z.string().max(4_096),
    sdpMid: z.string().max(256).nullable(),
    sdpMLineIndex: z.number().int().min(0).max(256).nullable(),
});
export const clientRealtimeEnvelopeSchema = z.discriminatedUnion("type", [
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("connection.ping"),
        requestId: requestIdSchema,
        payload: connectionPingPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("match.join"),
        requestId: requestIdSchema,
        payload: matchJoinPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("match.ack"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("match.next"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("match.leave"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("rtc.offer"),
        requestId: requestIdSchema,
        payload: rtcDescriptionPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("rtc.answer"),
        requestId: requestIdSchema,
        payload: rtcDescriptionPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("rtc.ice"),
        requestId: requestIdSchema,
        payload: rtcIcePayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("rtc.failed"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema.extend({ reason: z.string().max(120) }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("chat.send"),
        requestId: requestIdSchema,
        payload: chatSendPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.accept"),
        requestId: requestIdSchema,
        payload: directCallIdPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.reject"),
        requestId: requestIdSchema,
        payload: directCallIdPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.cancel"),
        requestId: requestIdSchema,
        payload: directCallIdPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.end"),
        requestId: requestIdSchema,
        payload: directCallIdPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.rtc.offer"),
        requestId: requestIdSchema,
        payload: directRtcDescriptionPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.rtc.answer"),
        requestId: requestIdSchema,
        payload: directRtcDescriptionPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.rtc.ice"),
        requestId: requestIdSchema,
        payload: directRtcIcePayloadSchema,
    }),
]);
export const serverRealtimeEnvelopeSchema = z.discriminatedUnion("type", [
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("presence.changed"),
        requestId: requestIdSchema,
        payload: z.object({ userId: internalIdSchema, online: z.boolean() }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("connection.ready"),
        requestId: requestIdSchema,
        payload: connectionReadyPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("connection.pong"),
        requestId: requestIdSchema,
        payload: connectionPingPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("error"),
        requestId: requestIdSchema,
        payload: errorPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("match.queued"),
        requestId: requestIdSchema,
        payload: z.object({ mode: matchModeSchema, queuedAt: timestampSchema }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("match.found"),
        requestId: requestIdSchema,
        payload: z.object({
            matchId: internalIdSchema,
            mode: matchModeSchema,
            peerId: internalIdSchema,
            initiator: z.boolean(),
            expiresAt: timestampSchema,
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("match.connected"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("match.ended"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema.extend({
            reason: z.enum([
                "left",
                "next",
                "peer_left",
                "ack_timeout",
                "disconnected",
                "blocked",
            ]),
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.enum(["rtc.offer", "rtc.answer"]),
        requestId: requestIdSchema,
        payload: rtcDescriptionPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("rtc.ice"),
        requestId: requestIdSchema,
        payload: rtcIcePayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("rtc.failed"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema.extend({ reason: z.string().max(120) }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("chat.message"),
        requestId: requestIdSchema,
        payload: z.object({
            matchId: internalIdSchema,
            sequence: z.number().int().positive(),
            senderId: internalIdSchema,
            clientMessageId: requestIdSchema,
            text: z.string().max(2_000),
            sentAt: timestampSchema,
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("chat.ack"),
        requestId: requestIdSchema,
        payload: z.object({
            matchId: internalIdSchema,
            clientMessageId: requestIdSchema,
            sequence: z.number().int().positive(),
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("message.created"),
        requestId: requestIdSchema,
        payload: z.object({
            threadId: internalIdSchema,
            message: z.object({
                id: internalIdSchema,
                senderId: internalIdSchema,
                clientMessageId: internalIdSchema,
                sequence: z.number().int().positive(),
                body: z.string().max(2_000),
                sentAt: timestampSchema,
            }),
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("message.deleted"),
        requestId: requestIdSchema,
        payload: z.object({
            threadId: internalIdSchema,
            messageId: internalIdSchema,
            deletedAt: timestampSchema,
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("message.read"),
        requestId: requestIdSchema,
        payload: z.object({
            threadId: internalIdSchema,
            userId: internalIdSchema,
            sequence: z.number().int().nonnegative(),
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.invite"),
        requestId: requestIdSchema,
        payload: z.object({
            callId: internalIdSchema,
            callerId: internalIdSchema,
            mode: z.enum(["voice", "video"]),
            expiresAt: timestampSchema,
        }),
    }),
    ...[
        "call.connecting",
        "call.declined",
        "call.cancelled",
        "call.ended",
        "call.missed",
        "call.busy",
    ].map((type) => z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal(type),
        requestId: requestIdSchema,
        payload: z.object({ callId: internalIdSchema }),
    })),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.rtc.offer"),
        requestId: requestIdSchema,
        payload: directRtcDescriptionPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.rtc.answer"),
        requestId: requestIdSchema,
        payload: directRtcDescriptionPayloadSchema,
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("call.rtc.ice"),
        requestId: requestIdSchema,
        payload: directRtcIcePayloadSchema,
    }),
]);
export const reservedRealtimeNamespaces = [
    "connection",
    "presence",
    "match",
    "rtc",
    "chat",
    "friend",
    "call",
    "report",
    "error",
];
function utf8ByteLength(input) {
    let bytes = 0;
    for (const character of input) {
        const codePoint = character.codePointAt(0) ?? 0;
        bytes +=
            codePoint <= 0x7f
                ? 1
                : codePoint <= 0x7ff
                    ? 2
                    : codePoint <= 0xffff
                        ? 3
                        : 4;
    }
    return bytes;
}
export function parseClientRealtimeMessage(input) {
    const bytes = utf8ByteLength(input);
    if (bytes > MAX_REALTIME_MESSAGE_BYTES)
        return { success: false, error: "payload_too_large" };
    try {
        const decoded = JSON.parse(input);
        const parsed = clientRealtimeEnvelopeSchema.safeParse(decoded);
        return parsed.success
            ? parsed
            : {
                success: false,
                error: "unknown_or_invalid_command",
            };
    }
    catch {
        return { success: false, error: "malformed_json" };
    }
}
