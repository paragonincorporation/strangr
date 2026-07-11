import { z } from 'zod';
export declare const PROTOCOL_VERSION: 1;
export declare const MAX_REALTIME_MESSAGE_BYTES = 16384;
export declare const internalIdSchema: z.ZodUUID;
export declare const requestIdSchema: z.ZodString;
export declare const idempotencyKeySchema: z.ZodString;
export declare const timestampSchema: z.ZodISODateTime;
export declare const cursorSchema: z.ZodString;
export declare const cursorPageSchema: z.ZodObject<{
    cursor: z.ZodNullable<z.ZodString>;
    hasMore: z.ZodBoolean;
}, z.core.$strip>;
export declare const errorCodeSchema: z.ZodEnum<{
    bad_request: "bad_request";
    unauthenticated: "unauthenticated";
    forbidden: "forbidden";
    not_found: "not_found";
    conflict: "conflict";
    rate_limited: "rate_limited";
    unsupported_protocol: "unsupported_protocol";
    unknown_command: "unknown_command";
    payload_too_large: "payload_too_large";
    internal_error: "internal_error";
    email_unverified: "email_unverified";
    onboarding_required: "onboarding_required";
    account_limited: "account_limited";
    account_suspended: "account_suspended";
    account_banned: "account_banned";
    deletion_pending: "deletion_pending";
    ticket_invalid: "ticket_invalid";
    not_in_match: "not_in_match";
    match_stale: "match_stale";
    already_queued: "already_queued";
}>;
export declare const errorEnvelopeSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodEnum<{
            bad_request: "bad_request";
            unauthenticated: "unauthenticated";
            forbidden: "forbidden";
            not_found: "not_found";
            conflict: "conflict";
            rate_limited: "rate_limited";
            unsupported_protocol: "unsupported_protocol";
            unknown_command: "unknown_command";
            payload_too_large: "payload_too_large";
            internal_error: "internal_error";
            email_unverified: "email_unverified";
            onboarding_required: "onboarding_required";
            account_limited: "account_limited";
            account_suspended: "account_suspended";
            account_banned: "account_banned";
            deletion_pending: "deletion_pending";
            ticket_invalid: "ticket_invalid";
            not_in_match: "not_in_match";
            match_stale: "match_stale";
            already_queued: "already_queued";
        }>;
        message: z.ZodString;
        requestId: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const accountStateSchema: z.ZodEnum<{
    deletion_pending: "deletion_pending";
    pending_verification: "pending_verification";
    onboarding: "onboarding";
    active: "active";
    limited: "limited";
    suspended: "suspended";
    banned: "banned";
    deleted: "deleted";
}>;
export declare const ageCohortSchema: z.ZodEnum<{
    minor_16_17: "minor_16_17";
    adult_18_plus: "adult_18_plus";
}>;
export declare const visibilityAudienceSchema: z.ZodEnum<{
    everyone: "everyone";
    encounters: "encounters";
    friends: "friends";
    only_me: "only_me";
}>;
export declare const profileFieldSchema: z.ZodEnum<{
    avatar: "avatar";
    bio: "bio";
    age_band: "age_band";
    interests: "interests";
    language: "language";
    region: "region";
    online_state: "online_state";
    recent_activity: "recent_activity";
}>;
export declare const usernameSchema: z.ZodString;
export declare const normalizedUsernameSchema: z.ZodString;
export declare const healthResponseSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    dependencies: z.ZodOptional<z.ZodObject<{
        postgres: z.ZodEnum<{
            up: "up";
            down: "down";
            "not-configured": "not-configured";
        }>;
        redis: z.ZodEnum<{
            up: "up";
            down: "down";
            "not-configured": "not-configured";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const accountSchema: z.ZodObject<{
    id: z.ZodUUID;
    state: z.ZodEnum<{
        deletion_pending: "deletion_pending";
        pending_verification: "pending_verification";
        onboarding: "onboarding";
        active: "active";
        limited: "limited";
        suspended: "suspended";
        banned: "banned";
        deleted: "deleted";
    }>;
    cohort: z.ZodNullable<z.ZodEnum<{
        minor_16_17: "minor_16_17";
        adult_18_plus: "adult_18_plus";
    }>>;
    emailVerified: z.ZodBoolean;
    createdAt: z.ZodISODateTime;
}, z.core.$strip>;
export declare const profileSchema: z.ZodObject<{
    username: z.ZodString;
    displayName: z.ZodString;
    avatarUrl: z.ZodNullable<z.ZodURL>;
    bio: z.ZodString;
    interests: z.ZodArray<z.ZodString>;
    language: z.ZodNullable<z.ZodString>;
    region: z.ZodNullable<z.ZodString>;
    isPrivate: z.ZodBoolean;
    status: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const onboardingRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    step: z.ZodLiteral<"birth_date">;
    birthDate: z.ZodISODate;
}, z.core.$strip>, z.ZodObject<{
    step: z.ZodLiteral<"policies">;
    termsVersion: z.ZodString;
    guidelinesVersion: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    step: z.ZodLiteral<"profile">;
    username: z.ZodString;
    displayName: z.ZodString;
    isPrivate: z.ZodBoolean;
}, z.core.$strip>, z.ZodObject<{
    step: z.ZodLiteral<"preferences">;
    discoverableByUsername: z.ZodBoolean;
    allowEncounterRequests: z.ZodBoolean;
    showPresence: z.ZodBoolean;
    showRecentActivity: z.ZodBoolean;
    retainEncounterHistory: z.ZodBoolean;
    reducedMotion: z.ZodBoolean;
    highContrast: z.ZodBoolean;
}, z.core.$strip>], "step">;
export declare const profilePatchRequestSchema: z.ZodObject<{
    bio: z.ZodOptional<z.ZodString>;
    interests: z.ZodOptional<z.ZodArray<z.ZodString>>;
    language: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    region: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    displayName: z.ZodOptional<z.ZodString>;
    isPrivate: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodDefault<z.ZodString>>;
}, z.core.$strip>;
export declare const visibilityPatchRequestSchema: z.ZodObject<{
    fields: z.ZodRecord<z.ZodEnum<{
        avatar: "avatar";
        bio: "bio";
        age_band: "age_band";
        interests: "interests";
        language: "language";
        region: "region";
        online_state: "online_state";
        recent_activity: "recent_activity";
    }>, z.ZodEnum<{
        everyone: "everyone";
        encounters: "encounters";
        friends: "friends";
        only_me: "only_me";
    }>>;
}, z.core.$strip>;
export declare const sessionSchema: z.ZodObject<{
    id: z.ZodUUID;
    deviceLabel: z.ZodNullable<z.ZodString>;
    lastSeenAt: z.ZodISODateTime;
    revokedAt: z.ZodNullable<z.ZodISODateTime>;
}, z.core.$strip>;
export declare const realtimeTicketResponseSchema: z.ZodObject<{
    ticket: z.ZodString;
    expiresAt: z.ZodISODateTime;
}, z.core.$strip>;
export declare const matchModeSchema: z.ZodEnum<{
    text: "text";
    video: "video";
}>;
export declare const blockReasonSchema: z.ZodEnum<{
    safety: "safety";
    harassment: "harassment";
    spam: "spam";
    other: "other";
}>;
export declare const blockCreateRequestSchema: z.ZodObject<{
    userId: z.ZodUUID;
    reasonCategory: z.ZodEnum<{
        safety: "safety";
        harassment: "harassment";
        spam: "spam";
        other: "other";
    }>;
}, z.core.$strip>;
export declare const friendRequestCreateSchema: z.ZodObject<{
    userId: z.ZodUUID;
    encounterId: z.ZodUUID;
}, z.core.$strip>;
export declare const friendRequestActionSchema: z.ZodObject<{
    action: z.ZodEnum<{
        accept: "accept";
        reject: "reject";
        cancel: "cancel";
    }>;
}, z.core.$strip>;
export declare const muteRequestSchema: z.ZodObject<{
    scope: z.ZodDefault<z.ZodEnum<{
        all: "all";
        messages: "messages";
        calls: "calls";
    }>>;
    expiresAt: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strip>;
export declare const encounterSchema: z.ZodObject<{
    id: z.ZodUUID;
    mode: z.ZodEnum<{
        text: "text";
        video: "video";
    }>;
    startedAt: z.ZodISODateTime;
    endedAt: z.ZodNullable<z.ZodISODateTime>;
    otherUser: z.ZodObject<{
        id: z.ZodUUID;
        username: z.ZodString;
        displayName: z.ZodString;
        avatarAvailable: z.ZodBoolean;
    }, z.core.$strip>;
    friendshipState: z.ZodLiteral<"none">;
    requestState: z.ZodLiteral<"none">;
    hidden: z.ZodBoolean;
    reported: z.ZodBoolean;
    blocked: z.ZodBoolean;
}, z.core.$strip>;
export declare const encounterListResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        mode: z.ZodEnum<{
            text: "text";
            video: "video";
        }>;
        startedAt: z.ZodISODateTime;
        endedAt: z.ZodNullable<z.ZodISODateTime>;
        otherUser: z.ZodObject<{
            id: z.ZodUUID;
            username: z.ZodString;
            displayName: z.ZodString;
            avatarAvailable: z.ZodBoolean;
        }, z.core.$strip>;
        friendshipState: z.ZodLiteral<"none">;
        requestState: z.ZodLiteral<"none">;
        hidden: z.ZodBoolean;
        reported: z.ZodBoolean;
        blocked: z.ZodBoolean;
    }, z.core.$strip>>;
    nextCursor: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const matchJoinRequestSchema: z.ZodObject<{
    mode: z.ZodEnum<{
        text: "text";
        video: "video";
    }>;
    allowPreferenceRelaxation: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const matchJoinResponseSchema: z.ZodObject<{
    state: z.ZodEnum<{
        queued: "queued";
        matched: "matched";
    }>;
    mode: z.ZodEnum<{
        text: "text";
        video: "video";
    }>;
    queuedAt: z.ZodISODateTime;
}, z.core.$strip>;
export declare const rtcCredentialsResponseSchema: z.ZodObject<{
    iceServers: z.ZodArray<z.ZodObject<{
        urls: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
        username: z.ZodOptional<z.ZodString>;
        credential: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    expiresAt: z.ZodISODateTime;
}, z.core.$strip>;
export declare const meResponseSchema: z.ZodObject<{
    account: z.ZodObject<{
        id: z.ZodUUID;
        state: z.ZodEnum<{
            deletion_pending: "deletion_pending";
            pending_verification: "pending_verification";
            onboarding: "onboarding";
            active: "active";
            limited: "limited";
            suspended: "suspended";
            banned: "banned";
            deleted: "deleted";
        }>;
        cohort: z.ZodNullable<z.ZodEnum<{
            minor_16_17: "minor_16_17";
            adult_18_plus: "adult_18_plus";
        }>>;
        emailVerified: z.ZodBoolean;
        createdAt: z.ZodISODateTime;
    }, z.core.$strip>;
    profile: z.ZodNullable<z.ZodObject<{
        username: z.ZodString;
        displayName: z.ZodString;
        avatarUrl: z.ZodNullable<z.ZodURL>;
        bio: z.ZodString;
        interests: z.ZodArray<z.ZodString>;
        language: z.ZodNullable<z.ZodString>;
        region: z.ZodNullable<z.ZodString>;
        isPrivate: z.ZodBoolean;
        status: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    onboardingSteps: z.ZodArray<z.ZodEnum<{
        birth_date: "birth_date";
        policies: "policies";
        profile: "profile";
        preferences: "preferences";
    }>>;
}, z.core.$strip>;
export declare const profileProjectionSchema: z.ZodObject<{
    username: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
    displayName: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodURL>>;
    bio: z.ZodOptional<z.ZodString>;
    interests: z.ZodOptional<z.ZodArray<z.ZodString>>;
    language: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    region: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isPrivate: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodDefault<z.ZodString>>;
}, z.core.$strip>;
export declare const avatarUploadInitRequestSchema: z.ZodObject<{
    byteSize: z.ZodNumber;
    contentType: z.ZodEnum<{
        "image/jpeg": "image/jpeg";
        "image/png": "image/png";
        "image/webp": "image/webp";
    }>;
}, z.core.$strip>;
export declare const avatarUploadInitResponseSchema: z.ZodObject<{
    uploadId: z.ZodUUID;
    uploadUrl: z.ZodString;
    expiresAt: z.ZodISODateTime;
}, z.core.$strip>;
export declare const avatarUploadFinalizeRequestSchema: z.ZodObject<{
    uploadId: z.ZodUUID;
}, z.core.$strip>;
export declare const avatarResponseSchema: z.ZodObject<{
    avatarUrl: z.ZodString;
}, z.core.$strip>;
export declare const clientRealtimeEnvelopeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"connection.ping">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        sentAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"match.join">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        mode: z.ZodEnum<{
            text: "text";
            video: "video";
        }>;
        allowPreferenceRelaxation: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"match.ack">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"match.next">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"match.leave">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"rtc.offer">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        sdp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"rtc.answer">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        sdp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"rtc.ice">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        candidate: z.ZodString;
        sdpMid: z.ZodNullable<z.ZodString>;
        sdpMLineIndex: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"rtc.failed">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"chat.send">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        clientMessageId: z.ZodString;
        text: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>], "type">;
export declare const serverRealtimeEnvelopeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"presence.changed">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        userId: z.ZodUUID;
        online: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"connection.ready">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        protocolVersion: z.ZodLiteral<1>;
        connectionId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"connection.pong">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        sentAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"error">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        code: z.ZodEnum<{
            bad_request: "bad_request";
            unauthenticated: "unauthenticated";
            forbidden: "forbidden";
            not_found: "not_found";
            conflict: "conflict";
            rate_limited: "rate_limited";
            unsupported_protocol: "unsupported_protocol";
            unknown_command: "unknown_command";
            payload_too_large: "payload_too_large";
            internal_error: "internal_error";
            email_unverified: "email_unverified";
            onboarding_required: "onboarding_required";
            account_limited: "account_limited";
            account_suspended: "account_suspended";
            account_banned: "account_banned";
            deletion_pending: "deletion_pending";
            ticket_invalid: "ticket_invalid";
            not_in_match: "not_in_match";
            match_stale: "match_stale";
            already_queued: "already_queued";
        }>;
        message: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"match.queued">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        mode: z.ZodEnum<{
            text: "text";
            video: "video";
        }>;
        queuedAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"match.found">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        mode: z.ZodEnum<{
            text: "text";
            video: "video";
        }>;
        peerId: z.ZodUUID;
        initiator: z.ZodBoolean;
        expiresAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"match.connected">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"match.ended">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        reason: z.ZodEnum<{
            blocked: "blocked";
            left: "left";
            next: "next";
            peer_left: "peer_left";
            ack_timeout: "ack_timeout";
            disconnected: "disconnected";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodEnum<{
        "rtc.offer": "rtc.offer";
        "rtc.answer": "rtc.answer";
    }>;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        sdp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"rtc.ice">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        candidate: z.ZodString;
        sdpMid: z.ZodNullable<z.ZodString>;
        sdpMLineIndex: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"rtc.failed">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"chat.message">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        sequence: z.ZodNumber;
        senderId: z.ZodUUID;
        clientMessageId: z.ZodString;
        text: z.ZodString;
        sentAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"chat.ack">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        clientMessageId: z.ZodString;
        sequence: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>], "type">;
export declare const reservedRealtimeNamespaces: readonly ["connection", "presence", "match", "rtc", "chat", "friend", "call", "report", "error"];
export declare function parseClientRealtimeMessage(input: string): z.ZodSafeParseSuccess<{
    version: 1;
    type: "connection.ping";
    requestId: string;
    payload: {
        sentAt: string;
    };
} | {
    version: 1;
    type: "match.join";
    requestId: string;
    payload: {
        mode: "text" | "video";
        allowPreferenceRelaxation: boolean;
    };
} | {
    version: 1;
    type: "match.ack";
    requestId: string;
    payload: {
        matchId: string;
    };
} | {
    version: 1;
    type: "match.next";
    requestId: string;
    payload: {
        matchId: string;
    };
} | {
    version: 1;
    type: "match.leave";
    requestId: string;
    payload: {
        matchId: string;
    };
} | {
    version: 1;
    type: "rtc.offer";
    requestId: string;
    payload: {
        matchId: string;
        sdp: string;
    };
} | {
    version: 1;
    type: "rtc.answer";
    requestId: string;
    payload: {
        matchId: string;
        sdp: string;
    };
} | {
    version: 1;
    type: "rtc.ice";
    requestId: string;
    payload: {
        matchId: string;
        candidate: string;
        sdpMid: string | null;
        sdpMLineIndex: number | null;
    };
} | {
    version: 1;
    type: "rtc.failed";
    requestId: string;
    payload: {
        matchId: string;
        reason: string;
    };
} | {
    version: 1;
    type: "chat.send";
    requestId: string;
    payload: {
        matchId: string;
        clientMessageId: string;
        text: string;
    };
}> | {
    success: false;
    error: "payload_too_large";
} | {
    success: false;
    error: "unknown_or_invalid_command";
} | {
    success: false;
    error: "malformed_json";
};
export type Account = z.infer<typeof accountSchema>;
export type AccountState = z.infer<typeof accountStateSchema>;
export type AgeCohort = z.infer<typeof ageCohortSchema>;
export type ClientRealtimeEnvelope = z.infer<typeof clientRealtimeEnvelopeSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;
export type MatchMode = z.infer<typeof matchModeSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type VisibilityAudience = z.infer<typeof visibilityAudienceSchema>;
