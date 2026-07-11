import { z } from 'zod';
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
    .refine((value) => hasProtocol(value, ['postgres:', 'postgresql:']), 'must be a postgres URL');
const redisUrlSchema = z
    .string()
    .refine((value) => hasProtocol(value, ['redis:', 'rediss:']), 'must be a Redis URL');
const booleanSchema = z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true');
const base64KeySchema = z.string().refine((value) => {
    try {
        return Buffer.from(value, 'base64').byteLength === 32;
    }
    catch {
        return false;
    }
}, 'must be a base64-encoded 32-byte key');
const commonServerSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_HOST: z.string().min(1).default('0.0.0.0'),
    API_PORT: portSchema.default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
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
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    DEPLOYMENT_ENVIRONMENT: z.string().min(1),
    DEPLOYMENT_REVISION: z.string().min(1),
    OPENAPI_ENABLED: booleanSchema,
});
const localDefaults = {
    DATABASE_URL: 'postgresql://strangr:strangr_local_only@localhost:5432/strangr',
    REDIS_URL: 'redis://localhost:6379',
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_JWT_ISSUER: 'http://127.0.0.1:54321/auth/v1',
    SUPABASE_JWT_AUDIENCE: 'authenticated',
    SUPABASE_JWKS_URL: 'http://127.0.0.1:54321/auth/v1/.well-known/jwks.json',
    SUPABASE_STORAGE_BUCKET: 'avatars',
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-placeholder',
    CURRENT_TERMS_VERSION: 'beta-2026-07',
    CURRENT_GUIDELINES_VERSION: 'beta-2026-07',
    BIRTH_DATE_KEY_ID: 'local-v1',
    BIRTH_DATE_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    TURN_URLS: 'turn:localhost:3478',
    TURN_CREDENTIAL_SECRET: 'local-only-turn-secret-32-characters',
    STRIPE_SECRET_KEY: 'sk_test_local_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_local_placeholder',
    DEPLOYMENT_ENVIRONMENT: 'local',
    DEPLOYMENT_REVISION: 'development',
    OPENAPI_ENABLED: 'true',
};
export function parseServerConfig(environment) {
    const input = environment.NODE_ENV === 'production' ? environment : { ...localDefaults, ...environment };
    const result = commonServerSchema.safeParse(input);
    if (!result.success) {
        const reasons = result.error.issues
            .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
            .join('; ');
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
