import { z } from "zod";
const portSchema = z.coerce.number().int().min(1).max(65_535);
function hasProtocol(value, protocols) {
    try {
        return protocols.includes(new URL(value).protocol);
    }
    catch {
        return false;
    }
}
const postgresUrlSchema = z
    .string()
    .refine((value) => hasProtocol(value, ["postgres:", "postgresql:"]), "must be a postgres URL");
const redisUrlSchema = z
    .string()
    .refine((value) => hasProtocol(value, ["redis:", "rediss:"]), "must be a Redis URL");
const booleanSchema = z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true");
const originSchema = z.url().refine((value) => {
    const url = new URL(value);
    return value === url.origin;
}, "must be an origin without a path, query, or fragment");
const originListSchema = z
    .string()
    .transform((value) => value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean))
    .pipe(z.array(originSchema).min(1));
const base64KeySchema = z.string().refine((value) => {
    try {
        return Buffer.from(value, "base64").byteLength === 32;
    }
    catch {
        return false;
    }
}, "must be a base64-encoded 32-byte key");
const commonServerSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    API_HOST: z.string().min(1).default("0.0.0.0"),
    API_PORT: portSchema.default(3000),
    WEB_ALLOWED_ORIGINS: originListSchema,
    ADMIN_ALLOWED_ORIGINS: originListSchema,
    PREVIEW_ALLOWED_ORIGINS: z
        .string()
        .default("")
        .transform((value) => value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean))
        .pipe(z.array(originSchema)),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),
    DATABASE_URL: postgresUrlSchema,
    REDIS_URL: redisUrlSchema,
    SUPABASE_URL: z.url(),
    SUPABASE_JWT_ISSUER: z.url(),
    SUPABASE_JWT_AUDIENCE: z.string().min(1),
    SUPABASE_JWKS_URL: z.url(),
    SUPABASE_STORAGE_BUCKET: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CURRENT_TERMS_VERSION: z.string().min(1).max(64),
    CURRENT_GUIDELINES_VERSION: z.string().min(1).max(64),
    BIRTH_DATE_KEY_ID: z.string().min(1).max(64),
    BIRTH_DATE_ENCRYPTION_KEY: base64KeySchema,
    TURN_URLS: z.string().min(1),
    TURN_CREDENTIAL_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    DEPLOYMENT_ENVIRONMENT: z.string().min(1),
    DEPLOYMENT_REVISION: z.string().min(1),
    OPENAPI_ENABLED: booleanSchema,
    MESSAGE_DELETE_FOR_EVERYONE_SECONDS: z.coerce
        .number()
        .int()
        .min(60)
        .max(86_400)
        .default(900),
    DIRECT_CALL_RING_SECONDS: z.coerce
        .number()
        .int()
        .min(10)
        .max(120)
        .default(30),
});
const localDefaults = {
    DATABASE_URL: "postgresql://paramingle:paramingle_local_only@localhost:5432/paramingle",
    REDIS_URL: "redis://localhost:6379",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_JWT_ISSUER: "http://127.0.0.1:54321/auth/v1",
    SUPABASE_JWT_AUDIENCE: "authenticated",
    SUPABASE_JWKS_URL: "http://127.0.0.1:54321/auth/v1/.well-known/jwks.json",
    SUPABASE_STORAGE_BUCKET: "avatars",
    SUPABASE_SERVICE_ROLE_KEY: "local-service-role-placeholder",
    CURRENT_TERMS_VERSION: "beta-2026-07",
    CURRENT_GUIDELINES_VERSION: "beta-2026-07",
    BIRTH_DATE_KEY_ID: "local-v1",
    BIRTH_DATE_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    TURN_URLS: "turn:localhost:3478",
    TURN_CREDENTIAL_SECRET: "local-only-turn-secret-32-characters",
    STRIPE_SECRET_KEY: "sk_test_local_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_local_placeholder",
    DEPLOYMENT_ENVIRONMENT: "local",
    DEPLOYMENT_REVISION: "development",
    OPENAPI_ENABLED: "true",
    MESSAGE_DELETE_FOR_EVERYONE_SECONDS: "900",
    DIRECT_CALL_RING_SECONDS: "30",
    WEB_ALLOWED_ORIGINS: "http://localhost:5173",
    ADMIN_ALLOWED_ORIGINS: "http://localhost:5174",
    PREVIEW_ALLOWED_ORIGINS: "",
};
export function parseServerConfig(environment) {
    const normalized = {
        ...environment,
        API_PORT: environment.PORT ?? environment.API_PORT,
    };
    const input = environment.NODE_ENV === "production"
        ? normalized
        : { ...localDefaults, ...normalized };
    const result = commonServerSchema.safeParse(input);
    if (!result.success) {
        const reasons = result.error.issues
            .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
            .join("; ");
        throw new Error(`Invalid server configuration: ${reasons}`);
    }
    return result.data;
}
export const clientPublicConfigSchema = z.object({
    VITE_API_URL: z.url(),
    VITE_SUPABASE_URL: z.url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),
    VITE_DEPLOYMENT_ENVIRONMENT: z.string().min(1),
});
export function parseClientPublicConfig(environment) {
    return clientPublicConfigSchema.parse(environment);
}
