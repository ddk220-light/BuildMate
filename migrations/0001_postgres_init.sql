-- BuildMate PostgreSQL Schema
-- Consolidated schema for complete Railway deployment.

-- Main builds table
CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    user_session_id TEXT NOT NULL,
    description TEXT NOT NULL,
    budget_min REAL NOT NULL,
    budget_max REAL NOT NULL,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    current_step INTEGER DEFAULT 0,
    structure_json TEXT,
    build_name TEXT,
    existing_items_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Build items table (selected components)
CREATE TABLE IF NOT EXISTS build_items (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    component_type TEXT NOT NULL,
    product_name TEXT,
    product_brand TEXT,
    product_price REAL,
    product_url TEXT,
    product_specs TEXT,
    product_image_url TEXT,
    review_score REAL,
    review_url TEXT,
    compatibility_note TEXT,
    is_existing INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
    best_for TEXT,
    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Options shown to user (for analytics and preventing duplicates)
CREATE TABLE IF NOT EXISTS build_options_shown (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    options_json TEXT NOT NULL,
    shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI request/response logging (for debugging and analytics)
CREATE TABLE IF NOT EXISTS ai_logs (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared builds table for URL sharing
CREATE TABLE IF NOT EXISTS shared_builds (
    id TEXT PRIMARY KEY,
    share_code TEXT UNIQUE NOT NULL,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    build_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    view_count INTEGER DEFAULT 0
);

-- User feedback table
CREATE TABLE IF NOT EXISTS build_feedback (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parsed existing items (from AI parser)
CREATE TABLE IF NOT EXISTS parsed_existing_items (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    product_name TEXT,
    brand TEXT,
    category TEXT,
    estimated_price REAL,
    key_spec TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_builds_session ON builds(user_session_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_name ON builds(build_name);
CREATE INDEX IF NOT EXISTS idx_items_build ON build_items(build_id);
CREATE INDEX IF NOT EXISTS idx_items_step ON build_items(build_id, step_index);
CREATE INDEX IF NOT EXISTS idx_options_build ON build_options_shown(build_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_build ON ai_logs(build_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent ON ai_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_shared_code ON shared_builds(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_build ON shared_builds(build_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_build ON build_feedback(build_id);
CREATE INDEX IF NOT EXISTS idx_parsed_items_build ON parsed_existing_items(build_id);
