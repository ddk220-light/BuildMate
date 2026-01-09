-- Migration: Add modification tracking to build_items
-- Epic 5: Component Selection Flow
-- Date: 2026-01-08

-- Add columns to track when items are modified
ALTER TABLE build_items ADD COLUMN modified_at TEXT DEFAULT NULL;
ALTER TABLE build_items ADD COLUMN modification_count INTEGER DEFAULT 0;
