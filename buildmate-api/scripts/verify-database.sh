#!/bin/bash

# Database Verification Script for BuildMate

echo "========================================"
echo "BuildMate Database Verification"
echo "========================================"

cd "$(dirname "$0")/.."

# Check local database
echo ""
echo "--- Local Database Check ---"
npx wrangler d1 execute buildmate-db --local --command="
SELECT
    name as table_name
FROM sqlite_master m
WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
ORDER BY name;
"

# Verify builds table schema
echo ""
echo "--- Builds Table Schema ---"
npx wrangler d1 execute buildmate-db --local --command="
PRAGMA table_info(builds);
"

# Verify build_items table schema
echo ""
echo "--- Build Items Table Schema ---"
npx wrangler d1 execute buildmate-db --local --command="
PRAGMA table_info(build_items);
"

# Verify ai_logs table schema
echo ""
echo "--- AI Logs Table Schema ---"
npx wrangler d1 execute buildmate-db --local --command="
PRAGMA table_info(ai_logs);
"

# Check indexes
echo ""
echo "--- Index Verification ---"
npx wrangler d1 execute buildmate-db --local --command="
SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%';
"

echo ""
echo "✓ Database verification complete"
