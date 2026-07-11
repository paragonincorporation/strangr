# Unit 11A — Deployment foundation

Strangr uses a deliberate frontend/backend hosting boundary. The two Vite clients are independent Vercel projects. Render runs the one-port Fastify HTTP/WebSocket service, bounded maintenance cron, and Redis-compatible realtime state in Singapore. Supabase remains responsible for Auth, Postgres, and Storage. WebRTC media is peer-to-peer or managed-TURN relayed.

Frontend-specific builds prevent a Vercel deployment from building or treating the long-running API and worker as Functions. Application-local Vercel configuration supplies SPA deep-link routing and baseline headers. The API accepts Render's assigned `PORT`, validates exact HTTP and WebSocket origins, and keeps production migrations out of startup.

During private testing, maintenance runs as an hourly bounded cron command. The same entrypoint retains continuous mode for a paid Render Background Worker when later units introduce latency-sensitive or queued jobs. The operational settings and release sequence are recorded in `docs/operations/deployment.md`.
