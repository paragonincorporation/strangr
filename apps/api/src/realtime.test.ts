import { describe, expect, test } from "vitest";
import {
  criteriaCompatible,
  textSkipCooldown,
  type MatchRecord,
} from "./realtime.js";

const connectedAt = "2026-07-12T12:00:00.000Z";

function match(mode: "text" | "video", connected = connectedAt): MatchRecord {
  return {
    id: crypto.randomUUID(),
    mode,
    first: crypto.randomUUID(),
    second: crypto.randomUUID(),
    expiresAt: "2026-07-12T18:00:00.000Z",
    connectedAt: connected,
  };
}

describe("text skip cooldown", () => {
  test("rejects Next before 25 connected seconds and allows the boundary", () => {
    const text = match("text");
    const start = new Date(connectedAt).getTime();

    expect(textSkipCooldown(text, start + 24_999)).toEqual({
      allowed: false,
      retryAfterMs: 1,
      skipAllowedAt: "2026-07-12T12:00:25.000Z",
    });
    expect(textSkipCooldown(text, start + 25_000)).toEqual({
      allowed: true,
      retryAfterMs: 0,
      skipAllowedAt: "2026-07-12T12:00:25.000Z",
    });
  });

  test("does not lock video and fails closed before text is connected", () => {
    expect(textSkipCooldown(match("video"), 0)).toEqual({
      allowed: true,
      retryAfterMs: 0,
    });
    const waiting = match("text");
    delete waiting.connectedAt;
    expect(textSkipCooldown(waiting, 0)).toEqual({
      allowed: false,
      retryAfterMs: 25_000,
      skipAllowedAt: undefined,
    });
  });
});

describe("matching criteria", () => {
  const base = {
    country: "BD",
    language: "en",
    interests: ["music"],
    countryPreference: null,
    languagePreference: null,
    interestTags: [],
    genderIdentity: "prefer_not_to_say" as const,
    genderPreference: "everyone" as const,
    allowPreferenceRelaxation: false,
  };

  test("requires symmetric hard gender compatibility", () => {
    const man = { ...base, genderIdentity: "man" as const };
    const wantsWomen = { ...base, genderPreference: "women" as const };
    expect(criteriaCompatible(man, wantsWomen)).toBe(false);
  });

  test("relaxes interests before country and language, never gender", () => {
    const first = {
      ...base,
      countryPreference: "US",
      interestTags: ["books"],
      allowPreferenceRelaxation: true,
    };
    const second = {
      ...base,
      interests: ["sports"],
      allowPreferenceRelaxation: true,
    };
    expect(criteriaCompatible(first, second, 14_999)).toBe(false);
    expect(criteriaCompatible(first, second, 15_000)).toBe(false);
    expect(criteriaCompatible(first, second, 30_000)).toBe(true);
  });
});
