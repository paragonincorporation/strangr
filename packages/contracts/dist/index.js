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
export const countryCodeSchema = z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/);
export const launchAvailabilitySchema = z.object({
    countryCode: countryCodeSchema,
    registrationEnabled: z.boolean(),
    matchingEnabled: z.boolean(),
    billingEnabled: z.boolean(),
    reasonCode: z.string().min(2).max(80),
});
export const launchCountryUpdateSchema = launchAvailabilitySchema
    .omit({ countryCode: true })
    .extend({ purpose: z.string().trim().min(8).max(500) });
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
    "cooldown_active",
    "age_restricted",
    "country_unavailable",
    "reauthentication_required",
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
export const privacyExportRequestSchema = z.object({
    idempotencyKey: idempotencyKeySchema,
});
export const privacyDeletionRequestSchema = z.object({
    idempotencyKey: idempotencyKeySchema,
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
        privacyVersion: z.string().trim().min(1).max(64),
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
export const reportReasonSchema = z.enum([
    "sexual_content",
    "harassment",
    "hate_or_threats",
    "minor_safety",
    "spam_or_scam",
    "self_harm",
    "other",
]);
export const reportCreateSchema = z
    .object({
    clientRequestId: idempotencyKeySchema,
    reason: reportReasonSchema,
    note: z.string().trim().max(1_000).optional(),
    encounterId: internalIdSchema.optional(),
    callId: internalIdSchema.optional(),
    messageId: internalIdSchema.optional(),
    leaveAfterSubmit: z.boolean().default(false),
})
    .refine((value) => [value.encounterId, value.callId, value.messageId].filter(Boolean)
    .length === 1, "Exactly one report context is required");
export const adminRoleSchema = z.enum([
    "support",
    "moderator",
    "admin",
    "superadmin",
]);
export const caseFilterSchema = z.object({
    state: z.enum(["open", "reviewing", "resolved"]).optional(),
    priority: z.enum(["standard", "high", "urgent"]).optional(),
});
export const caseAssignSchema = z.object({
    assigneeId: internalIdSchema,
    purpose: z.string().trim().min(8).max(240),
});
export const sanctionTypeSchema = z.enum([
    "warning",
    "matching_restriction",
    "contact_restriction",
    "temporary_suspension",
    "full_ban",
    "profile_removal",
    "verification_challenge",
]);
export const sanctionCreateSchema = z
    .object({
    type: sanctionTypeSchema,
    permanent: z.boolean().default(false),
    endsAt: timestampSchema.optional(),
    reason: z.string().trim().min(10).max(1_000),
    evidenceReferences: z.array(internalIdSchema).max(20).default([]),
    purpose: z.string().trim().min(8).max(240),
})
    .refine((x) => x.permanent ||
    Boolean(x.endsAt) ||
    x.type === "warning" ||
    x.type === "profile_removal" ||
    x.type === "verification_challenge", "A temporary sanction needs an end time")
    .refine((x) => !x.permanent || x.evidenceReferences.length > 0, "Permanent sanctions require evidence");
export const sanctionReverseSchema = z.object({
    reason: z.string().trim().min(10).max(1_000),
    purpose: z.string().trim().min(8).max(240),
});
export const appealCreateSchema = z.object({
    sanctionId: internalIdSchema,
    statement: z.string().trim().min(20).max(2_000),
});
export const appealReviewSchema = z.object({
    decision: z.enum(["upheld", "granted"]),
    reason: z.string().trim().min(10).max(1_000),
    purpose: z.string().trim().min(8).max(240),
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
export const conversationRatingOutcomeSchema = z.enum(["like", "dislike"]);
export const conversationRatingRequestSchema = z.object({
    outcome: conversationRatingOutcomeSchema,
});
export const conversationRatingResponseSchema = z.object({
    encounterId: internalIdSchema,
    outcome: conversationRatingOutcomeSchema,
    submittedAt: timestampSchema,
    resolved: z.boolean(),
    peerOutcome: conversationRatingOutcomeSchema.nullable(),
});
export const ratingSummarySchema = z.object({
    totalLikes: z.number().int().nonnegative(),
    totalRatings: z.number().int().nonnegative(),
});
export const safeCallCardSchema = z.object({
    username: usernameSchema,
    displayName: z.string().trim().min(1).max(80),
    avatarUrl: z.string().nullable(),
    country: countryCodeSchema,
    language: z.string().trim().min(2).max(35).nullable(),
    interests: z.array(z.string().trim().min(1).max(40)).max(12),
    revealSource: z.enum(["subject_consent", "maxed_entitlement"]),
});
export const reconnectActionSchema = z.object({
    action: z.enum(["accept", "decline"]),
});
export const matchJoinRequestSchema = z.object({
    mode: matchModeSchema,
    allowPreferenceRelaxation: z.boolean().default(false),
});
export const genderIdentitySchema = z.enum([
    "man",
    "woman",
    "nonbinary",
    "prefer_not_to_say",
]);
export const genderPreferenceSchema = z.enum([
    "everyone",
    "men",
    "women",
    "nonbinary",
]);
export const matchingPreferencesSchema = z.object({
    countryPreference: countryCodeSchema.nullable(),
    languagePreference: z.string().trim().min(2).max(35).nullable(),
    interestTags: z.array(z.string().trim().min(1).max(40)).max(12),
    genderIdentity: genderIdentitySchema,
    genderPreference: genderPreferenceSchema,
    allowPreferenceRelaxation: z.boolean(),
});
export const matchingPreferencesResponseSchema = matchingPreferencesSchema.extend({
    genderFilterEntitled: z.boolean(),
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
export const planKeySchema = z.enum(["free", "lite", "loaded", "maxed_out"]);
export const entitlementKeySchema = z.enum([
    "matching.gender_filter",
    "presence.online_status",
    "media.premium_quality",
    "matching.reconnect",
    "profile.frames",
    "profile.animated_background",
    "profile.supporter_badge",
    "matching.priority_weight",
    "call_card.paid_override",
    "features.early_access",
    "support.direct",
]);
export const checkoutRequestSchema = z.object({
    planKey: planKeySchema.exclude(["free"]),
    idempotencyKey: idempotencyKeySchema,
});
export const manualEntitlementGrantSchema = z.object({
    userId: internalIdSchema,
    entitlementKey: entitlementKeySchema,
    validUntil: timestampSchema,
    purpose: z.string().trim().min(8).max(500),
});
export const manualEntitlementRevokeSchema = z.object({
    userId: internalIdSchema,
    sourceReference: z.string().uuid(),
    purpose: z.string().trim().min(8).max(500),
});
export const mediaQualityPolicySchema = z.object({
    tier: z.enum(["standard", "premium"]),
    width: z.number().int().positive().max(1920),
    height: z.number().int().positive().max(1080),
    frameRate: z.number().int().positive().max(60),
    maxBitrate: z.number().int().positive(),
    diagnosticsOnly: z.literal(true),
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
    details: z.record(z.string(), z.unknown()).optional(),
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
        type: z.literal("session.reveal_identity"),
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
        payload: matchIdPayloadSchema.extend({
            connectedAt: timestampSchema,
            skipAllowedAt: timestampSchema.nullable(),
        }),
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
        type: z.literal("session.timer"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema.extend({
            connectedAt: timestampSchema,
            connectedSeconds: z.number().int().nonnegative(),
            skipAllowedAt: timestampSchema.nullable(),
            ratingEligibleAt: timestampSchema,
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("session.rating_available"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema.extend({
            windowClosesAt: timestampSchema.nullable(),
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("session.quality_policy"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema.extend(mediaQualityPolicySchema.shape),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("session.entitlements_changed"),
        requestId: requestIdSchema,
        payload: z.object({ entitlements: z.array(entitlementKeySchema) }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("session.identity_revealed"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema.extend({ card: safeCallCardSchema }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("session.rating_submitted"),
        requestId: requestIdSchema,
        payload: matchIdPayloadSchema.extend({
            outcome: conversationRatingOutcomeSchema,
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("session.reconnect_offered"),
        requestId: requestIdSchema,
        payload: z.object({
            requestId: internalIdSchema,
            mode: matchModeSchema,
            expiresAt: timestampSchema,
        }),
    }),
    z.object({
        version: z.literal(PROTOCOL_VERSION),
        type: z.literal("session.reconnect_resolved"),
        requestId: requestIdSchema,
        payload: z.object({
            requestId: internalIdSchema,
            state: z.enum(["accepted", "declined", "expired", "invalidated"]),
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
    "session",
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
