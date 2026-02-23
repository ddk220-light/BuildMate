-- Optimization Migration: JSONB encoding and Automatic Data Retention
-- Note: This is designed to be run after 0001_postgres_init.sql

-- 1. Convert large TEXT JSON columns to highly-compressed JSONB
ALTER TABLE builds 
  ALTER COLUMN structure_json TYPE JSONB USING structure_json::JSONB;

ALTER TABLE build_options_shown 
  ALTER COLUMN options_json TYPE JSONB USING options_json::JSONB;

ALTER TABLE ai_logs 
  ALTER COLUMN response_json TYPE JSONB USING response_json::JSONB;


-- 2. Setup AI Logs Retention Policy (14 Days)
-- Create a function that deletes logs older than 14 days
CREATE OR REPLACE FUNCTION delete_old_ai_logs() RETURNS void AS $$
BEGIN
  DELETE FROM ai_logs WHERE created_at < NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql;

-- 3. Automatic GC trigger (Runs cleanup occasionally when new logs are inserted)
-- Note: Postgres doesn't have native CRON without extensions like pg_cron.
-- Since this is an unmanaged Railway Postgres, a lightweight trigger approach is safer.
-- We only run the delete probabilistically (e.g., 1% of the time) or on every 100th insert
-- to avoid slowing down every single AI log write. For simplicity, we'll run it on insert
-- but ensure the query is fast using the index.

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at);

CREATE OR REPLACE FUNCTION trigger_ai_logs_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Probabilistic cleanup (runs roughly 1% of the time)
  IF random() < 0.01 THEN
    PERFORM delete_old_ai_logs();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_ai_logs ON ai_logs;

CREATE TRIGGER trg_cleanup_ai_logs
  AFTER INSERT ON ai_logs
  EXECUTE FUNCTION trigger_ai_logs_cleanup();

-- 4. Options Shown GC
-- Remove options cache for builds that are no longer 'in_progress'
CREATE OR REPLACE FUNCTION cleanup_abandoned_build_options() RETURNS void AS $$
BEGIN
  DELETE FROM build_options_shown
  WHERE build_id IN (
    SELECT id FROM builds WHERE status != 'in_progress'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_build_options_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  IF random() < 0.05 THEN
    PERFORM cleanup_abandoned_build_options();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_build_options ON builds;

-- Run when a build status changes
CREATE TRIGGER trg_cleanup_build_options
  AFTER UPDATE OF status ON builds
  FOR EACH ROW
  WHEN (OLD.status = 'in_progress' AND NEW.status != 'in_progress')
  EXECUTE FUNCTION trigger_build_options_cleanup();
