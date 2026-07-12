import { describe, expect, test } from "vitest";
import { capabilityError, identityFromClaims } from "./auth.js";
import { deriveAge, requireAdultBirthDate } from "./account-service.js";

describe("authentication and age policy", () => {
  test("uses only verified token claims for identity and session binding", () => {
    expect(
      identityFromClaims({
        sub: "auth-subject",
        session_id: "session-1",
        app_metadata: { provider: "google", role: "client-forged-admin" },
      }),
    ).toEqual({
      subject: "auth-subject",
      authSessionId: "session-1",
      provider: "google",
      emailVerified: true,
      assuranceLevel: "aal1",
      authenticatedAt: null,
    });
  });

  test("gates contact by verification, onboarding, and sanctions", () => {
    expect(capabilityError("active", true, "contact")).toBeNull();
    expect(capabilityError("active", false, "contact")).toBe(
      "email_unverified",
    );
    expect(capabilityError("onboarding", true, "contact")).toBe(
      "onboarding_required",
    );
    expect(capabilityError("suspended", true, "inspect_self")).toBe(
      "account_suspended",
    );
  });

  test("derives cohort at UTC birthday boundaries", () => {
    expect(deriveAge("2008-07-13", new Date("2026-07-12T23:59:59Z"))).toEqual({
      age: 17,
      cohort: "minor_16_17",
    });
    expect(deriveAge("2008-07-13", new Date("2026-07-13T00:00:00Z"))).toEqual({
      age: 18,
      cohort: "adult_18_plus",
    });
    expect(() =>
      deriveAge("2011-07-13", new Date("2026-07-13T00:00:00Z")),
    ).not.toThrow();
    expect(() =>
      deriveAge("2026-07-14", new Date("2026-07-13T00:00:00Z")),
    ).toThrow("Invalid birth date");
  });

  test("rejects under-18 onboarding without exposing a child cohort", () => {
    const now = new Date("2026-07-13T00:00:00Z");
    expect(() => requireAdultBirthDate("2008-07-14", now)).toThrow(
      "This service is only available to eligible adults",
    );
    expect(requireAdultBirthDate("2008-07-13", now).cohort).toBe(
      "adult_18_plus",
    );
  });
});
