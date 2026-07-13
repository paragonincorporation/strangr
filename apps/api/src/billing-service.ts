import Stripe from "stripe";
import type {
  BillingRepository,
  PlanKey,
  SubscriptionUpdate,
} from "@paramingle/database";

const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
const date = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000) : null;

export class BillingService {
  readonly stripe: Stripe;
  constructor(
    private readonly repository: BillingRepository,
    secretKey: string,
    private readonly webhookSecret: string,
    private readonly webOrigin: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async checkout(
    userId: string,
    planKey: Exclude<PlanKey, "free">,
    idempotencyKey: string,
  ) {
    const plan = await this.repository.plan(planKey);
    if (!plan?.stripePriceId) throw new Error("plan_unavailable");
    const existing = await this.repository.subscriptionForUser(userId);
    if (
      existing &&
      ["active", "trialing", "past_due"].includes(existing.status)
    )
      throw new Error("subscription_exists");
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: `${this.webOrigin}/app/premium?checkout=processing`,
        cancel_url: `${this.webOrigin}/app/premium?checkout=cancelled`,
        client_reference_id: userId,
        ...(existing?.stripeCustomerId
          ? { customer: existing.stripeCustomerId }
          : {}),
        subscription_data: {
          metadata: {
            paramingle_user_id: userId,
            paramingle_plan_key: planKey,
          },
        },
        metadata: { paramingle_user_id: userId, paramingle_plan_key: planKey },
      },
      { idempotencyKey },
    );
    if (!session.url) throw new Error("provider_unavailable");
    return { url: session.url };
  }

  async portal(userId: string) {
    const current = await this.repository.subscriptionForUser(userId);
    if (!current) throw new Error("subscription_unavailable");
    const session = await this.stripe.billingPortal.sessions.create({
      customer: current.stripeCustomerId,
      return_url: `${this.webOrigin}/app/premium`,
    });
    return { url: session.url };
  }

  async webhook(rawBody: Buffer, signature: string | undefined) {
    if (!signature) throw new Error("signature_invalid");
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
    const object = event.data.object as Stripe.Event.Data.Object & {
      id?: string;
    };
    if (
      !(await this.repository.beginEvent(
        event.id,
        event.type,
        object.id ?? null,
        new Date(event.created * 1000),
      ))
    )
      return { duplicate: true };
    try {
      const handled = await this.processEvent(event);
      await this.repository.finishEvent(
        event.id,
        handled ? "processed" : "ignored",
      );
      return { duplicate: false };
    } catch (cause) {
      await this.repository.finishEvent(
        event.id,
        "failed",
        cause instanceof Error ? cause.message.slice(0, 120) : "unknown",
      );
      throw cause;
    }
  }

  private async processEvent(event: Stripe.Event) {
    if (event.type.startsWith("customer.subscription.")) {
      await this.applyStripeSubscription(
        event.data.object as Stripe.Subscription,
        new Date(event.created * 1000),
      );
      return true;
    }
    if (["invoice.paid", "invoice.payment_failed"].includes(event.type)) {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : invoice.parent?.subscription_details?.subscription?.id;
      if (subscriptionId)
        await this.applyStripeSubscription(
          await this.stripe.subscriptions.retrieve(subscriptionId),
          new Date(event.created * 1000),
        );
      return Boolean(subscriptionId);
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (subscriptionId)
        await this.applyStripeSubscription(
          await this.stripe.subscriptions.retrieve(subscriptionId),
          new Date(event.created * 1000),
        );
      return Boolean(subscriptionId);
    }
    if (
      event.type.startsWith("charge.dispute.") ||
      event.type === "charge.refunded"
    ) {
      const charge = event.data.object as Stripe.Charge;
      const customerId =
        typeof charge.customer === "string"
          ? charge.customer
          : charge.customer?.id;
      const current = customerId
        ? await this.repository.subscriptionForCustomer(customerId)
        : null;
      if (!current) return false;
      const subscription = await this.stripe.subscriptions.retrieve(
        current.stripeSubscriptionId,
      );
      await this.applyStripeSubscription(
        { ...subscription, status: "unpaid" },
        new Date(event.created * 1000),
      );
      return true;
    }
    return false;
  }

  async applyStripeSubscription(
    subscription: Stripe.Subscription,
    objectCreatedAt = new Date(),
  ) {
    const userId = subscription.metadata.paramingle_user_id;
    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId ? await this.repository.planByPrice(priceId) : null;
    if (!userId || !plan) throw new Error("subscription_metadata_invalid");
    const item = subscription.items.data[0];
    const status =
      subscription.status === "incomplete_expired"
        ? "incomplete"
        : subscription.status;
    if (
      ![
        "incomplete",
        "trialing",
        "active",
        "past_due",
        "unpaid",
        "paused",
        "canceled",
      ].includes(status)
    )
      throw new Error("subscription_status_invalid");
    const grace =
      status === "past_due"
        ? new Date(objectCreatedAt.getTime() + GRACE_MS)
        : null;
    const update: SubscriptionUpdate = {
      userId,
      planKey: plan.key,
      customerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      subscriptionId: subscription.id,
      status,
      currentPeriodStart: date(item?.current_period_start),
      currentPeriodEnd: date(item?.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: date(subscription.canceled_at),
      paymentGraceUntil: grace,
      objectCreatedAt,
    };
    await this.repository.applySubscription(update);
  }

  async reconcile(limit = 100) {
    const stale = await this.repository.staleForReconciliation(
      new Date(Date.now() - 60 * 60 * 1000),
      limit,
    );
    for (const row of stale) {
      const subscription = await this.stripe.subscriptions.retrieve(
        row.stripeSubscriptionId,
      );
      await this.applyStripeSubscription(subscription);
      await this.repository.markReconciled(row.stripeSubscriptionId);
    }
    return stale.length;
  }
}
