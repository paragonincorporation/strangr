import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import {
  stripeWebhookEvents,
  subscriptionPlans,
  subscriptions,
} from "./schema.js";
import { EntitlementService } from "./entitlements.js";
export class BillingRepository {
  db;
  entitlements;
  constructor(db) {
    this.db = db;
    this.entitlements = new EntitlementService(db);
  }
  async beginEvent(eventId, eventType, objectId, objectCreatedAt) {
    const inserted = await this.db
      .insert(stripeWebhookEvents)
      .values({ eventId, eventType, objectId, objectCreatedAt })
      .onConflictDoNothing()
      .returning({ eventId: stripeWebhookEvents.eventId });
    return inserted.length === 1;
  }
  async finishEvent(eventId, state, failureCode) {
    await this.db
      .update(stripeWebhookEvents)
      .set({
        processingState: state,
        processedAt: new Date(),
        failureCode: failureCode ?? null,
      })
      .where(eq(stripeWebhookEvents.eventId, eventId));
  }
  async planByPrice(priceId) {
    const [plan] = await this.db
      .select()
      .from(subscriptionPlans)
      .where(
        and(
          eq(subscriptionPlans.stripePriceId, priceId),
          eq(subscriptionPlans.active, true),
        ),
      )
      .limit(1);
    return plan ?? null;
  }
  async plan(planKey) {
    const [plan] = await this.db
      .select()
      .from(subscriptionPlans)
      .where(
        and(
          eq(subscriptionPlans.key, planKey),
          eq(subscriptionPlans.active, true),
        ),
      )
      .limit(1);
    return plan ?? null;
  }
  async subscriptionForUser(userId) {
    const [row] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    return row ?? null;
  }
  async subscriptionForCustomer(customerId) {
    const [row] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .limit(1);
    return row ?? null;
  }
  async applySubscription(update) {
    const existing = await this.subscriptionForUser(update.userId);
    if (existing) {
      if (existing.lastProcessedObjectAt > update.objectCreatedAt) return false;
      if (
        existing.lastProcessedObjectAt.getTime() ===
          update.objectCreatedAt.getTime() &&
        revocationRank(existing.status) >= revocationRank(update.status)
      )
        return false;
    }
    await this.db
      .insert(subscriptions)
      .values({
        userId: update.userId,
        planKey: update.planKey,
        stripeCustomerId: update.customerId,
        stripeSubscriptionId: update.subscriptionId,
        status: update.status,
        currentPeriodStart: update.currentPeriodStart,
        currentPeriodEnd: update.currentPeriodEnd,
        cancelAtPeriodEnd: update.cancelAtPeriodEnd,
        canceledAt: update.canceledAt,
        paymentGraceUntil: update.paymentGraceUntil,
        lastProcessedObjectAt: update.objectCreatedAt,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          planKey: update.planKey,
          stripeCustomerId: update.customerId,
          stripeSubscriptionId: update.subscriptionId,
          status: update.status,
          currentPeriodStart: update.currentPeriodStart,
          currentPeriodEnd: update.currentPeriodEnd,
          cancelAtPeriodEnd: update.cancelAtPeriodEnd,
          canceledAt: update.canceledAt,
          paymentGraceUntil: update.paymentGraceUntil,
          lastProcessedObjectAt: update.objectCreatedAt,
          updatedAt: new Date(),
        },
      });
    const now = new Date();
    const entitled =
      update.status === "active" ||
      update.status === "trialing" ||
      (update.status === "past_due" &&
        Boolean(update.paymentGraceUntil && update.paymentGraceUntil > now));
    const validUntil = update.cancelAtPeriodEnd
      ? update.currentPeriodEnd
      : (update.paymentGraceUntil ?? update.currentPeriodEnd);
    await this.entitlements.syncPlan(
      update.userId,
      update.planKey,
      update.subscriptionId,
      validUntil,
      entitled,
    );
    return true;
  }
  staleForReconciliation(before, limit = 100) {
    return this.db
      .select()
      .from(subscriptions)
      .where(
        or(
          isNull(subscriptions.lastReconciledAt),
          lt(subscriptions.lastReconciledAt, before),
        ),
      )
      .orderBy(asc(subscriptions.lastReconciledAt))
      .limit(limit);
  }
  async markReconciled(subscriptionId) {
    await this.db
      .update(subscriptions)
      .set({ lastReconciledAt: new Date() })
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
  }
}
function revocationRank(status) {
  if (status === "canceled" || status === "unpaid") return 3;
  if (status === "paused" || status === "incomplete") return 2;
  if (status === "past_due") return 1;
  return 0;
}
