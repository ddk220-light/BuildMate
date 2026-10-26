# Buildmate on Vercel

The frontend is built by Vite into `dist/client`; `api/index.ts` runs the existing Hono API as a Node.js 24 Function. API requests remain under `/api` and SPA routes fall back to `index.html`. The function includes the domain-skill Markdown files.

The PostgreSQL driver uses a small pool attached to the Vercel function lifecycle. Production uses the pooled Neon `DATABASE_URL`; schema changes and restores use the direct `DATABASE_URL_UNPOOLED`. Apply `migrations/0009_postgres_skill_columns.sql` once to add the nullable fields already used by the application. Existing data is preserved.

The October 2026 migration combines 11 Railway builds with 139 builds from the legacy Cloudflare D1 database behind the custom domain. All 150 build IDs and seven share codes were distinct and retained. Apply `migrations/0010_preserve_cloudflare_history.sql` before importing the D1 history. It preserves legacy item metadata/events and removes the old random cleanup triggers, which otherwise delete imported logs and options during unrelated requests. Review storage and choose an explicit retention policy if needed later. Both original exports are stored privately outside this repository.

Required production settings: `DATABASE_URL`, `GEMINI_API_KEY`, and `ENVIRONMENT=production`. Keep all credentials in the Vercel environment settings. Never commit database dumps or environment files. Preview deployments require a separate database before use; do not share production credentials with untrusted previews.

The canonical domain is `shopabuild.com`, with `www.shopabuild.com` redirecting to it. DNS stays in Cloudflare. Use the exact DNS targets from the Vercel domain verification command; preserve unrelated records. Share URLs use the request origin.

Validate with `npm run typecheck:server`, `npm run build`, `/api/health` reporting `database: connected`, existing build and shared-build reads, and a create → generate → select → complete → share flow.

The standalone `npm start` server remains available for local development or recovery. Restore a PostgreSQL dump into an empty compatible database, apply the additive migration, configure the existing Gemini key, and deploy the saved source revision.

The Vercel project is `buildmate` in scope `ddk220`. Production uses the Neon free plan in the US West region. GitHub `main` is the production deployment branch. Cloudflare continues to hold the domain registration and DNS; the `ha` tunnel records are unrelated and must remain unchanged.

Keep Railway running until the new public hostname, TLS, database, and AI flow pass. Freeze the old web service before the final source-data comparison. Only then retire its database, volume, and project. Railway may retain a scheduled-deletion recovery window; report its actual state and any previously accrued charges separately.
