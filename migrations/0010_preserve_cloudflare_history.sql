-- Preserve metadata from the original Cloudflare D1 database alongside Railway data.
-- The old random cleanup triggers can delete imported history during unrelated
-- inserts/status changes. Retain the migrated history until an explicit retention
-- policy is chosen; both original exports are kept separately for recovery.
DROP TRIGGER IF EXISTS trg_cleanup_ai_logs ON ai_logs;
DROP TRIGGER IF EXISTS trg_cleanup_build_options ON builds;
ALTER TABLE build_items ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP;
ALTER TABLE build_items ADD COLUMN IF NOT EXISTS modification_count INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS build_events (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data TEXT,
    step_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS build_metrics (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL UNIQUE REFERENCES builds(id) ON DELETE CASCADE,
    time_to_complete_ms INTEGER,
    total_cost REAL,
    budget_min REAL,
    budget_max REAL,
    budget_adherence TEXT,
    step_count INTEGER DEFAULT 3,
    options_shown_count INTEGER DEFAULT 0,
    modifications_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
