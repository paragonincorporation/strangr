import { createHash } from "node:crypto";

export type TurnstileResult = {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export class AbuseProtection {
  constructor(
    private readonly secret: string,
    private readonly hostnames: readonly string[],
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  networkPrefix(value: string) {
    const prefix = value.includes(":")
      ? value.split(":").slice(0, 4).join(":")
      : value.split(".").slice(0, 3).join(".");
    return createHash("sha256").update(prefix).digest("hex").slice(0, 24);
  }

  async verify(token: string, action: string, remoteIp?: string) {
    const body = new URLSearchParams({
      secret: this.secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    });
    const response = await this.fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    if (!response.ok) throw new Error("challenge_provider_unavailable");
    const result = (await response.json()) as TurnstileResult;
    if (
      !result.success ||
      result.action !== action ||
      !result.hostname ||
      !this.hostnames.includes(result.hostname)
    )
      throw new Error("challenge_invalid");
    return true;
  }
}
