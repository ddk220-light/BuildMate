#!/bin/bash
#
# BuildMate Production Smoke Test
#
# Verifies that the production API is functioning correctly
# by testing core endpoints.
#
# Usage: ./scripts/smoke-test-production.sh
#

set -e

API_URL="${API_URL:-https://buildmate-api.deepakdhanavel.workers.dev}"

echo "============================================"
echo "   BuildMate Production Smoke Test"
echo "============================================"
echo ""
echo "Target: $API_URL"
echo ""

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

pass() {
  echo "PASS"
  ((TESTS_PASSED++))
}

fail() {
  echo "FAIL: $1"
  ((TESTS_FAILED++))
}

# Test 1: Health Check
echo -n "1. Health check... "
HEALTH=$(curl -s "$API_URL/api/health")
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
  if echo "$HEALTH" | grep -q '"database":"connected"'; then
    pass
  else
    fail "Database not connected"
  fi
else
  fail "$HEALTH"
fi

# Test 2: Create Build
echo -n "2. Create build... "
BUILD=$(curl -s -X POST "$API_URL/api/builds" \
  -H "Content-Type: application/json" \
  -d '{"description":"Smoke test - gaming PC build for testing","budgetMin":1000,"budgetMax":2000}')
BUILD_ID=$(echo "$BUILD" | grep -o '"buildId":"[^"]*"' | cut -d'"' -f4)
if [ -n "$BUILD_ID" ]; then
  pass
  echo "   Build ID: $BUILD_ID"
else
  fail "$BUILD"
  BUILD_ID=""
fi

# Only continue if we have a build ID
if [ -n "$BUILD_ID" ]; then

  # Test 3: Get Build
  echo -n "3. Get build... "
  GET_BUILD=$(curl -s "$API_URL/api/builds/$BUILD_ID")
  if echo "$GET_BUILD" | grep -q '"buildId"'; then
    pass
  else
    fail "$GET_BUILD"
  fi

  # Test 4: Init Structure (AI call)
  echo -n "4. Init structure (AI)... "
  INIT=$(curl -s -X POST "$API_URL/api/builds/$BUILD_ID/init" --max-time 30)
  if echo "$INIT" | grep -q '"structure"'; then
    pass
    CATEGORY=$(echo "$INIT" | grep -o '"buildCategory":"[^"]*"' | cut -d'"' -f4)
    echo "   Category: $CATEGORY"
  else
    fail "$INIT"
  fi

  # Test 5: Get Options for Step 0 (AI call)
  echo -n "5. Get options for step 0 (AI)... "
  OPTIONS=$(curl -s "$API_URL/api/builds/$BUILD_ID/step/0/options" --max-time 30)
  if echo "$OPTIONS" | grep -q '"options"'; then
    pass
    OPTION_COUNT=$(echo "$OPTIONS" | grep -o '"productName"' | wc -l | tr -d ' ')
    echo "   Options returned: $OPTION_COUNT"
  else
    fail "$OPTIONS"
  fi

  # Test 6: Select Option (using mock data for speed)
  echo -n "6. Select option... "
  SELECT=$(curl -s -X POST "$API_URL/api/builds/$BUILD_ID/step/0/select" \
    -H "Content-Type: application/json" \
    -d '{
      "productName": "Test Product",
      "brand": "Test Brand",
      "price": 299,
      "keySpec": "Test specification",
      "compatibilityNote": "Compatible with all systems",
      "tier": "budget"
    }')
  if echo "$SELECT" | grep -q '"success":true\|"buildId"'; then
    pass
  else
    fail "$SELECT"
  fi

fi

# Summary
echo ""
echo "============================================"
echo "   Test Results"
echo "============================================"
echo ""
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
  echo "SMOKE TEST FAILED"
  exit 1
else
  echo "ALL SMOKE TESTS PASSED"
  exit 0
fi
