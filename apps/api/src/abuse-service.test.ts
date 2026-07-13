import { describe, expect, test, vi } from "vitest";
import { AbuseProtection } from "./abuse-service.js";

describe("abuse protection", () => {
  test("requires matching action and hostname", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          action: "signup",
          hostname: "app.example",
        }),
    });
    const service = new AbuseProtection(
      "secret",
      ["app.example"],
      fetcher as never,
    );
    await expect(service.verify("token", "signup")).resolves.toBe(true);
    await expect(service.verify("token", "recovery")).rejects.toThrow(
      "challenge_invalid",
    );
  });
  test("uses stable non-reversible network-prefix keys", () => {
    const service = new AbuseProtection("secret", []);
    expect(service.networkPrefix("203.0.113.8")).toBe(
      service.networkPrefix("203.0.113.200"),
    );
    expect(service.networkPrefix("203.0.114.8")).not.toBe(
      service.networkPrefix("203.0.113.8"),
    );
  });
});
