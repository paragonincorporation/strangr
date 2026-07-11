ALTER TABLE "user_sessions" ADD COLUMN "auth_session_id" text;
UPDATE "user_sessions" SET "auth_session_id" = "id"::text WHERE "auth_session_id" IS NULL;
ALTER TABLE "user_sessions" ALTER COLUMN "auth_session_id" SET NOT NULL;
CREATE UNIQUE INDEX "user_sessions_user_auth_session_uidx" ON "user_sessions" ("user_id", "auth_session_id");
CREATE TYPE "avatar_upload_state" AS ENUM ('pending', 'processing', 'ready', 'failed', 'abandoned', 'deleted');
CREATE TABLE "avatar_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "state" avatar_upload_state DEFAULT 'pending' NOT NULL,
  "declared_content_type" text NOT NULL,
  "declared_byte_size" integer NOT NULL,
  "quarantine_object_key" text NOT NULL,
  "processed_object_key" text,
  "failure_code" text,
  "expires_at" timestamptz NOT NULL,
  "finalized_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "avatar_upload_size" CHECK ("declared_byte_size" > 0 AND "declared_byte_size" <= 5242880),
  CONSTRAINT "avatar_upload_content_type" CHECK ("declared_content_type" IN ('image/jpeg','image/png','image/webp'))
);
CREATE INDEX "avatar_uploads_cleanup_idx" ON "avatar_uploads" ("state", "expires_at");
-- Storage objects are private. Browser roles receive no table grants; access is mediated by the API.
