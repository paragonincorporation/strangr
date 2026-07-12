import { z } from "zod";
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
export declare const countryCodeSchema: z.ZodString;
export declare const launchAvailabilitySchema: z.ZodObject<{
    countryCode: z.ZodString;
    registrationEnabled: z.ZodBoolean;
    matchingEnabled: z.ZodBoolean;
    billingEnabled: z.ZodBoolean;
    reasonCode: z.ZodString;
}, z.core.$strip>;
export declare const launchCountryUpdateSchema: z.ZodObject<{
    registrationEnabled: z.ZodBoolean;
    matchingEnabled: z.ZodBoolean;
    billingEnabled: z.ZodBoolean;
    reasonCode: z.ZodString;
    purpose: z.ZodString;
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
    cooldown_active: "cooldown_active";
    age_restricted: "age_restricted";
    country_unavailable: "country_unavailable";
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
            cooldown_active: "cooldown_active";
            age_restricted: "age_restricted";
            country_unavailable: "country_unavailable";
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
    privacyVersion: z.ZodString;
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
export declare const directMessageSendSchema: z.ZodObject<{
    clientMessageId: z.ZodUUID;
    body: z.ZodString;
}, z.core.$strip>;
export declare const readCursorSchema: z.ZodObject<{
    sequence: z.ZodNumber;
}, z.core.$strip>;
export declare const messageDeleteSchema: z.ZodObject<{
    scope: z.ZodEnum<{
        everyone: "everyone";
        me: "me";
    }>;
}, z.core.$strip>;
export declare const directCallCreateSchema: z.ZodObject<{
    friendId: z.ZodUUID;
    mode: z.ZodEnum<{
        video: "video";
        voice: "voice";
    }>;
}, z.core.$strip>;
export declare const directCallActionSchema: z.ZodObject<{
    action: z.ZodEnum<{
        accept: "accept";
        reject: "reject";
        cancel: "cancel";
        end: "end";
    }>;
}, z.core.$strip>;
export declare const reportReasonSchema: z.ZodEnum<{
    harassment: "harassment";
    other: "other";
    sexual_content: "sexual_content";
    hate_or_threats: "hate_or_threats";
    minor_safety: "minor_safety";
    spam_or_scam: "spam_or_scam";
    self_harm: "self_harm";
}>;
export declare const reportCreateSchema: z.ZodObject<{
    clientRequestId: z.ZodString;
    reason: z.ZodEnum<{
        harassment: "harassment";
        other: "other";
        sexual_content: "sexual_content";
        hate_or_threats: "hate_or_threats";
        minor_safety: "minor_safety";
        spam_or_scam: "spam_or_scam";
        self_harm: "self_harm";
    }>;
    note: z.ZodOptional<z.ZodString>;
    encounterId: z.ZodOptional<z.ZodUUID>;
    callId: z.ZodOptional<z.ZodUUID>;
    messageId: z.ZodOptional<z.ZodUUID>;
    leaveAfterSubmit: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const adminRoleSchema: z.ZodEnum<{
    support: "support";
    moderator: "moderator";
    admin: "admin";
    superadmin: "superadmin";
}>;
export declare const caseFilterSchema: z.ZodObject<{
    state: z.ZodOptional<z.ZodEnum<{
        open: "open";
        reviewing: "reviewing";
        resolved: "resolved";
    }>>;
    priority: z.ZodOptional<z.ZodEnum<{
        standard: "standard";
        high: "high";
        urgent: "urgent";
    }>>;
}, z.core.$strip>;
export declare const caseAssignSchema: z.ZodObject<{
    assigneeId: z.ZodUUID;
    purpose: z.ZodString;
}, z.core.$strip>;
export declare const sanctionTypeSchema: z.ZodEnum<{
    warning: "warning";
    matching_restriction: "matching_restriction";
    contact_restriction: "contact_restriction";
    temporary_suspension: "temporary_suspension";
    full_ban: "full_ban";
    profile_removal: "profile_removal";
    verification_challenge: "verification_challenge";
}>;
export declare const sanctionCreateSchema: z.ZodObject<{
    type: z.ZodEnum<{
        warning: "warning";
        matching_restriction: "matching_restriction";
        contact_restriction: "contact_restriction";
        temporary_suspension: "temporary_suspension";
        full_ban: "full_ban";
        profile_removal: "profile_removal";
        verification_challenge: "verification_challenge";
    }>;
    permanent: z.ZodDefault<z.ZodBoolean>;
    endsAt: z.ZodOptional<z.ZodISODateTime>;
    reason: z.ZodString;
    evidenceReferences: z.ZodDefault<z.ZodArray<z.ZodUUID>>;
    purpose: z.ZodString;
}, z.core.$strip>;
export declare const sanctionReverseSchema: z.ZodObject<{
    reason: z.ZodString;
    purpose: z.ZodString;
}, z.core.$strip>;
export declare const appealCreateSchema: z.ZodObject<{
    sanctionId: z.ZodUUID;
    statement: z.ZodString;
}, z.core.$strip>;
export declare const appealReviewSchema: z.ZodObject<{
    decision: z.ZodEnum<{
        upheld: "upheld";
        granted: "granted";
    }>;
    reason: z.ZodString;
    purpose: z.ZodString;
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
export declare const conversationRatingOutcomeSchema: z.ZodEnum<{
    like: "like";
    dislike: "dislike";
}>;
export declare const conversationRatingRequestSchema: z.ZodObject<{
    outcome: z.ZodEnum<{
        like: "like";
        dislike: "dislike";
    }>;
}, z.core.$strip>;
export declare const conversationRatingResponseSchema: z.ZodObject<{
    encounterId: z.ZodUUID;
    outcome: z.ZodEnum<{
        like: "like";
        dislike: "dislike";
    }>;
    submittedAt: z.ZodISODateTime;
    resolved: z.ZodBoolean;
    peerOutcome: z.ZodNullable<z.ZodEnum<{
        like: "like";
        dislike: "dislike";
    }>>;
}, z.core.$strip>;
export declare const ratingSummarySchema: z.ZodObject<{
    totalLikes: z.ZodNumber;
    totalRatings: z.ZodNumber;
}, z.core.$strip>;
export declare const safeCallCardSchema: z.ZodObject<{
    username: z.ZodString;
    displayName: z.ZodString;
    avatarUrl: z.ZodNullable<z.ZodString>;
    country: z.ZodString;
    language: z.ZodNullable<z.ZodString>;
    interests: z.ZodArray<z.ZodString>;
    revealSource: z.ZodEnum<{
        subject_consent: "subject_consent";
        maxed_entitlement: "maxed_entitlement";
    }>;
}, z.core.$strip>;
export declare const reconnectActionSchema: z.ZodObject<{
    action: z.ZodEnum<{
        accept: "accept";
        decline: "decline";
    }>;
}, z.core.$strip>;
export declare const matchJoinRequestSchema: z.ZodObject<{
    mode: z.ZodEnum<{
        text: "text";
        video: "video";
    }>;
    allowPreferenceRelaxation: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const genderIdentitySchema: z.ZodEnum<{
    man: "man";
    woman: "woman";
    nonbinary: "nonbinary";
    prefer_not_to_say: "prefer_not_to_say";
}>;
export declare const genderPreferenceSchema: z.ZodEnum<{
    everyone: "everyone";
    nonbinary: "nonbinary";
    men: "men";
    women: "women";
}>;
export declare const matchingPreferencesSchema: z.ZodObject<{
    countryPreference: z.ZodNullable<z.ZodString>;
    languagePreference: z.ZodNullable<z.ZodString>;
    interestTags: z.ZodArray<z.ZodString>;
    genderIdentity: z.ZodEnum<{
        man: "man";
        woman: "woman";
        nonbinary: "nonbinary";
        prefer_not_to_say: "prefer_not_to_say";
    }>;
    genderPreference: z.ZodEnum<{
        everyone: "everyone";
        nonbinary: "nonbinary";
        men: "men";
        women: "women";
    }>;
    allowPreferenceRelaxation: z.ZodBoolean;
}, z.core.$strip>;
export declare const matchingPreferencesResponseSchema: z.ZodObject<{
    countryPreference: z.ZodNullable<z.ZodString>;
    languagePreference: z.ZodNullable<z.ZodString>;
    interestTags: z.ZodArray<z.ZodString>;
    genderIdentity: z.ZodEnum<{
        man: "man";
        woman: "woman";
        nonbinary: "nonbinary";
        prefer_not_to_say: "prefer_not_to_say";
    }>;
    genderPreference: z.ZodEnum<{
        everyone: "everyone";
        nonbinary: "nonbinary";
        men: "men";
        women: "women";
    }>;
    allowPreferenceRelaxation: z.ZodBoolean;
    genderFilterEntitled: z.ZodBoolean;
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
    type: z.ZodLiteral<"session.reveal_identity">;
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
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.accept">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.reject">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.cancel">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.end">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.rtc.offer">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
        sdp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.rtc.answer">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
        sdp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.rtc.ice">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
        candidate: z.ZodString;
        sdpMid: z.ZodNullable<z.ZodString>;
        sdpMLineIndex: z.ZodNullable<z.ZodNumber>;
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
            cooldown_active: "cooldown_active";
            age_restricted: "age_restricted";
            country_unavailable: "country_unavailable";
        }>;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
        connectedAt: z.ZodISODateTime;
        skipAllowedAt: z.ZodNullable<z.ZodISODateTime>;
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
    type: z.ZodLiteral<"session.timer">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        connectedAt: z.ZodISODateTime;
        connectedSeconds: z.ZodNumber;
        skipAllowedAt: z.ZodNullable<z.ZodISODateTime>;
        ratingEligibleAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"session.rating_available">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        windowClosesAt: z.ZodNullable<z.ZodISODateTime>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"session.identity_revealed">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        card: z.ZodObject<{
            username: z.ZodString;
            displayName: z.ZodString;
            avatarUrl: z.ZodNullable<z.ZodString>;
            country: z.ZodString;
            language: z.ZodNullable<z.ZodString>;
            interests: z.ZodArray<z.ZodString>;
            revealSource: z.ZodEnum<{
                subject_consent: "subject_consent";
                maxed_entitlement: "maxed_entitlement";
            }>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"session.rating_submitted">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        matchId: z.ZodUUID;
        outcome: z.ZodEnum<{
            like: "like";
            dislike: "dislike";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"session.reconnect_offered">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        requestId: z.ZodUUID;
        mode: z.ZodEnum<{
            text: "text";
            video: "video";
        }>;
        expiresAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"session.reconnect_resolved">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        requestId: z.ZodUUID;
        state: z.ZodEnum<{
            accepted: "accepted";
            declined: "declined";
            expired: "expired";
            invalidated: "invalidated";
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
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"message.created">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        threadId: z.ZodUUID;
        message: z.ZodObject<{
            id: z.ZodUUID;
            senderId: z.ZodUUID;
            clientMessageId: z.ZodUUID;
            sequence: z.ZodNumber;
            body: z.ZodString;
            sentAt: z.ZodISODateTime;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"message.deleted">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        threadId: z.ZodUUID;
        messageId: z.ZodUUID;
        deletedAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"message.read">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        threadId: z.ZodUUID;
        userId: z.ZodUUID;
        sequence: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.invite">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
        callerId: z.ZodUUID;
        mode: z.ZodEnum<{
            video: "video";
            voice: "voice";
        }>;
        expiresAt: z.ZodISODateTime;
    }, z.core.$strip>;
}, z.core.$strip>, ...z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.connecting" | "call.declined" | "call.cancelled" | "call.ended" | "call.missed" | "call.busy">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>[], z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.rtc.offer">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
        sdp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.rtc.answer">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
        sdp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    version: z.ZodLiteral<1>;
    type: z.ZodLiteral<"call.rtc.ice">;
    requestId: z.ZodString;
    payload: z.ZodObject<{
        callId: z.ZodUUID;
        candidate: z.ZodString;
        sdpMid: z.ZodNullable<z.ZodString>;
        sdpMLineIndex: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>], "type">;
export declare const reservedRealtimeNamespaces: readonly ["connection", "presence", "match", "rtc", "chat", "friend", "call", "report", "error", "session"];
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
    type: "session.reveal_identity";
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
} | {
    version: 1;
    type: "call.accept";
    requestId: string;
    payload: {
        callId: string;
    };
} | {
    version: 1;
    type: "call.reject";
    requestId: string;
    payload: {
        callId: string;
    };
} | {
    version: 1;
    type: "call.cancel";
    requestId: string;
    payload: {
        callId: string;
    };
} | {
    version: 1;
    type: "call.end";
    requestId: string;
    payload: {
        callId: string;
    };
} | {
    version: 1;
    type: "call.rtc.offer";
    requestId: string;
    payload: {
        callId: string;
        sdp: string;
    };
} | {
    version: 1;
    type: "call.rtc.answer";
    requestId: string;
    payload: {
        callId: string;
        sdp: string;
    };
} | {
    version: 1;
    type: "call.rtc.ice";
    requestId: string;
    payload: {
        callId: string;
        candidate: string;
        sdpMid: string | null;
        sdpMLineIndex: number | null;
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
export type MatchingPreferences = z.infer<typeof matchingPreferencesSchema>;
export type ConversationRatingOutcome = z.infer<typeof conversationRatingOutcomeSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type VisibilityAudience = z.infer<typeof visibilityAudienceSchema>;
