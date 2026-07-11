import { sql } from 'drizzle-orm';
import { boolean, check, index, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, integer, bigint, } from 'drizzle-orm/pg-core';
export const accountStateEnum = pgEnum('account_state', [
    'pending_verification',
    'onboarding',
    'active',
    'limited',
    'suspended',
    'deletion_pending',
    'banned',
    'deleted',
]);
export const ageCohortEnum = pgEnum('age_cohort', [
    'minor_16_17',
    'adult_18_plus',
]);
export const visibilityAudienceEnum = pgEnum('visibility_audience', [
    'everyone',
    'encounters',
    'friends',
    'only_me',
]);
export const policyTypeEnum = pgEnum('policy_type', [
    'terms',
    'community_guidelines',
]);
const timestamps = {
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
};
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    authSubject: uuid('auth_subject').notNull(),
    accountState: accountStateEnum('account_state')
        .notNull()
        .default('pending_verification'),
    emailVerified: boolean('email_verified').notNull().default(false),
    birthDateCiphertext: text('birth_date_ciphertext'),
    birthDateKeyVersion: text('birth_date_key_version'),
    ageCohort: ageCohortEnum('age_cohort'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
}, (table) => [
    uniqueIndex('users_auth_subject_active_uidx')
        .on(table.authSubject)
        .where(sql `${table.deletedAt} is null`),
    check('users_birth_date_encryption_complete', sql `(${table.birthDateCiphertext} is null and ${table.birthDateKeyVersion} is null and ${table.ageCohort} is null) or (${table.birthDateCiphertext} is not null and ${table.birthDateKeyVersion} is not null and ${table.ageCohort} is not null)`),
]);
export const profiles = pgTable('profiles', {
    userId: uuid('user_id')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    normalizedUsername: text('normalized_username').notNull(),
    displayName: text('display_name').notNull(),
    avatarObjectKey: text('avatar_object_key'),
    bio: text('bio').notNull().default(''),
    interests: jsonb('interests').$type().notNull().default([]),
    language: text('language'),
    region: text('region'),
    status: text('status').notNull().default(''),
    ...timestamps,
}, (table) => [
    uniqueIndex('profiles_normalized_username_uidx').on(table.normalizedUsername),
    check('profiles_username_length', sql `char_length(${table.username}) between 3 and 30`),
    check('profiles_normalized_username_format', sql `${table.normalizedUsername} ~ '^[a-z0-9_]{3,30}$'`),
    check('profiles_display_name_length', sql `char_length(${table.displayName}) between 1 and 80`),
    check('profiles_bio_length', sql `char_length(${table.bio}) <= 500`),
]);
export const profileFieldVisibility = pgTable('profile_field_visibility', {
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    field: text('field').notNull(),
    audience: visibilityAudienceEnum('audience').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.field] })]);
