CREATE TYPE "public"."encounter_mode" AS ENUM('text', 'video');
CREATE TYPE "public"."encounter_state" AS ENUM('active', 'ended');
CREATE TYPE "public"."thread_type" AS ENUM('random', 'direct');
CREATE TYPE "public"."message_type" AS ENUM('random', 'direct');
CREATE TYPE "public"."call_type" AS ENUM('random', 'direct');

CREATE TABLE "encounters" (
  "id" uuid PRIMARY KEY,
  "mode" "encounter_mode" NOT NULL,
  "state" "encounter_state" DEFAULT 'active' NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "ended_at" timestamptz,
  "completion_reason" text,
  "diagnostics_category" text,
  "visible_until" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "encounters_retention_idx" ON "encounters" ("visible_until", "id");

CREATE TABLE "encounter_participants" (
  "encounter_id" uuid NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "result" text,
  "hidden_at" timestamptz,
  "reported_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("encounter_id", "user_id")
);
CREATE INDEX "encounter_participants_user_idx" ON "encounter_participants" ("user_id", "encounter_id");

CREATE TABLE "threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "thread_type" NOT NULL,
  "encounter_id" uuid UNIQUE REFERENCES "encounters"("id") ON DELETE CASCADE,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "threads_random_encounter_required" CHECK (("type" = 'random' AND "encounter_id" IS NOT NULL AND "expires_at" IS NOT NULL) OR "type" = 'direct')
);
CREATE TABLE "thread_members" (
  "thread_id" uuid NOT NULL REFERENCES "threads"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "hidden_at" timestamptz,
  "joined_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("thread_id", "user_id")
);
CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL REFERENCES "threads"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "type" "message_type" NOT NULL,
  "client_message_id" uuid NOT NULL,
  "server_sequence" bigint NOT NULL,
  "body" text NOT NULL,
  "sent_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz,
  CONSTRAINT "messages_body_length" CHECK (char_length("body") BETWEEN 1 AND 2000),
  CONSTRAINT "messages_random_expiry_required" CHECK (("type" = 'random' AND "expires_at" IS NOT NULL) OR "type" = 'direct')
);
CREATE UNIQUE INDEX "messages_thread_client_uidx" ON "messages" ("thread_id", "client_message_id");
CREATE UNIQUE INDEX "messages_thread_sequence_uidx" ON "messages" ("thread_id", "server_sequence");
CREATE INDEX "messages_expiry_idx" ON "messages" ("expires_at", "id");

CREATE TABLE "calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "encounter_id" uuid REFERENCES "encounters"("id") ON DELETE SET NULL,
  "thread_id" uuid REFERENCES "threads"("id") ON DELETE SET NULL,
  "type" "call_type" NOT NULL,
  "mode" "encounter_mode" NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "connected_at" timestamptz,
  "ended_at" timestamptz,
  "completion_reason" text,
  "diagnostics_category" text,
  "expires_at" timestamptz NOT NULL,
  CONSTRAINT "calls_scope_required" CHECK (("type" = 'random' AND "encounter_id" IS NOT NULL) OR ("type" = 'direct' AND "thread_id" IS NOT NULL))
);
CREATE TABLE "call_participants" (
  "call_id" uuid NOT NULL REFERENCES "calls"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "joined_at" timestamptz,
  "left_at" timestamptz,
  "result" text,
  PRIMARY KEY ("call_id", "user_id")
);

CREATE TABLE "report_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "encounter_id" uuid REFERENCES "encounters"("id") ON DELETE SET NULL,
  "message_id" uuid REFERENCES "messages"("id") ON DELETE SET NULL,
  "excerpt" text NOT NULL,
  "retention_reason" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "report_evidence_excerpt_length" CHECK (char_length("excerpt") BETWEEN 1 AND 500)
);

CREATE TABLE "blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "blocker_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blocked_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reason_category" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "blocks_not_self" CHECK ("blocker_id" <> "blocked_id")
);
CREATE UNIQUE INDEX "blocks_pair_uidx" ON "blocks" ("blocker_id", "blocked_id");
CREATE INDEX "blocks_blocked_idx" ON "blocks" ("blocked_id", "blocker_id");
