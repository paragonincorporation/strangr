import { describe, expect, test } from "vitest";
import { parseClientPublicConfig, parseServerConfig } from "./index.js";
describe("validated configuration", () => {
    test("provides safe local defaults", () => expect(parseServerConfig({ NODE_ENV: "test" })).toMatchObject({
        API_PORT: 3000,
        COUNTRY_HEADER_NAME: "x-paramingle-country",
        LOCAL_COUNTRY_CODE: "BD",
    }));
    test("prefers the platform-provided port and parses exact origin lists", () => {
        const result = parseServerConfig({
            NODE_ENV: "test",
            API_PORT: "3000",
            PORT: "10000",
            WEB_ALLOWED_ORIGINS: "https://example.com, https://preview.example.com",
        });
        expect(result.API_PORT).toBe(10000);
        expect(result.WEB_ALLOWED_ORIGINS).toEqual([
            "https://example.com",
            "https://preview.example.com",
        ]);
    });
    test("names invalid production variables without values", () => {
        expect(() => parseServerConfig({
            NODE_ENV: "production",
            DATABASE_URL: "secret-value",
        })).toThrow(/REDIS_URL/);
        expect(() => parseServerConfig({
            NODE_ENV: "production",
            DATABASE_URL: "secret-value",
        })).not.toThrow(/secret-value/);
    });
    test("client config accepts public keys only", () => {
        const result = parseClientPublicConfig({
            VITE_API_URL: "https://api.example.com",
            VITE_SUPABASE_URL: "https://db.example.com",
            VITE_SUPABASE_ANON_KEY: "public",
            VITE_DEPLOYMENT_ENVIRONMENT: "staging",
            DATABASE_URL: "nope",
        });
        expect(result).not.toHaveProperty("DATABASE_URL");
    });
});
