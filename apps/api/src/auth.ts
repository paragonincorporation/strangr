import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { ServerConfig } from "@paramingle/config";
import type { AccountState } from "@paramingle/contracts";

export interface VerifiedIdentity {
  subject: string;
  emailVerified: boolean;
  provider: string;
  authSessionId: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}

export function createSupabaseTokenVerifier(
  config: ServerConfig,
): TokenVerifier {
  const keys = createRemoteJWKSet(new URL(config.SUPABASE_JWKS_URL), {
    cooldownDuration: 30_000,
  });
  return {
    async verify(token) {
      const { payload } = await jwtVerify(token, keys, {
        issuer: config.SUPABASE_JWT_ISSUER,
        audience: config.SUPABASE_JWT_AUDIENCE,
      });
      return identityFromClaims(payload);
    },
  };
}

export function identityFromClaims(payload: JWTPayload): VerifiedIdentity {
  if (!payload.sub) throw new Error("Token subject is missing");
  const metadata =
    typeof payload.user_metadata === "object" && payload.user_metadata
      ? (payload.user_metadata as Record<string, unknown>)
      : {};
  const app =
    typeof payload.app_metadata === "object" && payload.app_metadata
      ? (payload.app_metadata as Record<string, unknown>)
      : {};
  const provider = typeof app.provider === "string" ? app.provider : "email";
  const emailVerified =
    provider !== "email" ||
    typeof payload.email_confirmed_at === "string" ||
    metadata.email_verified === true;
  return {
    subject: payload.sub,
    emailVerified,
    provider,
    authSessionId:
      typeof payload.session_id === "string"
        ? payload.session_id
        : (payload.jti ?? payload.sub),
  };
}

export type Capability = "inspect_self" | "profile_setup" | "contact";
export function capabilityError(
  state: AccountState,
  verified: boolean,
  capability: Capability,
) {
  if (state === "banned" || state === "deleted")
    return "account_banned" as const;
  if (state === "suspended") return "account_suspended" as const;
  if (state === "limited" && capability === "contact")
    return "account_limited" as const;
  if (state === "deletion_pending") return "deletion_pending" as const;
  if (!verified && capability === "contact") return "email_unverified" as const;
  if (
    (state === "pending_verification" || state === "onboarding") &&
    capability === "contact"
  )
    return "onboarding_required" as const;
  return null;
}
