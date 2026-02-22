-- Phase 2 Schema Updates
-- Version: 2.0
-- Date: January 2026

-- Add existing items to builds table
ALTER TABLE builds ADD COLUMN existing_items_text TEXT;

-- SQLite doesn't support ALTER CONSTRAINT, so we need to recreate ai_logs table
-- to add 'existing_items' to the agent_type check constraint
-- For now, we'll create a new table without the constraint and rely on application-level validation
-- This is a pragmatic approach for D1/SQLite

-- Create new ai_logs table without the restrictive CHECK constraint
CREATE TABLE IF NOT EXISTS ai_logs_new (
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

-- Copy data from old table if it exists
INSERT OR IGNORE INTO ai_logs_new SELECT * FROM ai_logs;

-- Drop old table and rename new one
DROP TABLE IF EXISTS ai_logs;
ALTER TABLE ai_logs_new RENAME TO ai_logs;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_ai_logs_build ON ai_logs(build_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent ON ai_logs(agent_type);

-- Add flags to build_items for existing/locked items and functionality-based options
ALTER TABLE build_items ADD COLUMN is_existing INTEGER DEFAULT 0;
ALTER TABLE build_items ADD COLUMN is_locked INTEGER DEFAULT 0;
ALTER TABLE build_items ADD COLUMN best_for TEXT;

-- Shared builds table for URL sharing
CREATE TABLE IF NOT EXISTS shared_builds (
    id TEXT PRIMARY KEY,
    share_code TEXT UNIQUE NOT NULL,
    build_id TEXT NOT NULL,
    build_snapshot TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    view_count INTEGER DEFAULT 0,
    FOREIGN KEY (build_id) REFERENCES builds(id)
);

CREATE INDEX IF NOT EXISTS idx_shared_code ON shared_builds(share_code);

-- User feedback table
CREATE TABLE IF NOT EXISTS build_feedback (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL,
    feedback_text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_build ON build_feedback(build_id);

-- Parsed existing items (from AI parser)
CREATE TABLE IF NOT EXISTS parsed_existing_items (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    product_name TEXT,
    brand TEXT,
    category TEXT,
    estimated_price REAL,
    key_spec TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id)
);

CREATE INDEX IF NOT EXISTS idx_parsed_items_build ON parsed_existing_items(build_id);
