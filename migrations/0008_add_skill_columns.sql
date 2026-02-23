-- Add domain skill columns to builds table
-- Version: 2.2
-- Date: February 2026
--
-- Adds skill_id and skill_confidence to support automatic domain-skill
-- detection. Both columns are nullable — NULL means no skill was detected
-- (fully backward compatible with existing builds).

ALTER TABLE builds ADD COLUMN skill_id TEXT;
ALTER TABLE builds ADD COLUMN skill_confidence INTEGER;
