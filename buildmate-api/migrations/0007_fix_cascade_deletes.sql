-- Fix CASCADE deletes for Phase 2 tables
-- Version: 2.1
-- Date: January 2026
--
-- Problem: shared_builds, build_feedback, and parsed_existing_items tables
-- were created without ON DELETE CASCADE, causing orphaned records when
-- builds are deleted.
--
-- SQLite requires recreating tables to add CASCADE constraints.

-- 1. Recreate shared_builds with CASCADE
CREATE TABLE IF NOT EXISTS shared_builds_new (
    id TEXT PRIMARY KEY,
    share_code TEXT UNIQUE NOT NULL,
    build_id TEXT NOT NULL,
    build_data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    view_count INTEGER DEFAULT 0,
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO shared_builds_new
SELECT id, share_code, build_id, build_data, created_at, view_count
FROM shared_builds;

DROP TABLE IF EXISTS shared_builds;
ALTER TABLE shared_builds_new RENAME TO shared_builds;

CREATE INDEX IF NOT EXISTS idx_shared_code ON shared_builds(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_build ON shared_builds(build_id);

-- 2. Recreate build_feedback with CASCADE
CREATE TABLE IF NOT EXISTS build_feedback_new (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL,
    feedback_text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO build_feedback_new
SELECT id, build_id, feedback_text, created_at
FROM build_feedback;

DROP TABLE IF EXISTS build_feedback;
ALTER TABLE build_feedback_new RENAME TO build_feedback;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_build ON build_feedback(build_id);

-- 3. Recreate parsed_existing_items with CASCADE
CREATE TABLE IF NOT EXISTS parsed_existing_items_new (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    product_name TEXT,
    brand TEXT,
    category TEXT,
    estimated_price REAL,
    key_spec TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO parsed_existing_items_new
SELECT id, build_id, original_text, product_name, brand, category, estimated_price, key_spec, created_at
FROM parsed_existing_items;

DROP TABLE IF EXISTS parsed_existing_items;
ALTER TABLE parsed_existing_items_new RENAME TO parsed_existing_items;

CREATE INDEX IF NOT EXISTS idx_parsed_items_build ON parsed_existing_items(build_id);
