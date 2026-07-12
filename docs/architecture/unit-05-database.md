# Unit 5 database operations

Identity/profile persistence is owned by `@paramingle/database`. The API service role is the only application role granted business-table writes; browser clients receive no grants. Supabase Storage policies arrive with Unit 8.

Use `npm run dev:services`, then `npm run db:migrate`. `npm run db:reset` destroys local volumes only. Production migration is an explicit release step using a migration role; API and worker startup never migrate automatically. Deployed migrations are forward-only.

Birth-date keys come from the secret manager and are named by `BIRTH_DATE_KEY_ID`. The normal identity repository excludes encrypted birth-date columns; exact dates cross the encryption boundary only in restricted onboarding and age-reconciliation code.
