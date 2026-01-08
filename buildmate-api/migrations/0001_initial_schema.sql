-- BuildMate Experiment Phase Schema
-- Version: 1.0
-- Date: January 2026

-- Main builds table
CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    user_session_id TEXT NOT NULL,
    description TEXT NOT NULL,
    budget_min REAL NOT NULL,
    budget_max REAL NOT NULL,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    current_step INTEGER DEFAULT 0,
    structure_json TEXT,  -- Stores the 3 component types determined by AI
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

-- Build items table (selected components)
CREATE TABLE IF NOT EXISTS build_items (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    component_type TEXT NOT NULL,
    product_name TEXT,
    product_brand TEXT,
    product_price REAL,
    product_url TEXT,
    product_specs TEXT,  -- JSON string of specifications
    product_image_url TEXT,
    review_score REAL,
    review_url TEXT,
    compatibility_note TEXT,
    selected_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

-- Options shown to user (for analytics and preventing duplicates)
CREATE TABLE IF NOT EXISTS build_options_shown (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    options_json TEXT NOT NULL,  -- JSON array of 3 options shown
    shown_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

-- AI request/response logging (for debugging and analytics)
CREATE TABLE IF NOT EXISTS ai_logs (
    id TEXT PRIMARY KEY,
    build_id TEXT,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('structure', 'option', 'instruction')),
    request_prompt TEXT NOT NULL,
    response_json TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    latency_ms INTEGER,
    success INTEGER DEFAULT 1,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_builds_session ON builds(user_session_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_items_build ON build_items(build_id);
CREATE INDEX IF NOT EXISTS idx_items_step ON build_items(build_id, step_index);
CREATE INDEX IF NOT EXISTS idx_options_build ON build_options_shown(build_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_build ON ai_logs(build_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent ON ai_logs(agent_type);
