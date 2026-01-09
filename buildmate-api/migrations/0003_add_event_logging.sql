-- Migration: Add event logging and metrics tables
-- Epic 8: Data Persistence
-- Date: 2026-01-09

-- Build events table for comprehensive event logging
CREATE TABLE IF NOT EXISTS build_events (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'BUILD_STARTED',
        'STRUCTURE_GENERATED',
        'OPTIONS_SHOWN',
        'OPTION_SELECTED',
        'BUILD_COMPLETED',
        'INSTRUCTIONS_GENERATED'
    )),
    event_data TEXT,  -- JSON with event-specific data
    step_index INTEGER,  -- Applicable for step-related events
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_events_build ON build_events(build_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON build_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON build_events(created_at);

-- Build metrics table for aggregated analytics
CREATE TABLE IF NOT EXISTS build_metrics (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL UNIQUE,
    time_to_complete_ms INTEGER,  -- Duration from BUILD_STARTED to BUILD_COMPLETED
    total_cost REAL,  -- Sum of all selected item prices
    budget_min REAL,  -- Original budget min
    budget_max REAL,  -- Original budget max
    budget_adherence TEXT CHECK (budget_adherence IN ('under', 'within', 'over')),
    step_count INTEGER DEFAULT 3,  -- Number of steps completed
    options_shown_count INTEGER DEFAULT 0,  -- Total options displays
    modifications_count INTEGER DEFAULT 0,  -- Times user changed selections
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

-- Indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_metrics_build ON build_metrics(build_id);
CREATE INDEX IF NOT EXISTS idx_metrics_adherence ON build_metrics(budget_adherence);
CREATE INDEX IF NOT EXISTS idx_metrics_created ON build_metrics(created_at);
