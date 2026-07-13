CREATE TYPE "privacy_request_state" AS ENUM ('pending','processing','ready','canceled','completed','failed');

CREATE TABLE "privacy_export_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "state" privacy_request_state NOT NULL DEFAULT 'pending',
  "archive_key" text,
  "download_token_hash" text,
  "expires_at" timestamptz,
  "completed_at" timestamptz,
  "failure_code" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "privacy_exports_pending_idx" ON "privacy_export_requests"("state", "created_at");
CREATE INDEX "privacy_exports_expiry_idx" ON "privacy_export_requests"("expires_at");

CREATE TABLE "deletion_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "state" privacy_request_state NOT NULL DEFAULT 'pending',
  "requested_at" timestamptz NOT NULL DEFAULT now(),
  "cancel_until" timestamptz NOT NULL,
  "completed_at" timestamptz,
  "retention_until" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "deletion_request_window" CHECK ("cancel_until" >= "requested_at")
);
CREATE INDEX "deletion_requests_due_idx" ON "deletion_requests"("state", "cancel_until");

ALTER TABLE "privacy_export_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deletion_requests" ENABLE ROW LEVEL SECURITY;
