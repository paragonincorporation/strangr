import { describe, expect, test, vi } from "vitest";
import type { BillingRepository } from "@paramingle/database";
import { BillingService } from "./billing-service.js";

const secret = "whsec_test_billing_signature_secret";
function repository() {
  return {
    beginEvent: vi.fn().mockResolvedValue(true),
    finishEvent: vi.fn().mockResolvedValue(undefined),
    planByPrice: vi.fn().mockResolvedValue({ key: "loaded" }),
    applySubscription: vi.fn().mockResolvedValue(true),
  };
}
function signed(service: BillingService) {
  const payload = JSON.stringify({
    id: "evt_subscription",
    object: "event",
    type: "customer.subscription.updated",
    created: 1_783_915_200,
    data: {
      object: {
        id: "sub_123",
        object: "subscription",
        status: "active",
        customer: "cus_123",
        metadata: {
          paramingle_user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
        items: {
          data: [
            {
              price: { id: "price_loaded" },
              current_period_start: 1_783_915_200,
              current_period_end: 1_786_507_200,
            },
          ],
        },
        cancel_at_period_end: false,
        canceled_at: null,
      },
    },
  });
  const signature = service.stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return { body: Buffer.from(payload), signature };
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
});
