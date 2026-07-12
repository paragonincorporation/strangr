ALTER TABLE "thread_members" ADD COLUMN "read_sequence" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "messages" ALTER COLUMN "body" DROP NOT NULL;
ALTER TABLE "messages" ADD COLUMN "deleted_for_everyone_at" timestamp with time zone;
ALTER TABLE "messages" DROP CONSTRAINT "messages_body_length";
ALTER TABLE "messages" ADD CONSTRAINT "messages_body_length" CHECK ("messages"."body" is null or char_length("messages"."body") between 1 and 2000);

CREATE TABLE "message_hidden_for" (
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "hidden_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "message_hidden_for_message_id_user_id_pk" PRIMARY KEY("message_id", "user_id")
);

ALTER TABLE "calls" ADD COLUMN "state" text DEFAULT 'inviting' NOT NULL;
ALTER TABLE "calls" ADD COLUMN "invited_by" uuid REFERENCES "users"("id") ON DELETE set null;
CREATE TYPE "call_media" AS ENUM ('voice', 'video');
ALTER TABLE "calls" ALTER COLUMN "mode" TYPE "call_media" USING (CASE WHEN "mode"::text = 'video' THEN 'video'::"call_media" ELSE 'voice'::"call_media" END);
CREATE INDEX "calls_retention_idx" ON "calls" USING btree ("expires_at", "id");
CREATE INDEX "calls_thread_started_idx" ON "calls" USING btree ("thread_id", "started_at");
