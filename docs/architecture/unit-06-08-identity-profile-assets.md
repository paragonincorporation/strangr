# Units 6–8: identity, profiles, and safe avatar assets

Implemented July 12, 2026.

## Boundaries

- Supabase access tokens are verified against the configured JWKS issuer and audience. The API derives subject, provider verification, and auth session from verified claims only.
- First access reconciles the subject to one internal account and a revocable, minimally labelled device session in a transaction.
- Capability guards return stable account-state errors. Contact is denied before verification/onboarding and for limited, suspended, banned, deletion-pending, or deleted accounts.
- Onboarding is resumable by step. Birth dates are validated using UTC calendar boundaries, encrypted, and converted to a server-owned cohort. A request after the eighteenth birthday reconciles a minor account before authorization.
- Policy acceptances use configured immutable version identifiers. Profiles use exact normalized username discovery and a centralized field projection.
- Avatar uploads are private and quarantined. Only JPEG, PNG, and WebP up to 5 MiB enter the flow. Sharp decodes with a pixel limit, rejects animation/invalid formats, applies orientation, strips metadata, crops to 512×512, and emits immutable WebP objects.
- Finalization checks ownership and atomically activates the processed key. Old/quarantine objects are removed; the worker marks expired uploads abandoned.

## Operations

Apply `0002_auth_profiles_avatars.sql` explicitly. Configure Supabase Auth redirect URLs, Google OAuth, the private `avatars` bucket, and `SUPABASE_SERVICE_ROLE_KEY`. Browser code receives only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Storage policies must deny direct public object access. The service role is server-only. Production malware scanning can be inserted while an upload remains in `processing`; safe image decoding/re-encoding is mandatory regardless of scanner availability.
