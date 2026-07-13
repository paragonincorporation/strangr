import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { Database } from "./client.js";
import {
  entitlementAuditLogs,
  entitlementGrants,
  subscriptionPlans,
  subscriptions,
} from "./schema.js";

export const ENTITLEMENT_KEYS = [
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
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];
export type PlanKey = "free" | "lite" | "loaded" | "maxed_out";

const PLAN_ENTITLEMENTS: Record<PlanKey, readonly EntitlementKey[]> = {
  free: [],
  lite: ["matching.gender_filter", "presence.online_status"],
  loaded: [
    "matching.gender_filter",
    "presence.online_status",
    "media.premium_quality",
    "matching.reconnect",
    "profile.frames",
    "profile.animated_background",
    "profile.supporter_badge",
  ],
  maxed_out: [...ENTITLEMENT_KEYS],
};

export class EntitlementService {
  constructor(private readonly db: Database) {}

  async has(userId: string, key: string, now = new Date()) {
    const [row] = await this.db
      .select({ id: entitlementGrants.id })
      .from(entitlementGrants)
      .where(
        and(
          eq(entitlementGrants.userId, userId),
          eq(entitlementGrants.entitlementKey, key),
          isNull(entitlementGrants.revokedAt),
          lte(entitlementGrants.validFrom, now),
          or(
            isNull(entitlementGrants.validUntil),
            gt(entitlementGrants.validUntil, now),
          ),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async list(userId: string, now = new Date()) {
    const rows = await this.db
      .select({
        key: entitlementGrants.entitlementKey,
        validUntil: entitlementGrants.validUntil,
        source: entitlementGrants.source,
      })
      .from(entitlementGrants)
      .where(
        and(
          eq(entitlementGrants.userId, userId),
          isNull(entitlementGrants.revokedAt),
          lte(entitlementGrants.validFrom, now),
          or(
            isNull(entitlementGrants.validUntil),
            gt(entitlementGrants.validUntil, now),
          ),
        ),
      );
    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    return {
      planKey: subscription?.planKey ?? "free",
      subscription: subscription ?? null,
      grants: rows,
    };
  }

  async syncPlan(
    userId: string,
    planKey: PlanKey,
    sourceReference: string,
    validUntil: Date | null,
    enabled: boolean,
  ) {
    const wanted = new Set(enabled ? PLAN_ENTITLEMENTS[planKey] : []);
    await this.db.transaction(async (tx) => {
      for (const key of ENTITLEMENT_KEYS) {
        const [existing] = await tx
          .select()
          .from(entitlementGrants)
          .where(
            and(
              eq(entitlementGrants.userId, userId),
              eq(entitlementGrants.entitlementKey, key),
              eq(entitlementGrants.source, "stripe_subscription"),
              eq(entitlementGrants.sourceReference, sourceReference),
            ),
          )
          .limit(1);
        if (wanted.has(key)) {
          await tx
            .insert(entitlementGrants)
            .values({
              userId,
              entitlementKey: key,
              source: "stripe_subscription",
              sourceReference,
              validUntil,
            })
            .onConflictDoUpdate({
              target: [
                entitlementGrants.userId,
                entitlementGrants.entitlementKey,
                entitlementGrants.source,
                entitlementGrants.sourceReference,
              ],
              set: { validUntil, revokedAt: null, updatedAt: new Date() },
            });
        } else if (existing && !existing.revokedAt) {
          await tx
            .update(entitlementGrants)
            .set({ revokedAt: new Date(), updatedAt: new Date() })
            .where(eq(entitlementGrants.id, existing.id));
        }
      }
    });
  }

  async grantManual(
    actorId: string,
    userId: string,
    key: EntitlementKey,
    validUntil: Date,
    purpose: string,
  ) {
    const reference = crypto.randomUUID();
    await this.db.transaction(async (tx) => {
      await tx.insert(entitlementGrants).values({
        userId,
        entitlementKey: key,
        source: "manual",
        sourceReference: reference,
        validUntil,
      });
      await tx.insert(entitlementAuditLogs).values({
        actorId,
        userId,
        entitlementKey: key,
        action: "grant",
        source: "manual",
        sourceReference: reference,
        validUntil,
        purpose,
      });
    });
    return { sourceReference: reference };
  }

  async revokeManual(
    actorId: string,
    userId: string,
    sourceReference: string,
    purpose: string,
  ) {
    const [grant] = await this.db
      .select()
      .from(entitlementGrants)
      .where(
        and(
          eq(entitlementGrants.userId, userId),
          eq(entitlementGrants.source, "manual"),
          eq(entitlementGrants.sourceReference, sourceReference),
          isNull(entitlementGrants.revokedAt),
        ),
      )
      .limit(1);
    if (!grant) return false;
    await this.db.transaction(async (tx) => {
      await tx
        .update(entitlementGrants)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(entitlementGrants.id, grant.id));
      await tx.insert(entitlementAuditLogs).values({
        actorId,
        userId,
        entitlementKey: grant.entitlementKey,
        action: "revoke",
        source: "manual",
        sourceReference,
        validUntil: grant.validUntil,
        purpose,
      });
    });
    return true;
  }

  catalog() {
    return this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.active, true));
  }
}
