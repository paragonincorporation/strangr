# Environment setup and ownership

Paramingle has four isolated environments: local, CI, staging, and production. Never connect a preview or local client to production data, Redis, storage, auth, or Stripe.

## Manual account checklist

Create organization-owned accounts and require MFA for GitHub, Supabase, Vercel, Render, the TURN vendor, Stripe, SMTP, DNS/edge, monitoring, analytics, and support. Record a human owner and backup owner in the private operations register. Do not put names or secrets in this repository.

For staging and production, create separate Supabase projects, Stripe modes/configuration, Render services, Redis instances, storage buckets, OAuth clients, Turnstile widgets, monitoring projects, and Vercel environment variables. Preview deployments use staging-only public keys and an exact preview-origin allowlist.

## Secret placement

- Vercel web: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEPLOYMENT_ENVIRONMENT` only.
- Vercel admin: `VITE_API_URL` and `VITE_DEPLOYMENT_ENVIRONMENT`; admin auth configuration must remain public-client data only.
- Render API/worker: every server variable in `.env.example`, using provider secret storage. `EDGE_PROXY_SECRET` must match the Cloudflare Worker secret and must never be a `VITE_*` variable.
- Cloudflare Worker: `ORIGIN_URL` is the non-secret Render origin; `EDGE_PROXY_SECRET` is stored with Wrangler or the Cloudflare dashboard.
- GitHub Actions: integration credentials are ephemeral service-container values. Production secrets do not belong in CI.

After entry, rotate one credential at a time and run readiness/smoke checks. Revoke departed operators immediately. Review access quarterly.

## Verification

1. Run `npm ci`, `npm run check`, and `npm run build`.
2. Confirm client secret scanning passes.
3. Apply migrations to staging with the migration role.
4. Verify `/health/live` and `/health/ready`.
5. Verify an unrelated Origin is rejected for HTTP and WebSocket traffic.
6. Verify the trusted edge overwrites the country header.
7. Verify staging email, OAuth, avatar storage, Redis, TURN, and Stripe sandbox independently.
8. Perform the release smoke checks in `deployment.md`.

Production remains blocked until every provider row has an owner, MFA, billing method, recovery method, rotation procedure, and successful staging verification.
