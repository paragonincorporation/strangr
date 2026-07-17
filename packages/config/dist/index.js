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
const countryCeilingsSchema = z.string().transform((value, context) => {
    const result = {};
    for (const item of value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)) {
        const [country, rawLimit, ...extra] = item.split(":");
        const limit = Number(rawLimit);
        if (extra.length ||
            !country ||
            !/^[A-Z]{2}$/.test(country) ||
            !Number.isInteger(limit) ||
            limit < 1) {
            context.addIssue({
                code: "custom",
                message: "must be comma-separated COUNTRY:positive-integer entries",
            });
            return z.NEVER;
        }
        result[country] = limit;
    }
    if (!Object.keys(result).length) {
        context.addIssue({ code: "custom", message: "must not be empty" });
        return z.NEVER;
    }
    return result;
});
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
    SUPABASE_PRIVACY_EXPORT_BUCKET: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CURRENT_TERMS_VERSION: z.string().min(1).max(64),
    CURRENT_PRIVACY_VERSION: z.string().min(1).max(64),
    CURRENT_GUIDELINES_VERSION: z.string().min(1).max(64),
    BIRTH_DATE_KEY_ID: z.string().min(1).max(64),
    BIRTH_DATE_ENCRYPTION_KEY: base64KeySchema,
    TURN_URLS: z.string().min(1),
    TURN_CREDENTIAL_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    TURNSTILE_SECRET_KEY: z.string().min(1),
    TURNSTILE_ALLOWED_HOSTNAMES: z
        .string()
        .transform((value) => value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean))
        .pipe(z.array(z.string().min(1)).min(1)),
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
    GLOBAL_CONCURRENCY_CEILING: z.coerce.number().int().min(1),
    COUNTRY_CONCURRENCY_CEILINGS: countryCeilingsSchema,
    COUNTRY_HEADER_NAME: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .default("cf-ipcountry"),
    EDGE_PROXY_SECRET: z.string().min(32),
    LOCAL_COUNTRY_CODE: z
        .string()
        .regex(/^[A-Z]{2}$/)
        .default("BD"),
});
const localDefaults = {
    DATABASE_URL: "postgresql://paramingle:paramingle_local_only@localhost:5432/paramingle",
    REDIS_URL: "redis://localhost:6379",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_JWT_ISSUER: "http://127.0.0.1:54321/auth/v1",
    SUPABASE_JWT_AUDIENCE: "authenticated",
    SUPABASE_JWKS_URL: "http://127.0.0.1:54321/auth/v1/.well-known/jwks.json",
    SUPABASE_STORAGE_BUCKET: "avatars",
    SUPABASE_PRIVACY_EXPORT_BUCKET: "privacy-exports",
    SUPABASE_SERVICE_ROLE_KEY: "local-service-role-placeholder",
    CURRENT_TERMS_VERSION: "beta-2026-07",
    CURRENT_PRIVACY_VERSION: "beta-2026-07",
    CURRENT_GUIDELINES_VERSION: "beta-2026-07",
    BIRTH_DATE_KEY_ID: "local-v1",
    BIRTH_DATE_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    TURN_URLS: "turn:localhost:3478",
    TURN_CREDENTIAL_SECRET: "local-only-turn-secret-32-characters",
    STRIPE_SECRET_KEY: "sk_test_local_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_local_placeholder",
    TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    TURNSTILE_ALLOWED_HOSTNAMES: "localhost",
    DEPLOYMENT_ENVIRONMENT: "local",
    DEPLOYMENT_REVISION: "development",
    OPENAPI_ENABLED: "true",
    MESSAGE_DELETE_FOR_EVERYONE_SECONDS: "900",
    DIRECT_CALL_RING_SECONDS: "30",
    GLOBAL_CONCURRENCY_CEILING: "1000",
    COUNTRY_CONCURRENCY_CEILINGS: "BD:1000",
    COUNTRY_HEADER_NAME: "x-paramingle-country",
    EDGE_PROXY_SECRET: "local-only-edge-proxy-secret-32-characters",
    LOCAL_COUNTRY_CODE: "BD",
    WEB_ALLOWED_ORIGINS: "http://localhost:5173",
    ADMIN_ALLOWED_ORIGINS: "http://localhost:5174",
    PREVIEW_ALLOWED_ORIGINS: "",
};
export function parseServerConfig(environment) {
    const normalized = {
        ...environment,
        API_PORT: environment.PORT ?? environment.API_PORT,
        ...((environment.DEPLOYMENT_REVISION ?? environment.RENDER_GIT_COMMIT)
            ? {
                DEPLOYMENT_REVISION: environment.DEPLOYMENT_REVISION ?? environment.RENDER_GIT_COMMIT,
            }
            : {}),
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
    if (result.data.NODE_ENV === "production") {
        const placeholders = [
            "placeholder",
            "local-only",
            "development",
            "example.com",
            "localhost",
            "127.0.0.1",
        ];
        const sensitive = [
            "DATABASE_URL",
            "REDIS_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "BIRTH_DATE_ENCRYPTION_KEY",
            "TURN_CREDENTIAL_SECRET",
            "EDGE_PROXY_SECRET",
            "STRIPE_SECRET_KEY",
            "STRIPE_WEBHOOK_SECRET",
            "TURNSTILE_SECRET_KEY",
        ];
        const unsafe = sensitive.filter((key) => placeholders.some((token) => String(result.data[key]).includes(token)));
        if (unsafe.length)
            throw new Error(`Invalid server configuration: production placeholders are forbidden for ${unsafe.join(", ")}`);
        const insecureOrigins = [
            ...result.data.WEB_ALLOWED_ORIGINS,
            ...result.data.ADMIN_ALLOWED_ORIGINS,
            ...result.data.PREVIEW_ALLOWED_ORIGINS,
        ].filter((origin) => new URL(origin).protocol !== "https:");
        if (insecureOrigins.length)
            throw new Error("Invalid server configuration: production origins must use https");
        const insecureSupabaseUrls = [
            result.data.SUPABASE_URL,
            result.data.SUPABASE_JWT_ISSUER,
            result.data.SUPABASE_JWKS_URL,
        ].filter((url) => new URL(url).protocol !== "https:");
        if (insecureSupabaseUrls.length)
            throw new Error("Invalid server configuration: production Supabase URLs must use https");
    }
    return result.data;
}
export const clientPublicConfigSchema = z
    .object({
    VITE_API_URL: z.url(),
    VITE_SUPABASE_URL: z.url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),
    VITE_DEPLOYMENT_ENVIRONMENT: z.string().min(1),
})
    .superRefine((value, context) => {
    if (value.VITE_DEPLOYMENT_ENVIRONMENT !== "production")
        return;
    for (const key of ["VITE_API_URL", "VITE_SUPABASE_URL"])
        if (new URL(value[key]).protocol !== "https:")
            context.addIssue({
                code: "custom",
                path: [key],
                message: "must use https in production",
            });
});
export function parseClientPublicConfig(environment) {
    return clientPublicConfigSchema.parse(environment);
}
