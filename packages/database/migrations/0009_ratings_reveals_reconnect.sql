CREATE TYPE "conversation_rating_outcome" AS ENUM ('like','dislike');
CREATE TYPE "identity_reveal_source" AS ENUM ('subject_consent','maxed_entitlement');
CREATE TYPE "reconnect_request_state" AS ENUM ('pending','accepted','declined','expired','invalidated');

ALTER TABLE "encounters"
  ADD COLUMN "connected_at" timestamptz,
  ADD COLUMN "connected_duration_seconds" integer NOT NULL DEFAULT 0,
  ADD COLUMN "rating_eligible_at" timestamptz,
  ADD COLUMN "rating_window_closes_at" timestamptz;

CREATE TABLE "conversation_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "encounter_id" uuid NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
  "rater_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "subject_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "outcome" conversation_rating_outcome NOT NULL,
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "conversation_ratings_not_self" CHECK ("rater_id" <> "subject_id"),
  CONSTRAINT "conversation_ratings_encounter_rater_unique" UNIQUE ("encounter_id", "rater_id")
);
CREATE INDEX "conversation_ratings_subject_outcome_idx" ON "conversation_ratings"("subject_id","outcome");

CREATE TABLE "encounter_identity_reveals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "encounter_id" uuid NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
  "viewer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subject_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source" identity_reveal_source NOT NULL,
  "revealed_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz,
  CONSTRAINT "encounter_identity_reveals_not_self" CHECK ("viewer_id" <> "subject_id"),
  CONSTRAINT "encounter_identity_reveals_pair_unique" UNIQUE ("encounter_id", "viewer_id", "subject_id")
);
CREATE INDEX "encounter_identity_reveals_access_idx" ON "encounter_identity_reveals"("viewer_id","encounter_id","revoked_at");

CREATE TABLE "reconnect_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requester_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "recipient_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "previous_encounter_id" uuid NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
  "state" reconnect_request_state NOT NULL DEFAULT 'pending',
  "expires_at" timestamptz NOT NULL,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "reconnect_requests_not_self" CHECK ("requester_id" <> "recipient_id")
);
CREATE UNIQUE INDEX "reconnect_requests_pending_requester_uidx" ON "reconnect_requests"("requester_id") WHERE "state" = 'pending';
CREATE INDEX "reconnect_requests_recipient_idx" ON "reconnect_requests"("recipient_id","state","expires_at");

ALTER TABLE "conversation_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "encounter_identity_reveals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reconnect_requests" ENABLE ROW LEVEL SECURITY;
