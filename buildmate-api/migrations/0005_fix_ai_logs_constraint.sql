-- Fix ai_logs table constraint to allow 'existing_items' agent type
-- Version: 2.0.1
-- Date: January 2026

-- SQLite doesn't support ALTER CONSTRAINT, so we recreate the table
-- Create new table without the restrictive CHECK constraint
CREATE TABLE IF NOT EXISTS ai_logs_v2 (
    id TEXT PRIMARY KEY,
    build_id TEXT,
    agent_type TEXT NOT NULL,
    request_prompt TEXT NOT NULL,
    response_json TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    latency_ms INTEGER,
    success INTEGER DEFAULT 1,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Copy data from old table
INSERT OR IGNORE INTO ai_logs_v2 SELECT * FROM ai_logs;

-- Drop old table and rename
DROP TABLE IF EXISTS ai_logs;
ALTER TABLE ai_logs_v2 RENAME TO ai_logs;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_ai_logs_build ON ai_logs(build_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent ON ai_logs(agent_type);
