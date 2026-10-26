# Buildmate on Vercel

The frontend is built by Vite into `dist/client`; `api/index.ts` runs the existing Hono API as a Node.js 24 Function. API requests remain under `/api` and SPA routes fall back to `index.html`. The function includes the domain-skill Markdown files.

The PostgreSQL driver uses a small pool attached to the Vercel function lifecycle. Production uses the pooled Neon `DATABASE_URL`; schema changes and restores use the direct `DATABASE_URL_UNPOOLED`. Apply `migrations/0009_postgres_skill_columns.sql` once to add the nullable fields already used by the application. Existing data is preserved.

Required production settings: `DATABASE_URL`, `GEMINI_API_KEY`, and `ENVIRONMENT=production`. Keep all credentials in the Vercel environment settings. Never commit database dumps or environment files. Preview deployments require a separate database before use; do not share production credentials with untrusted previews.

The canonical domain is `shopabuild.com`, with `www.shopabuild.com` redirecting to it. DNS stays in Cloudflare. Use the exact DNS targets from the Vercel domain verification command; preserve unrelated records. Share URLs use the request origin.

Validate with `npm run typecheck:server`, `npm run build`, `/api/health` reporting `database: connected`, existing build and shared-build reads, and a create → generate → select → complete → share flow.

The standalone `npm start` server remains available for local development or recovery. Restore a PostgreSQL dump into an empty compatible database, apply the additive migration, configure the existing Gemini key, and deploy the saved source revision.

Keep Railway running until the new public hostname, TLS, database, and AI flow pass. Freeze the old web service before the final source-data comparison. Only then retire its database, volume, and project. Railway may retain a scheduled-deletion recovery window; report its actual state and any previously accrued charges separately.
