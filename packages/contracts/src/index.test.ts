import { describe, expect, test } from "vitest";
import {
  avatarUploadInitRequestSchema,
  clientRealtimeEnvelopeSchema,
  countryCodeSchema,
  directMessageSendSchema,
  MAX_REALTIME_MESSAGE_BYTES,
  onboardingRequestSchema,
  parseClientRealtimeMessage,
  serverRealtimeEnvelopeSchema,
  launchCountryUpdateSchema,
  matchingPreferencesSchema,
} from "./index.js";

describe("contracts", () => {
  test("round trips a valid onboarding request and rejects unsafe usernames", () => {
    const value = {
      step: "profile" as const,
      username: "Ada_1",
      displayName: "Ada",
      isPrivate: true,
    };
    expect(onboardingRequestSchema.parse(value)).toEqual(value);
    expect(
      onboardingRequestSchema.safeParse({ ...value, username: "../ada" })
        .success,
    ).toBe(false);
  });

  test("requires all three current policy versions", () => {
    expect(
      onboardingRequestSchema.safeParse({
        step: "policies",
        termsVersion: "beta-2026-07",
        privacyVersion: "beta-2026-07",
        guidelinesVersion: "beta-2026-07",
      }).success,
    ).toBe(true);
    expect(
      onboardingRequestSchema.safeParse({
        step: "policies",
        termsVersion: "beta-2026-07",
        guidelinesVersion: "beta-2026-07",
      }).success,
    ).toBe(false);
  });

  test("limits avatar uploads before storage allocation", () => {
    expect(
      avatarUploadInitRequestSchema.safeParse({
        byteSize: 5 * 1024 * 1024 + 1,
        contentType: "image/png",
      }).success,
    ).toBe(false);
    expect(
      avatarUploadInitRequestSchema.safeParse({
        byteSize: 100,
        contentType: "image/svg+xml",
      }).success,
    ).toBe(false);
  });

  test.each([
    [
      "unknown command",
      JSON.stringify({
        version: 1,
        type: "match.join",
        requestId: "request_123",
        payload: {},
      }),
    ],
    [
      "unsupported version",
      JSON.stringify({
        version: 2,
        type: "connection.ping",
        requestId: "request_123",
        payload: { sentAt: new Date().toISOString() },
      }),
    ],
    [
      "malformed id",
      JSON.stringify({
        version: 1,
        type: "connection.ping",
        requestId: "!",
        payload: { sentAt: new Date().toISOString() },
      }),
    ],
  ])("rejects %s", (_name, input) =>
    expect(parseClientRealtimeMessage(input).success).toBe(false),
  );

  test("rejects oversized input before parsing", () => {
    expect(
      parseClientRealtimeMessage("x".repeat(MAX_REALTIME_MESSAGE_BYTES + 1)),
    ).toEqual({
      success: false,
      error: "payload_too_large",
    });
  });

  test("validates persistent message and direct-call envelopes", () => {
    expect(
      clientRealtimeEnvelopeSchema.safeParse({
        version: 1,
        type: "call.rtc.offer",
        requestId: "request_12345678",
        payload: { callId: "11111111-1111-4111-8111-111111111111", sdp: "v=0" },
      }).success,
    ).toBe(true);
    expect(
      directMessageSendSchema.safeParse({
        clientMessageId: "22222222-2222-4222-8222-222222222222",
        body: "<script>alert(1)</script>",
      }).success,
    ).toBe(true);
    expect(
      directMessageSendSchema.safeParse({
        clientMessageId: "33333333-3333-4333-8333-333333333333",
        body: "x".repeat(2_001),
      }).success,
    ).toBe(false);
  });

  test("validates authoritative match timing and cooldown errors", () => {
    const matchId = "11111111-1111-4111-8111-111111111111";
    expect(
      serverRealtimeEnvelopeSchema.safeParse({
        version: 1,
        type: "match.connected",
        requestId: "request_12345678",
        payload: {
          matchId,
          connectedAt: "2026-07-12T12:00:00.000Z",
          skipAllowedAt: "2026-07-12T12:00:25.000Z",
        },
      }).success,
    ).toBe(true);
    expect(
      serverRealtimeEnvelopeSchema.safeParse({
        version: 1,
        type: "error",
        requestId: "request_12345678",
        payload: {
          code: "cooldown_active",
          message: "Next is still locked",
          details: { retryAfterMs: 1 },
        },
      }).success,
    ).toBe(true);
  });

  test("normalizes country controls and requires an audit purpose", () => {
    expect(countryCodeSchema.parse("bd")).toBe("BD");
    expect(countryCodeSchema.safeParse("BGD").success).toBe(false);
    expect(
      launchCountryUpdateSchema.safeParse({
        registrationEnabled: true,
        matchingEnabled: false,
        billingEnabled: false,
        reasonCode: "legal_review_complete",
        purpose: "Approve reviewed launch country",
      }).success,
    ).toBe(true);
    expect(
      launchCountryUpdateSchema.safeParse({
        registrationEnabled: true,
        matchingEnabled: true,
        billingEnabled: true,
        reasonCode: "approved",
        purpose: "short",
      }).success,
    ).toBe(false);
  });

  test("validates private matching preferences", () => {
    expect(
      matchingPreferencesSchema.parse({
        countryPreference: "us",
        languagePreference: "en",
        interestTags: ["music", "books"],
        genderIdentity: "woman",
        genderPreference: "everyone",
        allowPreferenceRelaxation: true,
      }).countryPreference,
    ).toBe("US");
    expect(
      matchingPreferencesSchema.safeParse({
        countryPreference: null,
        languagePreference: null,
        interestTags: [],
        genderIdentity: "inferred",
        genderPreference: "everyone",
        allowPreferenceRelaxation: false,
      }).success,
    ).toBe(false);
  });
});
