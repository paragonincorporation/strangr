# ADR 0003: Supabase Auth, Postgres, and Storage

Status: accepted by `plan.md`  
Date: July 11, 2026

## Decision

Use Supabase Auth for verified email/password and Google, managed Postgres as the durable system of record, and Supabase Storage for processed avatars/cosmetic assets. Clients use Supabase directly only for authentication flows; business data goes through the Paramingle API.

## Consequences

The API validates provider JWTs and owns matching, friendship, privacy, messaging, billing, and moderation rules. RLS/Storage policies remain defense in depth. Custom password/session infrastructure is avoided.
