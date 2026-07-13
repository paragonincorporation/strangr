CREATE TYPE "subscription_plan_key" AS ENUM ('free','lite','loaded','maxed_out');
CREATE TYPE "subscription_status" AS ENUM ('incomplete','trialing','active','past_due','unpaid','paused','canceled');

CREATE TABLE "subscription_plans" (
  "key" subscription_plan_key PRIMARY KEY,
  "name" text NOT NULL,
  "monthly_price_cents" integer NOT NULL,
  "currency" char(3) NOT NULL DEFAULT 'USD',
  "stripe_product_id" text,
  "stripe_price_id" text UNIQUE,
  "version" integer NOT NULL DEFAULT 1,
  "active" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_plans_price_nonnegative" CHECK ("monthly_price_cents" >= 0),
  CONSTRAINT "subscription_plans_stripe_pair" CHECK (("stripe_product_id" IS NULL) = ("stripe_price_id" IS NULL))
);

INSERT INTO "subscription_plans" ("key","name","monthly_price_cents","active") VALUES
  ('free','Free',0,true), ('lite','Lite',300,false),
  ('loaded','Loaded',900,false), ('maxed_out','Maxed Out',1900,false);

CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_key" subscription_plan_key NOT NULL REFERENCES "subscription_plans"("key") ON DELETE RESTRICT,
  "stripe_customer_id" text NOT NULL UNIQUE,
  "stripe_subscription_id" text NOT NULL UNIQUE,
  "status" subscription_status NOT NULL,
  "current_period_start" timestamptz,
  "current_period_end" timestamptz,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "canceled_at" timestamptz,
  "payment_grace_until" timestamptz,
  "last_processed_object_at" timestamptz NOT NULL,
  "last_reconciled_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "subscriptions_reconciliation_idx" ON "subscriptions"("last_reconciled_at","status");

CREATE TABLE "stripe_webhook_events" (
  "event_id" text PRIMARY KEY,
  "event_type" text NOT NULL,
  "object_id" text,
  "object_created_at" timestamptz NOT NULL,
  "processing_state" text NOT NULL DEFAULT 'processing',
  "processed_at" timestamptz,
  "failure_code" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "stripe_webhook_events_state" CHECK ("processing_state" IN ('processing','processed','ignored','failed'))
);

CREATE TABLE "entitlement_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
  "entitlement_key" text NOT NULL,
  "action" text NOT NULL,
  "source" text NOT NULL,
  "source_reference" text NOT NULL,
  "valid_until" timestamptz,
  "purpose" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "entitlement_audit_action" CHECK ("action" IN ('grant','revoke','expire'))
);
CREATE INDEX "entitlement_audit_user_idx" ON "entitlement_audit_logs"("user_id","created_at");

ALTER TABLE "subscription_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stripe_webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entitlement_audit_logs" ENABLE ROW LEVEL SECURITY;
