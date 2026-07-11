import { describe, expect, test } from 'vitest';
import { parseClientPublicConfig, parseServerConfig } from './index.js';
describe('validated configuration', () => {
    test('provides safe local defaults', () => expect(parseServerConfig({ NODE_ENV: 'test' }).API_PORT).toBe(3000));
    test('names invalid production variables without values', () => {
        expect(() => parseServerConfig({ NODE_ENV: 'production', DATABASE_URL: 'secret-value' })).toThrow(/REDIS_URL/);
        expect(() => parseServerConfig({ NODE_ENV: 'production', DATABASE_URL: 'secret-value' })).not.toThrow(/secret-value/);
    });
    test('client config accepts public keys only', () => {
        const result = parseClientPublicConfig({
            VITE_API_URL: 'https://api.example.com',
            VITE_SUPABASE_URL: 'https://db.example.com',
            VITE_SUPABASE_ANON_KEY: 'public',
            VITE_DEPLOYMENT_ENVIRONMENT: 'staging',
            DATABASE_URL: 'nope',
        });
        expect(result).not.toHaveProperty('DATABASE_URL');
    });
});
