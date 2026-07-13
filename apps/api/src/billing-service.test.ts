import { describe, expect, test, vi } from "vitest";
import type { BillingRepository } from "@paramingle/database";
import type Stripe from "stripe";
import { BillingService } from "./billing-service.js";

const secret = "whsec_test_billing_signature_secret";
function repository() {
  return {
    beginEvent: vi.fn().mockResolvedValue(true),
    finishEvent: vi.fn().mockResolvedValue(undefined),
    planByPrice: vi.fn().mockResolvedValue({ key: "loaded" }),
    applySubscription: vi.fn().mockResolvedValue(true),
    subscriptionForCustomer: vi.fn().mockResolvedValue(null),
  };
}
function sign(service: BillingService, event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const signature = service.stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return { body: Buffer.from(payload), signature };
}
function subscription(
  status: Stripe.Subscription.Status = "active",
  priceId = "price_loaded",
) {
  return {
    id: "sub_123",
    object: "subscription",
    status,
    customer: "cus_123",
    metadata: {
      paramingle_user_id: "550e8400-e29b-41d4-a716-446655440000",
    },
    items: {
      data: [
        {
          price: { id: priceId },
          current_period_start: 1_783_915_200,
          current_period_end: 1_786_507_200,
        },
      ],
    },
    cancel_at_period_end: false,
    canceled_at: null,
  } as unknown as Stripe.Response<Stripe.Subscription>;
}
function signed(service: BillingService) {
  return sign(service, {
    id: "evt_subscription",
    object: "event",
    type: "customer.subscription.updated",
    created: 1_783_915_200,
    data: { object: subscription() },
  });
}

describe("Stripe billing boundary", () => {
  test("verifies raw signatures and applies subscription state", async () => {
    const repo = repository();
    const service = new BillingService(
      repo as unknown as BillingRepository,
      "sk_test_placeholder",
      secret,
      "https://app.example.test",
    );
    const event = signed(service);
    await expect(service.webhook(event.body, event.signature)).resolves.toEqual(
      { duplicate: false },
    );
    expect(repo.applySubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        planKey: "loaded",
        status: "active",
        subscriptionId: "sub_123",
      }),
    );
    expect(repo.finishEvent).toHaveBeenCalledWith(
      "evt_subscription",
      "processed",
    );
  });

  test("rejects invalid signatures before recording an event", async () => {
    const repo = repository();
    const service = new BillingService(
      repo as unknown as BillingRepository,
      "sk_test_placeholder",
      secret,
      "https://app.example.test",
    );
    await expect(
      service.webhook(Buffer.from("{}"), "invalid"),
    ).rejects.toThrow();
    expect(repo.beginEvent).not.toHaveBeenCalled();
  });

  test("acknowledges replay without provisioning twice", async () => {
    const repo = repository();
    repo.beginEvent.mockResolvedValue(false);
    const service = new BillingService(
      repo as unknown as BillingRepository,
      "sk_test_placeholder",
      secret,
      "https://app.example.test",
    );
    const event = signed(service);
    await expect(service.webhook(event.body, event.signature)).resolves.toEqual(
      { duplicate: true },
    );
    expect(repo.applySubscription).not.toHaveBeenCalled();
  });

  test("maps plan changes, payment failure, and cancellation to authoritative state", async () => {
    const repo = repository();
    repo.planByPrice.mockResolvedValueOnce({ key: "lite" });
    const service = new BillingService(
      repo as unknown as BillingRepository,
      "sk_test_placeholder",
      secret,
      "https://app.example.test",
    );
    const failedAt = new Date("2026-07-13T00:00:00.000Z");
    await service.applyStripeSubscription(
      subscription("past_due", "price_lite"),
      failedAt,
    );
    expect(repo.applySubscription).toHaveBeenLastCalledWith(
      expect.objectContaining({
        planKey: "lite",
        status: "past_due",
        paymentGraceUntil: new Date("2026-07-16T00:00:00.000Z"),
      }),
    );
    await service.applyStripeSubscription(
      subscription("canceled"),
      new Date("2026-07-17T00:00:00.000Z"),
    );
    expect(repo.applySubscription).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "canceled", paymentGraceUntil: null }),
    );
  });

  test("turns a signed refund into immediate unpaid revocation", async () => {
    const repo = repository();
    repo.subscriptionForCustomer.mockResolvedValue({
      stripeSubscriptionId: "sub_123",
    });
    const service = new BillingService(
      repo as unknown as BillingRepository,
      "sk_test_placeholder",
      secret,
      "https://app.example.test",
    );
    vi.spyOn(service.stripe.subscriptions, "retrieve").mockResolvedValue(
      subscription("active"),
    );
    const event = sign(service, {
      id: "evt_refund",
      object: "event",
      type: "charge.refunded",
      created: 1_783_915_300,
      data: {
        object: { id: "ch_123", object: "charge", customer: "cus_123" },
      },
    });
    await expect(service.webhook(event.body, event.signature)).resolves.toEqual(
      { duplicate: false },
    );
    expect(repo.applySubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "unpaid" }),
    );
  });
});