export const userSettings = pgTable('user_settings', {
    userId: uuid('user_id')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
    reducedMotion: boolean('reduced_motion').notNull().default(false),
    highContrast: boolean('high_contrast').notNull().default(false),
    locale: text('locale').notNull().default('en'),
    ...timestamps,
});
export const privacySettings = pgTable('privacy_settings', {
    userId: uuid('user_id')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
    isPrivate: boolean('is_private').notNull().default(false),
    discoverableByUsername: boolean('discoverable_by_username')
        .notNull()
        .default(true),
    allowEncounterRequests: boolean('allow_encounter_requests')
        .notNull()
        .default(true),
    showPresence: boolean('show_presence').notNull().default(true),
    showRecentActivity: boolean('show_recent_activity').notNull().default(false),
    retainEncounterHistory: boolean('retain_encounter_history')
        .notNull()
        .default(true),
    ...timestamps,
});
export const termsAcceptances = pgTable('terms_acceptances', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'restrict' }),
    policyType: policyTypeEnum('policy_type').notNull(),
    policyVersion: text('policy_version').notNull(),
    source: text('source').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex('terms_acceptances_user_policy_version_uidx').on(table.userId, table.policyType, table.policyVersion),
]);
export const userSessions = pgTable('user_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    authSessionId: text('auth_session_id').notNull(),
    deviceLabel: text('device_label'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex('user_sessions_user_auth_session_uidx').on(table.userId, table.authSessionId),
    index('user_sessions_user_active_idx')
        .on(table.userId)
        .where(sql `${table.revokedAt} is null`),
]);
export const avatarUploadStateEnum = pgEnum('avatar_upload_state', [
    'pending',
    'processing',
    'ready',
    'failed',
    'abandoned',
    'deleted',
]);
export const avatarUploads = pgTable('avatar_uploads', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    state: avatarUploadStateEnum('state').notNull().default('pending'),
    declaredContentType: text('declared_content_type').notNull(),
    declaredByteSize: integer('declared_byte_size').notNull(),
    quarantineObjectKey: text('quarantine_object_key').notNull(),
    processedObjectKey: text('processed_object_key'),
    failureCode: text('failure_code'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    ...timestamps,
}, (table) => [
    index('avatar_uploads_cleanup_idx').on(table.state, table.expiresAt),
]);
export const encounterModeEnum = pgEnum('encounter_mode', ['text', 'video']);
export const encounterStateEnum = pgEnum('encounter_state', ['active', 'ended']);
export const threadTypeEnum = pgEnum('thread_type', ['random', 'direct']);
export const messageTypeEnum = pgEnum('message_type', ['random', 'direct']);
export const callTypeEnum = pgEnum('call_type', ['random', 'direct']);
export const encounters = pgTable('encounters', {
    id: uuid('id').primaryKey(),
    mode: encounterModeEnum('mode').notNull(),
    state: encounterStateEnum('state').notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    completionReason: text('completion_reason'),
    diagnosticsCategory: text('diagnostics_category'),
    visibleUntil: timestamp('visible_until', { withTimezone: true }).notNull(),
    ...timestamps,
}, (table) => [
    index('encounters_retention_idx').on(table.visibleUntil, table.id),
]);
export const encounterParticipants = pgTable('encounter_participants', {
    encounterId: uuid('encounter_id')
        .notNull()
        .references(() => encounters.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    result: text('result'),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    reportedAt: timestamp('reported_at', { withTimezone: true }),
    ...timestamps,
}, (table) => [
    primaryKey({ columns: [table.encounterId, table.userId] }),
    index('encounter_participants_user_idx').on(table.userId, table.encounterId),
]);
export const threads = pgTable('threads', {
    id: uuid('id').primaryKey().defaultRandom(),
    type: threadTypeEnum('type').notNull(),
    encounterId: uuid('encounter_id')
        .unique()
        .references(() => encounters.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
});
export const threadMembers = pgTable('thread_members', {
    threadId: uuid('thread_id')
        .notNull()
        .references(() => threads.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [primaryKey({ columns: [table.threadId, table.userId] })]);
export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
        .notNull()
        .references(() => threads.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
        .notNull()
        .references(() => users.id, { onDelete: 'restrict' }),
    type: messageTypeEnum('type').notNull(),
    clientMessageId: uuid('client_message_id').notNull(),
    serverSequence: bigint('server_sequence', { mode: 'number' }).notNull(),
    body: text('body').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [
    uniqueIndex('messages_thread_client_uidx').on(table.threadId, table.clientMessageId),
    uniqueIndex('messages_thread_sequence_uidx').on(table.threadId, table.serverSequence),
    index('messages_expiry_idx').on(table.expiresAt, table.id),
    check('messages_body_length', sql `char_length(${table.body}) between 1 and 2000`),
]);
export const calls = pgTable('calls', {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id').references(() => encounters.id, {
        onDelete: 'set null',
    }),
    threadId: uuid('thread_id').references(() => threads.id, {
        onDelete: 'set null',
    }),
    type: callTypeEnum('type').notNull(),
    mode: encounterModeEnum('mode').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    completionReason: text('completion_reason'),
    diagnosticsCategory: text('diagnostics_category'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const callParticipants = pgTable('call_participants', {
    callId: uuid('call_id')
        .notNull()
        .references(() => calls.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    leftAt: timestamp('left_at', { withTimezone: true }),
    result: text('result'),
}, (table) => [primaryKey({ columns: [table.callId, table.userId] })]);
export const reportEvidence = pgTable('report_evidence', {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id').references(() => encounters.id, {
        onDelete: 'set null',
    }),
    messageId: uuid('message_id').references(() => messages.id, {
        onDelete: 'set null',
    }),
    excerpt: text('excerpt').notNull(),
    retentionReason: text('retention_reason').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    check('report_evidence_excerpt_length', sql `char_length(${table.excerpt}) between 1 and 500`),
]);
export const blocks = pgTable('blocks', {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    reasonCategory: text('reason_category').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    uniqueIndex('blocks_pair_uidx').on(table.blockerId, table.blockedId),
    index('blocks_blocked_idx').on(table.blockedId, table.blockerId),
    check('blocks_not_self', sql `${table.blockerId} <> ${table.blockedId}`),
]);
export const friendRequestStateEnum = pgEnum('friend_request_state', [
    'pending',
    'accepted',
    'rejected',
    'cancelled',
    'expired',
]);
export const friendshipStateEnum = pgEnum('friendship_state', [
    'active',
    'ended',
]);
export const muteScopeEnum = pgEnum('mute_scope', ['all', 'messages', 'calls']);
export const friendRequests = pgTable('friend_requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    senderId: uuid('sender_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    sourceEncounterId: uuid('source_encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    state: friendRequestStateEnum('state').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    purgeAt: timestamp('purge_at', { withTimezone: true }).notNull(),
    ...timestamps,
}, (table) => [
    uniqueIndex('friend_requests_pending_pair_uidx')
        .on(table.senderId, table.recipientId)
        .where(sql `${table.state} = 'pending'`),
    index('friend_requests_recipient_idx').on(table.recipientId, table.state, table.createdAt),
    index('friend_requests_cleanup_idx').on(table.purgeAt, table.id),
    check('friend_requests_not_self', sql `${table.senderId} <> ${table.recipientId}`),
]);
export const friendships = pgTable('friendships', {
    id: uuid('id').primaryKey().defaultRandom(),
    firstUserId: uuid('first_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    secondUserId: uuid('second_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    sourceEncounterId: uuid('source_encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    threadId: uuid('thread_id')
        .notNull()
        .unique()
        .references(() => threads.id, { onDelete: 'restrict' }),
    state: friendshipStateEnum('state').notNull().default('active'),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    ...timestamps,
}, (table) => [
    uniqueIndex('friendships_active_pair_uidx')
        .on(table.firstUserId, table.secondUserId)
        .where(sql `${table.state} = 'active'`),
    index('friendships_second_idx').on(table.secondUserId, table.state),
    check('friendships_canonical_pair', sql `${table.firstUserId} < ${table.secondUserId}`),
]);
export const mutes = pgTable('mutes', {
    muterId: uuid('muter_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    mutedId: uuid('muted_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    scope: muteScopeEnum('scope').notNull().default('all'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.muterId, table.mutedId, table.scope] }),
    check('mutes_not_self', sql `${table.muterId} <> ${table.mutedId}`),
]);
