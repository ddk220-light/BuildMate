-- Migration: Add build_name column to builds table
-- Version: 2.1
-- Date: January 2026
-- Description: Adds support for AI-generated and user-editable build names

-- Add build_name column to builds table
ALTER TABLE builds ADD COLUMN build_name TEXT;

-- Create index for potential future queries by name
CREATE INDEX IF NOT EXISTS idx_builds_name ON builds(build_name);
