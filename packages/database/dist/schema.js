import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, integer, bigint, } from "drizzle-orm/pg-core";
export const accountStateEnum = pgEnum("account_state", [
    "pending_verification",
    "onboarding",
    "active",
    "limited",
    "suspended",
    "deletion_pending",
    "banned",
    "deleted",
]);
export const ageCohortEnum = pgEnum("age_cohort", [
    "minor_16_17",
    "adult_18_plus",
]);
export const visibilityAudienceEnum = pgEnum("visibility_audience", [
    "everyone",
    "encounters",
    "friends",
    "only_me",
]);
export const policyTypeEnum = pgEnum("policy_type", [
    "terms",
    "privacy_policy",
    "community_guidelines",
]);
const timestamps = {
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
};
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    authSubject: uuid("auth_subject").notNull(),
    accountState: accountStateEnum("account_state")
        .notNull()
        .default("pending_verification"),
    emailVerified: boolean("email_verified").notNull().default(false),
    birthDateCiphertext: text("birth_date_ciphertext"),
    birthDateKeyVersion: text("birth_date_key_version"),
    ageCohort: ageCohortEnum("age_cohort"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
}, (table) => [
    uniqueIndex("users_auth_subject_active_uidx")
        .on(table.authSubject)
        .where(sql `${table.deletedAt} is null`),
    check("users_birth_date_encryption_complete", sql `(${table.birthDateCiphertext} is null and ${table.birthDateKeyVersion} is null and ${table.ageCohort} is null) or (${table.birthDateCiphertext} is not null and ${table.birthDateKeyVersion} is not null and ${table.ageCohort} is not null)`),
]);
export const profiles = pgTable("profiles", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    normalizedUsername: text("normalized_username").notNull(),
    displayName: text("display_name").notNull(),
    avatarObjectKey: text("avatar_object_key"),
    bio: text("bio").notNull().default(""),
    interests: jsonb("interests").$type().notNull().default([]),
    language: text("language"),
    region: text("region"),
    status: text("status").notNull().default(""),
    ...timestamps,
}, (table) => [
    uniqueIndex("profiles_normalized_username_uidx").on(table.normalizedUsername),
    check("profiles_username_length", sql `char_length(${table.username}) between 3 and 30`),
    check("profiles_normalized_username_format", sql `${table.normalizedUsername} ~ '^[a-z0-9_]{3,30}$'`),
    check("profiles_display_name_length", sql `char_length(${table.displayName}) between 1 and 80`),
    check("profiles_bio_length", sql `char_length(${table.bio}) <= 500`),
]);
export const profileFieldVisibility = pgTable("profile_field_visibility", {
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    audience: visibilityAudienceEnum("audience").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.field] })]);
export const userSettings = pgTable("user_settings", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    reducedMotion: boolean("reduced_motion").notNull().default(false),
    highContrast: boolean("high_contrast").notNull().default(false),
    locale: text("locale").notNull().default("en"),
    ...timestamps,
});
export const launchCountries = pgTable("launch_countries", {
    countryCode: text("country_code").primaryKey(),
    registrationEnabled: boolean("registration_enabled").notNull().default(false),
    matchingEnabled: boolean("matching_enabled").notNull().default(false),
    billingEnabled: boolean("billing_enabled").notNull().default(false),
    reasonCode: text("reason_code").notNull().default("not_reviewed"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
        onDelete: "set null",
    }),
    ...timestamps,
});
export const userCountryState = pgTable("user_country_state", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    registrationCountry: text("registration_country").notNull(),
    lastObservedCountry: text("last_observed_country").notNull(),
    countrySource: text("country_source").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    ...timestamps,
});
export const genderIdentityEnum = pgEnum("gender_identity", [
    "man",
    "woman",
    "nonbinary",
    "prefer_not_to_say",
]);
export const genderPreferenceEnum = pgEnum("gender_preference", [
    "everyone",
    "men",
    "women",
    "nonbinary",
]);
export const matchingPreferences = pgTable("matching_preferences", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    countryPreference: text("country_preference"),
    languagePreference: text("language_preference"),
    interestTags: jsonb("interest_tags").$type().notNull().default([]),
    genderIdentity: genderIdentityEnum("gender_identity")
        .notNull()
        .default("prefer_not_to_say"),
    genderPreference: genderPreferenceEnum("gender_preference")
        .notNull()
        .default("everyone"),
    allowPreferenceRelaxation: boolean("allow_preference_relaxation")
        .notNull()
        .default(false),
    ...timestamps,
});
export const entitlementGrants = pgTable("entitlement_grants", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    entitlementKey: text("entitlement_key").notNull(),
    source: text("source").notNull(),
    sourceReference: text("source_reference").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true })
        .notNull()
        .defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
}, (table) => [
    uniqueIndex("entitlement_grants_source_uidx").on(table.userId, table.entitlementKey, table.source, table.sourceReference),
    index("entitlement_grants_active_idx").on(table.userId, table.entitlementKey, table.validUntil),
]);
export const subscriptionPlanKeyEnum = pgEnum("subscription_plan_key", [
    "free",
    "lite",
    "loaded",
    "maxed_out",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
    "incomplete",
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "paused",
    "canceled",
]);
export const subscriptionPlans = pgTable("subscription_plans", {
    key: subscriptionPlanKeyEnum("key").primaryKey(),
    name: text("name").notNull(),
    monthlyPriceCents: integer("monthly_price_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    stripeProductId: text("stripe_product_id"),
    stripePriceId: text("stripe_price_id").unique(),
    version: integer("version").notNull().default(1),
    active: boolean("active").notNull().default(false),
    ...timestamps,
});
export const subscriptions = pgTable("subscriptions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    planKey: subscriptionPlanKeyEnum("plan_key")
        .notNull()
        .references(() => subscriptionPlans.key, { onDelete: "restrict" }),
    stripeCustomerId: text("stripe_customer_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", {
        withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    paymentGraceUntil: timestamp("payment_grace_until", { withTimezone: true }),
    lastProcessedObjectAt: timestamp("last_processed_object_at", {
        withTimezone: true,
    }).notNull(),
    lastReconciledAt: timestamp("last_reconciled_at", { withTimezone: true }),
    ...timestamps,
}, (table) => [
    index("subscriptions_reconciliation_idx").on(table.lastReconciledAt, table.status),
]);
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type").notNull(),
    objectId: text("object_id"),
    objectCreatedAt: timestamp("object_created_at", {
        withTimezone: true,
    }).notNull(),
    processingState: text("processing_state").notNull().default("processing"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const entitlementAuditLogs = pgTable("entitlement_audit_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    actorId: uuid("actor_id").references(() => users.id, {
        onDelete: "restrict",
    }),
    entitlementKey: text("entitlement_key").notNull(),
    action: text("action").notNull(),
    source: text("source").notNull(),
    sourceReference: text("source_reference").notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    purpose: text("purpose").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("entitlement_audit_user_idx").on(table.userId, table.createdAt),
]);
export const privacySettings = pgTable("privacy_settings", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    isPrivate: boolean("is_private").notNull().default(false),
    discoverableByUsername: boolean("discoverable_by_username")
        .notNull()
        .default(true),
    allowEncounterRequests: boolean("allow_encounter_requests")
        .notNull()
        .default(true),
    showPresence: boolean("show_presence").notNull().default(true),
    showRecentActivity: boolean("show_recent_activity").notNull().default(false),
    retainEncounterHistory: boolean("retain_encounter_history")
        .notNull()
        .default(true),
    ...timestamps,
});
export const termsAcceptances = pgTable("terms_acceptances", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    policyType: policyTypeEnum("policy_type").notNull(),
    policyVersion: text("policy_version").notNull(),
    source: text("source").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex("terms_acceptances_user_policy_version_uidx").on(table.userId, table.policyType, table.policyVersion),
]);
export const userSessions = pgTable("user_sessions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    authSessionId: text("auth_session_id").notNull(),
    deviceLabel: text("device_label"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex("user_sessions_user_auth_session_uidx").on(table.userId, table.authSessionId),
    index("user_sessions_user_active_idx")
        .on(table.userId)
        .where(sql `${table.revokedAt} is null`),
]);
export const privacyRequestStateEnum = pgEnum("privacy_request_state", [
    "pending",
    "processing",
    "ready",
    "canceled",
    "completed",
    "failed",
]);
export const privacyExportRequests = pgTable("privacy_export_requests", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    state: privacyRequestStateEnum("state").notNull().default("pending"),
    archiveKey: text("archive_key"),
    downloadTokenHash: text("download_token_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("privacy_exports_pending_idx").on(table.state, table.createdAt),
    index("privacy_exports_expiry_idx").on(table.expiresAt),
]);
export const deletionRequests = pgTable("deletion_requests", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    state: privacyRequestStateEnum("state").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    cancelUntil: timestamp("cancel_until", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    retentionUntil: timestamp("retention_until", {
        withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("deletion_requests_due_idx").on(table.state, table.cancelUntil),
]);
export const avatarUploadStateEnum = pgEnum("avatar_upload_state", [
    "pending",
    "processing",
    "ready",
    "failed",
    "abandoned",
    "deleted",
]);
export const avatarUploads = pgTable("avatar_uploads", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    state: avatarUploadStateEnum("state").notNull().default("pending"),
    declaredContentType: text("declared_content_type").notNull(),
    declaredByteSize: integer("declared_byte_size").notNull(),
    quarantineObjectKey: text("quarantine_object_key").notNull(),
    processedObjectKey: text("processed_object_key"),
    failureCode: text("failure_code"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    ...timestamps,
}, (table) => [
    index("avatar_uploads_cleanup_idx").on(table.state, table.expiresAt),
]);
export const encounterModeEnum = pgEnum("encounter_mode", ["text", "video"]);
export const encounterStateEnum = pgEnum("encounter_state", [
    "active",
    "ended",
]);
export const conversationRatingOutcomeEnum = pgEnum("conversation_rating_outcome", ["like", "dislike"]);
export const identityRevealSourceEnum = pgEnum("identity_reveal_source", [
    "subject_consent",
    "maxed_entitlement",
]);
export const reconnectRequestStateEnum = pgEnum("reconnect_request_state", [
    "pending",
    "accepted",
    "declined",
    "expired",
    "invalidated",
]);
export const threadTypeEnum = pgEnum("thread_type", ["random", "direct"]);
export const messageTypeEnum = pgEnum("message_type", ["random", "direct"]);
export const callTypeEnum = pgEnum("call_type", ["random", "direct"]);
export const callMediaEnum = pgEnum("call_media", ["voice", "video"]);
export const encounters = pgTable("encounters", {
    id: uuid("id").primaryKey(),
    mode: encounterModeEnum("mode").notNull(),
    state: encounterStateEnum("state").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    connectedDurationSeconds: integer("connected_duration_seconds")
        .notNull()
        .default(0),
    ratingEligibleAt: timestamp("rating_eligible_at", { withTimezone: true }),
    ratingWindowClosesAt: timestamp("rating_window_closes_at", {
        withTimezone: true,
    }),
    completionReason: text("completion_reason"),
    diagnosticsCategory: text("diagnostics_category"),
    visibleUntil: timestamp("visible_until", { withTimezone: true }).notNull(),
    ...timestamps,
}, (table) => [
    index("encounters_retention_idx").on(table.visibleUntil, table.id),
]);
export const conversationRatings = pgTable("conversation_ratings", {
    id: uuid("id").primaryKey().defaultRandom(),
    encounterId: uuid("encounter_id")
        .notNull()
        .references(() => encounters.id, { onDelete: "cascade" }),
    raterId: uuid("rater_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    outcome: conversationRatingOutcomeEnum("outcome").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex("conversation_ratings_encounter_rater_unique").on(table.encounterId, table.raterId),
    index("conversation_ratings_subject_outcome_idx").on(table.subjectId, table.outcome),
    check("conversation_ratings_not_self", sql `${table.raterId} <> ${table.subjectId}`),
]);
export const encounterIdentityReveals = pgTable("encounter_identity_reveals", {
    id: uuid("id").primaryKey().defaultRandom(),
    encounterId: uuid("encounter_id")
        .notNull()
        .references(() => encounters.id, { onDelete: "cascade" }),
    viewerId: uuid("viewer_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    source: identityRevealSourceEnum("source").notNull(),
    revealedAt: timestamp("revealed_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
    uniqueIndex("encounter_identity_reveals_pair_unique").on(table.encounterId, table.viewerId, table.subjectId),
    index("encounter_identity_reveals_access_idx").on(table.viewerId, table.encounterId, table.revokedAt),
    check("encounter_identity_reveals_not_self", sql `${table.viewerId} <> ${table.subjectId}`),
]);
export const reconnectRequests = pgTable("reconnect_requests", {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    previousEncounterId: uuid("previous_encounter_id")
        .notNull()
        .references(() => encounters.id, { onDelete: "cascade" }),
    state: reconnectRequestStateEnum("state").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
}, (table) => [
    uniqueIndex("reconnect_requests_pending_requester_uidx")
        .on(table.requesterId)
        .where(sql `${table.state} = 'pending'`),
    index("reconnect_requests_recipient_idx").on(table.recipientId, table.state, table.expiresAt),
    check("reconnect_requests_not_self", sql `${table.requesterId} <> ${table.recipientId}`),
]);
export const encounterParticipants = pgTable("encounter_participants", {
    encounterId: uuid("encounter_id")
        .notNull()
        .references(() => encounters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    result: text("result"),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    ...timestamps,
}, (table) => [
    primaryKey({ columns: [table.encounterId, table.userId] }),
    index("encounter_participants_user_idx").on(table.userId, table.encounterId),
]);
export const threads = pgTable("threads", {
    id: uuid("id").primaryKey().defaultRandom(),
    type: threadTypeEnum("type").notNull(),
    encounterId: uuid("encounter_id")
        .unique()
        .references(() => encounters.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
});
export const threadMembers = pgTable("thread_members", {
    threadId: uuid("thread_id")
        .notNull()
        .references(() => threads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    readSequence: bigint("read_sequence", { mode: "number" })
        .notNull()
        .default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [primaryKey({ columns: [table.threadId, table.userId] })]);
export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
        .notNull()
        .references(() => threads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    type: messageTypeEnum("type").notNull(),
    clientMessageId: uuid("client_message_id").notNull(),
    serverSequence: bigint("server_sequence", { mode: "number" }).notNull(),
    body: text("body"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    deletedForEveryoneAt: timestamp("deleted_for_everyone_at", {
        withTimezone: true,
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [
    uniqueIndex("messages_thread_client_uidx").on(table.threadId, table.clientMessageId),
    uniqueIndex("messages_thread_sequence_uidx").on(table.threadId, table.serverSequence),
    index("messages_expiry_idx").on(table.expiresAt, table.id),
    check("messages_body_length", sql `${table.body} is null or char_length(${table.body}) between 1 and 2000`),
]);
export const messageHiddenFor = pgTable("message_hidden_for", {
    messageId: uuid("message_id")
        .notNull()
        .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [primaryKey({ columns: [table.messageId, table.userId] })]);
export const calls = pgTable("calls", {
    id: uuid("id").primaryKey().defaultRandom(),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
        onDelete: "set null",
    }),
    threadId: uuid("thread_id").references(() => threads.id, {
        onDelete: "set null",
    }),
    type: callTypeEnum("type").notNull(),
    mode: callMediaEnum("mode").notNull(),
    state: text("state").notNull().default("inviting"),
    invitedBy: uuid("invited_by").references(() => users.id, {
        onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    completionReason: text("completion_reason"),
    diagnosticsCategory: text("diagnostics_category"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const callParticipants = pgTable("call_participants", {
    callId: uuid("call_id")
        .notNull()
        .references(() => calls.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    leftAt: timestamp("left_at", { withTimezone: true }),
    result: text("result"),
}, (table) => [primaryKey({ columns: [table.callId, table.userId] })]);
export const reportReasonEnum = pgEnum("report_reason", [
    "sexual_content",
    "harassment",
    "hate_or_threats",
    "minor_safety",
    "spam_or_scam",
    "self_harm",
    "other",
]);
export const reportStateEnum = pgEnum("report_state", [
    "submitted",
    "triaged",
    "closed",
]);
export const caseStateEnum = pgEnum("moderation_case_state", [
    "open",
    "reviewing",
    "resolved",
]);
export const casePriorityEnum = pgEnum("moderation_case_priority", [
    "standard",
    "high",
    "urgent",
]);
export const reports = pgTable("reports", {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
        onDelete: "set null",
    }),
    callId: uuid("call_id").references(() => calls.id, {
        onDelete: "set null",
    }),
    messageId: uuid("message_id").references(() => messages.id, {
        onDelete: "set null",
    }),
    reason: reportReasonEnum("reason").notNull(),
    note: text("note"),
    state: reportStateEnum("state").notNull().default("submitted"),
    clientRequestId: text("client_request_id").notNull(),
    flaggedAsSpam: boolean("flagged_as_spam").notNull().default(false),
    retentionUntil: timestamp("retention_until", {
        withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex("reports_reporter_request_uidx").on(table.reporterId, table.clientRequestId),
    index("reports_reporter_created_idx").on(table.reporterId, table.createdAt),
    check("reports_not_self", sql `${table.reporterId} <> ${table.subjectId}`),
    check("reports_note_length", sql `${table.note} is null or char_length(${table.note}) <= 1000`),
    check("reports_has_context", sql `num_nonnulls(${table.encounterId}, ${table.callId}, ${table.messageId}) >= 1`),
]);
export const moderationCases = pgTable("moderation_cases", {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
        .notNull()
        .unique()
        .references(() => reports.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    state: caseStateEnum("state").notNull().default("open"),
    priority: casePriorityEnum("priority").notNull().default("standard"),
    assignedTo: uuid("assigned_to").references(() => users.id, {
        onDelete: "set null",
    }),
    retentionUntil: timestamp("retention_until", {
        withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const reportEvidence = pgTable("report_evidence", {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id").references(() => reports.id, {
        onDelete: "cascade",
    }),
    encounterId: uuid("encounter_id").references(() => encounters.id, {
        onDelete: "set null",
    }),
    messageId: uuid("message_id").references(() => messages.id, {
        onDelete: "set null",
    }),
    excerpt: text("excerpt").notNull(),
    retentionReason: text("retention_reason").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    check("report_evidence_excerpt_length", sql `char_length(${table.excerpt}) between 1 and 500`),
]);
export const adminRoleEnum = pgEnum("admin_role", [
    "support",
    "moderator",
    "admin",
    "superadmin",
]);
export const adminRoles = pgTable("admin_roles", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    role: adminRoleEnum("role").notNull(),
    grantedBy: uuid("granted_by").references(() => users.id, {
        onDelete: "restrict",
    }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
export const adminAuditLogs = pgTable("admin_audit_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    purpose: text("purpose").notNull(),
    caseId: uuid("case_id").references(() => moderationCases.id, {
        onDelete: "restrict",
    }),
    result: text("result").notNull(),
    changeSummary: jsonb("change_summary")
        .$type()
        .notNull()
        .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("admin_audit_actor_idx").on(table.actorId, table.createdAt),
]);
export const moderationActions = pgTable("moderation_actions", {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
        .notNull()
        .references(() => moderationCases.id, { onDelete: "restrict" }),
    actorId: uuid("actor_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    summary: jsonb("summary")
        .$type()
        .notNull()
        .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const sanctionTypeEnum = pgEnum("sanction_type", [
    "warning",
    "matching_restriction",
    "contact_restriction",
    "temporary_suspension",
    "full_ban",
    "profile_removal",
    "verification_challenge",
]);
export const sanctionStateEnum = pgEnum("sanction_state", [
    "active",
    "expired",
    "reversed",
]);
export const sanctions = pgTable("sanctions", {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    caseId: uuid("case_id")
        .notNull()
        .references(() => moderationCases.id, { onDelete: "restrict" }),
    type: sanctionTypeEnum("type").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    permanent: boolean("permanent").notNull().default(false),
    reason: text("reason").notNull(),
    evidenceReferences: jsonb("evidence_references")
        .$type()
        .notNull()
        .default([]),
    actorId: uuid("actor_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    state: sanctionStateEnum("state").notNull().default("active"),
    reversedBy: uuid("reversed_by").references(() => users.id, {
        onDelete: "restrict",
    }),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversalReason: text("reversal_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("sanctions_active_subject_idx").on(table.subjectId, table.state, table.endsAt),
    check("sanctions_duration", sql `(${table.permanent} and ${table.endsAt} is null) or (not ${table.permanent})`),
]);
export const appealStateEnum = pgEnum("appeal_state", [
    "submitted",
    "reviewing",
    "upheld",
    "granted",
]);
export const appeals = pgTable("appeals", {
    id: uuid("id").primaryKey().defaultRandom(),
    sanctionId: uuid("sanction_id")
        .notNull()
        .references(() => sanctions.id, { onDelete: "restrict" }),
    appellantId: uuid("appellant_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    statement: text("statement").notNull(),
    state: appealStateEnum("state").notNull().default("submitted"),
    reviewerId: uuid("reviewer_id").references(() => users.id, {
        onDelete: "restrict",
    }),
    decisionReason: text("decision_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex("appeals_sanction_appellant_uidx").on(table.sanctionId, table.appellantId),
    check("appeals_statement_length", sql `char_length(${table.statement}) between 20 and 2000`),
]);
export const blocks = pgTable("blocks", {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerId: uuid("blocker_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    reasonCategory: text("reason_category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex("blocks_pair_uidx").on(table.blockerId, table.blockedId),
    index("blocks_blocked_idx").on(table.blockedId, table.blockerId),
    check("blocks_not_self", sql `${table.blockerId} <> ${table.blockedId}`),
]);
export const friendRequestStateEnum = pgEnum("friend_request_state", [
    "pending",
    "accepted",
    "rejected",
    "cancelled",
    "expired",
]);
export const friendshipStateEnum = pgEnum("friendship_state", [
    "active",
    "ended",
]);
export const muteScopeEnum = pgEnum("mute_scope", ["all", "messages", "calls"]);
export const friendRequests = pgTable("friend_requests", {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    sourceEncounterId: uuid("source_encounter_id").references(() => encounters.id, { onDelete: "set null" }),
    state: friendRequestStateEnum("state").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    purgeAt: timestamp("purge_at", { withTimezone: true }).notNull(),
    ...timestamps,
}, (table) => [
    uniqueIndex("friend_requests_pending_pair_uidx")
        .on(table.senderId, table.recipientId)
        .where(sql `${table.state} = 'pending'`),
    index("friend_requests_recipient_idx").on(table.recipientId, table.state, table.createdAt),
    index("friend_requests_cleanup_idx").on(table.purgeAt, table.id),
    check("friend_requests_not_self", sql `${table.senderId} <> ${table.recipientId}`),
]);
export const friendships = pgTable("friendships", {
    id: uuid("id").primaryKey().defaultRandom(),
    firstUserId: uuid("first_user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    secondUserId: uuid("second_user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    sourceEncounterId: uuid("source_encounter_id").references(() => encounters.id, { onDelete: "set null" }),
    threadId: uuid("thread_id")
        .notNull()
        .unique()
        .references(() => threads.id, { onDelete: "restrict" }),
    state: friendshipStateEnum("state").notNull().default("active"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...timestamps,
}, (table) => [
    uniqueIndex("friendships_active_pair_uidx")
        .on(table.firstUserId, table.secondUserId)
        .where(sql `${table.state} = 'active'`),
    index("friendships_second_idx").on(table.secondUserId, table.state),
    check("friendships_canonical_pair", sql `${table.firstUserId} < ${table.secondUserId}`),
]);
export const mutes = pgTable("mutes", {
    muterId: uuid("muter_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    mutedId: uuid("muted_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    scope: muteScopeEnum("scope").notNull().default("all"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.muterId, table.mutedId, table.scope] }),
    check("mutes_not_self", sql `${table.muterId} <> ${table.mutedId}`),
]);
