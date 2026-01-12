-- BuildMate Database Schema
-- Version: 1.0
-- Cloudflare D1 (SQLite)

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    specs TEXT DEFAULT '{}',
    compatibility_tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

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

CREATE INDEX IF NOT EXISTS idx_builds_session ON builds(user_session_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_created ON builds(created_at);

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

CREATE INDEX IF NOT EXISTS idx_items_build ON build_items(build_id);
CREATE INDEX IF NOT EXISTS idx_items_step ON build_items(build_id, step_index);

-- Options shown to user (for analytics and preventing duplicates)
CREATE TABLE IF NOT EXISTS build_options_shown (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    options_json TEXT NOT NULL,  -- JSON array of 3 options shown
    shown_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_options_build ON build_options_shown(build_id);

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

CREATE INDEX IF NOT EXISTS idx_ai_logs_build ON ai_logs(build_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent ON ai_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at);

-- Cache metadata table
CREATE TABLE IF NOT EXISTS cache_metadata (
    key TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_metadata(expires_at);
