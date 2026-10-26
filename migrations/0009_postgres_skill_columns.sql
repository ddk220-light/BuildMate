-- Apply the existing domain-skill schema to PostgreSQL during the Vercel migration.
-- Idempotent and additive; existing builds retain their data and NULL skill fields.
ALTER TABLE builds ADD COLUMN IF NOT EXISTS skill_id TEXT;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS skill_confidence INTEGER;
