import type { Database } from "./client.js";
export declare const ENTITLEMENT_KEYS: readonly [
  "matching.gender_filter",
  "presence.online_status",
  "media.premium_quality",
  "matching.reconnect",
  "profile.frames",
  "profile.animated_background",
  "profile.supporter_badge",
  "matching.priority_weight",
  "call_card.paid_override",
  "features.early_access",
  "support.direct",
];
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];
export type PlanKey = "free" | "lite" | "loaded" | "maxed_out";
export declare class EntitlementService {
  private readonly db;
  constructor(db: Database);
  has(userId: string, key: string, now?: Date): Promise<boolean>;
  list(
    userId: string,
    now?: Date,
  ): Promise<{
    planKey: "free" | "lite" | "loaded" | "maxed_out";
    subscription: {
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
    } | null;
    grants: {
      key: string;
      validUntil: Date | null;
      source: string;
    }[];
  }>;
  syncPlan(
    userId: string,
    planKey: PlanKey,
    sourceReference: string,
    validUntil: Date | null,
    enabled: boolean,
  ): Promise<void>;
  grantManual(
    actorId: string,
    userId: string,
    key: EntitlementKey,
    validUntil: Date,
    purpose: string,
  ): Promise<{
    sourceReference: `${string}-${string}-${string}-${string}-${string}`;
  }>;
  revokeManual(
    actorId: string,
    userId: string,
    sourceReference: string,
    purpose: string,
  ): Promise<boolean>;
  catalog(): Omit<
    import("drizzle-orm/pg-core").PgSelectBase<
      "subscription_plans",
      {
        createdAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "created_at";
            tableName: "subscription_plans";
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
            tableName: "subscription_plans";
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
        key: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "key";
            tableName: "subscription_plans";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "free" | "lite" | "loaded" | "maxed_out";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
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
        name: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "name";
            tableName: "subscription_plans";
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
        monthlyPriceCents: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "monthly_price_cents";
            tableName: "subscription_plans";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
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
        currency: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "currency";
            tableName: "subscription_plans";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
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
        stripeProductId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "stripe_product_id";
            tableName: "subscription_plans";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
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
        stripePriceId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "stripe_price_id";
            tableName: "subscription_plans";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
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
        version: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "version";
            tableName: "subscription_plans";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
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
        active: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "active";
            tableName: "subscription_plans";
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
      },
      "single",
      Record<"subscription_plans", "not-null">,
      false,
      "where",
      {
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
      }[],
      {
        createdAt: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "created_at";
            tableName: "subscription_plans";
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
            tableName: "subscription_plans";
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
        key: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "key";
            tableName: "subscription_plans";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "free" | "lite" | "loaded" | "maxed_out";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
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
        name: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "name";
            tableName: "subscription_plans";
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
        monthlyPriceCents: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "monthly_price_cents";
            tableName: "subscription_plans";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
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
        currency: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "currency";
            tableName: "subscription_plans";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
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
        stripeProductId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "stripe_product_id";
            tableName: "subscription_plans";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
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
        stripePriceId: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "stripe_price_id";
            tableName: "subscription_plans";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
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
        version: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "version";
            tableName: "subscription_plans";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
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
        active: import("drizzle-orm/pg-core").PgColumn<
          {
            name: "active";
            tableName: "subscription_plans";
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
      }
    >,
    "where"
  >;
}
