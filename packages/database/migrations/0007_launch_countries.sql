ALTER TYPE "policy_type" ADD VALUE IF NOT EXISTS 'privacy_policy';

CREATE TABLE "launch_countries" (
  "country_code" text PRIMARY KEY,
  "registration_enabled" boolean NOT NULL DEFAULT false,
  "matching_enabled" boolean NOT NULL DEFAULT false,
  "billing_enabled" boolean NOT NULL DEFAULT false,
  "reason_code" text NOT NULL DEFAULT 'not_reviewed',
  "reviewed_at" timestamptz,
  "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "launch_countries_code_format" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "launch_countries_reason_length" CHECK (char_length("reason_code") BETWEEN 2 AND 80)
);

CREATE TABLE "user_country_state" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "registration_country" text NOT NULL,
  "last_observed_country" text NOT NULL,
  "country_source" text NOT NULL,
  "checked_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "user_country_registration_format" CHECK ("registration_country" ~ '^[A-Z]{2}$'),
  CONSTRAINT "user_country_observed_format" CHECK ("last_observed_country" ~ '^[A-Z]{2}$')
);

ALTER TABLE "launch_countries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_country_state" ENABLE ROW LEVEL SECURITY;
