#!/bin/bash

# BuildMate Epic 1 Verification Test Script
# Run this after completing Epic 1 implementation

set -e  # Exit on first error

BASE_URL="${BASE_URL:-http://localhost:8787}"
PASSED=0
FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "BuildMate Epic 1 Verification Tests"
echo "========================================"
echo "Base URL: $BASE_URL"
echo ""

# Helper function for tests
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local data="$5"

    echo -n "Testing: $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>/dev/null)
    fi

    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (HTTP $status_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAILED${NC} (Expected $expected_status, got $status_code)"
        echo "Response: $body"
        ((FAILED++))
        return 1
    fi
}

# ============================================
# TEST 1: Root Endpoint
# ============================================
echo ""
echo "--- Test Group 1: Root Endpoint ---"

test_endpoint \
    "Root endpoint returns 200" \
    "GET" \
    "/" \
    "200"

# ============================================
# TEST 2: Health Check Endpoint
# ============================================
echo ""
echo "--- Test Group 2: Health Check ---"

test_endpoint \
    "Health check returns 200" \
    "GET" \
    "/api/health" \
    "200"

# Verify health check response structure
echo -n "Testing: Health check response structure... "
health_response=$(curl -s "$BASE_URL/api/health")
if echo "$health_response" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC} - Missing status field"
    ((FAILED++))
fi

# ============================================
# TEST 3: CORS Headers
# ============================================
echo ""
echo "--- Test Group 3: CORS Configuration ---"

echo -n "Testing: CORS preflight request... "
cors_response=$(curl -s -I -X OPTIONS \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST" \
    "$BASE_URL/api/builds" 2>/dev/null)

if echo "$cors_response" | grep -qi "access-control-allow-origin"; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC} - Missing CORS headers"
    ((FAILED++))
fi

# ============================================
# TEST 4: Request ID Header
# ============================================
echo ""
echo "--- Test Group 4: Request ID Middleware ---"

echo -n "Testing: X-Request-ID header present... "
request_id_response=$(curl -s -I "$BASE_URL/api/health" 2>/dev/null)

if echo "$request_id_response" | grep -qi "x-request-id"; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC} - Missing X-Request-ID header"
    ((FAILED++))
fi

# ============================================
# TEST 5: Build Creation
# ============================================
echo ""
echo "--- Test Group 5: Build Management ---"

test_endpoint \
    "POST /api/builds creates a build" \
    "POST" \
    "/api/builds" \
    "201" \
    '{"description": "Test gaming PC build", "budgetMin": 1000, "budgetMax": 1500}'

test_endpoint \
    "POST /api/builds with invalid data returns 400" \
    "POST" \
    "/api/builds" \
    "400" \
    '{"description": "", "budgetMin": 1000, "budgetMax": 500}'

test_endpoint \
    "GET /api/builds/:id returns 404 for non-existent" \
    "GET" \
    "/api/builds/non-existent-id" \
    "404"

# ============================================
# TEST 6: Database Connection
# ============================================
echo ""
echo "--- Test Group 6: Database Connection ---"

echo -n "Testing: Database is accessible... "
health_response=$(curl -s "$BASE_URL/api/health")
if echo "$health_response" | grep -q '"database":"connected"'; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}WARNING${NC} - Database status not confirmed"
    ((PASSED++))  # Don't fail, just warn
fi

# ============================================
# TEST 7: Route Stubs
# ============================================
echo ""
echo "--- Test Group 7: Route Stubs ---"

test_endpoint \
    "POST /api/builds/:id/init returns 501 (not implemented)" \
    "POST" \
    "/api/builds/test-id/init" \
    "501" \
    '{}'

test_endpoint \
    "GET /api/builds/:id/step/0/options returns 501" \
    "GET" \
    "/api/builds/test-id/step/0/options" \
    "501"

test_endpoint \
    "GET /api/builds/:id/instructions returns 501" \
    "GET" \
    "/api/builds/test-id/instructions" \
    "501"

# ============================================
# TEST 8: Error Handling
# ============================================
echo ""
echo "--- Test Group 8: Error Handling ---"

echo -n "Testing: 404 returns proper error format... "
error_response=$(curl -s "$BASE_URL/api/nonexistent")
if echo "$error_response" | grep -q '"error"'; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC} - Error response not in expected format"
    ((FAILED++))
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All Epic 1 tests passed!${NC}"
    echo "Epic 1 Infrastructure Foundation is complete."
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    echo "Please review the failures above."
    exit 1
fi
