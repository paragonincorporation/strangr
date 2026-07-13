import type { Database } from "./client.js";
import { type PlanKey } from "./entitlements.js";
export type SubscriptionUpdate = {
  userId: string;
  planKey: PlanKey;
  customerId: string;
  subscriptionId: string;
  status:
    | "incomplete"
    | "trialing"
    | "active"
    | "past_due"
    | "unpaid"
    | "paused"
    | "canceled";
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  paymentGraceUntil: Date | null;
  objectCreatedAt: Date;
};
export declare class BillingRepository {
  private readonly db;
  private readonly entitlements;
  constructor(db: Database);
  beginEvent(
    eventId: string,
    eventType: string,
    objectId: string | null,
    objectCreatedAt: Date,
  ): Promise<boolean>;
  finishEvent(
    eventId: string,
    state: "processed" | "ignored" | "failed",
    failureCode?: string,
  ): Promise<void>;
  planByPrice(priceId: string): Promise<{
    createdAt: Date;
    updatedAt: Date;
    key: "free" | "lite" | "loaded" | "maxed_out";
    name: string;
    monthlyPriceCents: number;
    currency: string;
    stripeProductId: string | null;
    stripePriceId: string | null;
    version: number;
    active: boolean;
  } | null>;
  plan(planKey: PlanKey): Promise<{
    createdAt: Date;
    updatedAt: Date;
    key: "free" | "lite" | "loaded" | "maxed_out";
    name: string;
    monthlyPriceCents: number;
    currency: string;
    stripeProductId: string | null;
    stripePriceId: string | null;
    version: number;
    active: boolean;
  } | null>;
  subscriptionForUser(userId: string): Promise<{
    createdAt: Date;
    updatedAt: Date;
    id: string;
    userId: string;
    planKey: "free" | "lite" | "loaded" | "maxed_out";
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status:
      | "active"
      | "incomplete"
      | "trialing"
      | "past_due"
      | "unpaid"
      | "paused"
      | "canceled";
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    paymentGraceUntil: Date | null;
    lastProcessedObjectAt: Date;
    lastReconciledAt: Date | null;
  } | null>;
  subscriptionForCustomer(customerId: string): Promise<{
    createdAt: Date;
    updatedAt: Date;
    id: string;
    userId: string;
    planKey: "free" | "lite" | "loaded" | "maxed_out";
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status:
      | "active"
      | "incomplete"
      | "trialing"
      | "past_due"
      | "unpaid"
      | "paused"
      | "canceled";
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    paymentGraceUntil: Date | null;
    lastProcessedObjectAt: Date;
    lastReconciledAt: Date | null;
  } | null>;
  applySubscription(update: SubscriptionUpdate): Promise<boolean>;
  staleForReconciliation(
    before: Date,
    limit?: number,
  ): Omit<
    import("drizzle-orm/pg-core").PgSelectBase<
      "subscriptions",
      {
        createdAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "created_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "updated_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        id: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "id";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        userId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "user_id";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        planKey: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "plan_key";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "free" | "lite" | "loaded" | "maxed_out";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["free", "lite", "loaded", "maxed_out"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        stripeCustomerId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "stripe_customer_id";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        stripeSubscriptionId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "stripe_subscription_id";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        status: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "status";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data:
              | "active"
              | "incomplete"
              | "trialing"
              | "past_due"
              | "unpaid"
              | "paused"
              | "canceled";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [
              "incomplete",
              "trialing",
              "active",
              "past_due",
              "unpaid",
              "paused",
              "canceled",
            ];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        currentPeriodStart: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "current_period_start";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        currentPeriodEnd: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "current_period_end";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        cancelAtPeriodEnd: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "cancel_at_period_end";
            tableName: "subscriptions";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        canceledAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "canceled_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        paymentGraceUntil: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "payment_grace_until";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        lastProcessedObjectAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "last_processed_object_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        lastReconciledAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "last_reconciled_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
      },
      "single",
      Record<"subscriptions", "not-null">,
      false,
      "where" | "orderBy" | "limit",
      {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        planKey: "free" | "lite" | "loaded" | "maxed_out";
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        status:
          | "active"
          | "incomplete"
          | "trialing"
          | "past_due"
          | "unpaid"
          | "paused"
          | "canceled";
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        paymentGraceUntil: Date | null;
        lastProcessedObjectAt: Date;
        lastReconciledAt: Date | null;
      }[],
      {
        createdAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "created_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "updated_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        id: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "id";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        userId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "user_id";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        planKey: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "plan_key";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "free" | "lite" | "loaded" | "maxed_out";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["free", "lite", "loaded", "maxed_out"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        stripeCustomerId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "stripe_customer_id";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        stripeSubscriptionId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "stripe_subscription_id";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        status: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "status";
            tableName: "subscriptions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data:
              | "active"
              | "incomplete"
              | "trialing"
              | "past_due"
              | "unpaid"
              | "paused"
              | "canceled";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [
              "incomplete",
              "trialing",
              "active",
              "past_due",
              "unpaid",
              "paused",
              "canceled",
            ];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        currentPeriodStart: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "current_period_start";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        currentPeriodEnd: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "current_period_end";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        cancelAtPeriodEnd: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "cancel_at_period_end";
            tableName: "subscriptions";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        canceledAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "canceled_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        paymentGraceUntil: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "payment_grace_until";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        lastProcessedObjectAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "last_processed_object_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        lastReconciledAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "last_reconciled_at";
            tableName: "subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
      }
    >,
    "where" | "orderBy" | "limit"
  >;
  markReconciled(subscriptionId: string): Promise<void>;
}
