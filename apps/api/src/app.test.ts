import { afterEach, describe, expect, test } from "vitest";
import { parseServerConfig } from "@paramingle/config";
import { countryCodeFromHeaders, createApp } from "./app.js";

const apps: ReturnType<typeof createApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("API foundation", () => {
  test("reports live and ready health without exposing secrets", async () => {
    const app = createApp();
    apps.push(app);
    const live = await app.inject({ method: "GET", url: "/health/live" });
    const ready = await app.inject({ method: "GET", url: "/health/ready" });
    expect(live.statusCode).toBe(200);
    expect(live.json()).toEqual({
      ok: true,
      environment: "local",
      revision: "development",
    });
    expect([200, 503]).toContain(ready.statusCode);
    expect(ready.json()).toEqual({
      ok: ready.statusCode === 200,
      dependencies: {
        postgres: "up",
        redis: ready.statusCode === 200 ? "up" : "down",
      },
    });
  });

  test("publishes OpenAPI only in non-production configured environments", async () => {
    const app = createApp();
    apps.push(app);
    const response = await app.inject({
      method: "GET",
      url: "/documentation/json",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().info.title).toBe("Paramingle API");
  });

  test("rejects protected routes without a bearer token using a stable envelope", async () => {
    const app = createApp();
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/v1/me" });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("unauthenticated");
    expect(response.json().error.requestId).toBeTypeOf("string");
  });

  test("allows configured origins and rejects unrelated browser origins", async () => {
    const app = createApp();
    apps.push(app);
    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/v1/me",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "GET",
      },
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );

    const rejected = await app.inject({
      method: "OPTIONS",
      url: "/v1/me",
      headers: {
        origin: "https://untrusted.example",
        "access-control-request-method": "GET",
      },
    });
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("sets browser hardening headers without exposing response details", async () => {
    const app = createApp();
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health/live" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  test("adds HSTS only for a production-configured API", async () => {
    const config = {
      ...parseServerConfig({ NODE_ENV: "test" }),
      NODE_ENV: "production" as const,
    };
    const app = createApp({ config });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health/live" });
    expect(response.headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });

  test("trusts production country data only from the configured edge", () => {
    const config = {
      ...parseServerConfig({ NODE_ENV: "test" }),
      NODE_ENV: "production" as const,
      COUNTRY_HEADER_NAME: "cf-ipcountry",
      EDGE_PROXY_SECRET: "production-edge-secret-that-is-long-enough",
    };
    expect(countryCodeFromHeaders({ "cf-ipcountry": "BD" }, config)).toBe("ZZ");
    expect(
      countryCodeFromHeaders(
        {
          "cf-ipcountry": "BD",
          "x-paramingle-edge-secret": config.EDGE_PROXY_SECRET,
        },
        config,
      ),
    ).toBe("BD");
    expect(
      countryCodeFromHeaders(
        {
          "cf-ipcountry": "US",
          "x-paramingle-edge-secret": "browser-forged-secret-that-is-invalid",
        },
        config,
      ),
    ).toBe("ZZ");
  });
});
