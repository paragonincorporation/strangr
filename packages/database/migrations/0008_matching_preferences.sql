CREATE TYPE "gender_identity" AS ENUM ('man','woman','nonbinary','prefer_not_to_say');
CREATE TYPE "gender_preference" AS ENUM ('everyone','men','women','nonbinary');

CREATE TABLE "matching_preferences" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "country_preference" text,
  "language_preference" text,
  "interest_tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "gender_identity" gender_identity NOT NULL DEFAULT 'prefer_not_to_say',
  "gender_preference" gender_preference NOT NULL DEFAULT 'everyone',
  "allow_preference_relaxation" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "matching_country_format" CHECK ("country_preference" IS NULL OR "country_preference" ~ '^[A-Z]{2}$'),
  CONSTRAINT "matching_language_length" CHECK ("language_preference" IS NULL OR char_length("language_preference") BETWEEN 2 AND 35),
  CONSTRAINT "matching_interests_array" CHECK (jsonb_typeof("interest_tags") = 'array' AND jsonb_array_length("interest_tags") <= 12)
);

CREATE TABLE "entitlement_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "entitlement_key" text NOT NULL,
  "source" text NOT NULL,
  "source_reference" text NOT NULL,
  "valid_from" timestamptz NOT NULL DEFAULT now(),
  "valid_until" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "entitlement_grants_source_uidx" ON "entitlement_grants"("user_id","entitlement_key","source","source_reference");
CREATE INDEX "entitlement_grants_active_idx" ON "entitlement_grants"("user_id","entitlement_key","valid_until");

ALTER TABLE "matching_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entitlement_grants" ENABLE ROW LEVEL SECURITY;
