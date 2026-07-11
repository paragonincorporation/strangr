import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
} from 'drizzle-orm/pg-core'

export const accountStateEnum = pgEnum('account_state', [
  'pending_verification',
  'onboarding',
  'active',
  'limited',
  'suspended',
  'deletion_pending',
  'banned',
  'deleted',
])
export const ageCohortEnum = pgEnum('age_cohort', ['minor_16_17', 'adult_18_plus'])
export const visibilityAudienceEnum = pgEnum('visibility_audience', [
  'everyone',
  'encounters',
  'friends',
  'only_me',
])
export const policyTypeEnum = pgEnum('policy_type', ['terms', 'community_guidelines'])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authSubject: uuid('auth_subject').notNull(),
    accountState: accountStateEnum('account_state').notNull().default('pending_verification'),
    emailVerified: boolean('email_verified').notNull().default(false),
    birthDateCiphertext: text('birth_date_ciphertext'),
    birthDateKeyVersion: text('birth_date_key_version'),
    ageCohort: ageCohortEnum('age_cohort'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_auth_subject_active_uidx')
      .on(table.authSubject)
      .where(sql`${table.deletedAt} is null`),
    check(
      'users_birth_date_encryption_complete',
      sql`(${table.birthDateCiphertext} is null and ${table.birthDateKeyVersion} is null and ${table.ageCohort} is null) or (${table.birthDateCiphertext} is not null and ${table.birthDateKeyVersion} is not null and ${table.ageCohort} is not null)`,
    ),
  ],
)

export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    normalizedUsername: text('normalized_username').notNull(),
    displayName: text('display_name').notNull(),
    avatarObjectKey: text('avatar_object_key'),
    bio: text('bio').notNull().default(''),
    interests: jsonb('interests').$type<string[]>().notNull().default([]),
    language: text('language'),
    region: text('region'),
    status: text('status').notNull().default(''),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('profiles_normalized_username_uidx').on(table.normalizedUsername),
    check('profiles_username_length', sql`char_length(${table.username}) between 3 and 30`),
    check(
      'profiles_normalized_username_format',
      sql`${table.normalizedUsername} ~ '^[a-z0-9_]{3,30}$'`,
    ),
    check('profiles_display_name_length', sql`char_length(${table.displayName}) between 1 and 80`),
    check('profiles_bio_length', sql`char_length(${table.bio}) <= 500`),
  ],
)

export const profileFieldVisibility = pgTable(
  'profile_field_visibility',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    field: text('field').notNull(),
    audience: visibilityAudienceEnum('audience').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.field] })],
)

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  reducedMotion: boolean('reduced_motion').notNull().default(false),
  highContrast: boolean('high_contrast').notNull().default(false),
  locale: text('locale').notNull().default('en'),
  ...timestamps,
})

export const privacySettings = pgTable('privacy_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  isPrivate: boolean('is_private').notNull().default(false),
  discoverableByUsername: boolean('discoverable_by_username').notNull().default(true),
  allowEncounterRequests: boolean('allow_encounter_requests').notNull().default(true),
  showPresence: boolean('show_presence').notNull().default(true),
  showRecentActivity: boolean('show_recent_activity').notNull().default(false),
  retainEncounterHistory: boolean('retain_encounter_history').notNull().default(true),
  ...timestamps,
})

export const termsAcceptances = pgTable(
  'terms_acceptances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    policyType: policyTypeEnum('policy_type').notNull(),
    policyVersion: text('policy_version').notNull(),
    source: text('source').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('terms_acceptances_user_policy_version_uidx').on(
      table.userId,
      table.policyType,
      table.policyVersion,
    ),
  ],
)

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    authSessionId: text('auth_session_id').notNull(),
    deviceLabel: text('device_label'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_sessions_user_auth_session_uidx').on(table.userId, table.authSessionId),
    index('user_sessions_user_active_idx')
      .on(table.userId)
      .where(sql`${table.revokedAt} is null`),
  ],
)

export const avatarUploadStateEnum = pgEnum('avatar_upload_state', [
  'pending',
  'processing',
  'ready',
  'failed',
  'abandoned',
  'deleted',
])

export const avatarUploads = pgTable(
  'avatar_uploads',
  {
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
  },
  (table) => [index('avatar_uploads_cleanup_idx').on(table.state, table.expiresAt)],
)

export type UserRow = typeof users.$inferSelect
export type ProfileRow = typeof profiles.$inferSelect
