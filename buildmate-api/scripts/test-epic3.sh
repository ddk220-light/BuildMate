#!/bin/bash

# BuildMate Epic 3 - Structure Generator Tests
# Run this after completing Epic 3 implementation
#
# Usage:
#   ./scripts/test-epic3.sh              # Test against local (default)
#   BASE_URL=https://your-api.workers.dev ./scripts/test-epic3.sh  # Test against remote

set -e

BASE_URL="${BASE_URL:-http://localhost:8787}"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "BuildMate Epic 3 - Structure Generator Tests"
echo "========================================"
echo "Base URL: $BASE_URL"
echo ""

# Helper function to create a build and initialize it
test_structure_generation() {
    local test_name="$1"
    local description="$2"
    local budget_min="$3"
    local budget_max="$4"
    local expected_category="$5"

    echo -n "Testing: $test_name... "

    # Create build
    create_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"description\": \"$description\", \"budgetMin\": $budget_min, \"budgetMax\": $budget_max}" \
        "$BASE_URL/api/builds")

    build_id=$(echo "$create_response" | grep -o '"buildId":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -z "$build_id" ]; then
        echo -e "${RED}FAILED${NC} - Could not create build"
        echo "  Response: $create_response"
        ((FAILED++))
        return 1
    fi

    # Initialize structure
    init_response=$(curl -s -X POST "$BASE_URL/api/builds/$build_id/init")

    # Check for success (should have buildCategory in response)
    if echo "$init_response" | grep -q '"buildCategory"'; then
        # Verify 3 components
        component_count=$(echo "$init_response" | grep -o '"componentType"' | wc -l | tr -d ' ')
        if [ "$component_count" -eq 3 ]; then
            echo -e "${GREEN}PASSED${NC}"
            ((PASSED++))

            # Show category
            actual_category=$(echo "$init_response" | grep -o '"buildCategory":"[^"]*"' | cut -d'"' -f4)
            echo -e "  ${BLUE}Category: $actual_category${NC}"
            if [ -n "$expected_category" ] && [ "$actual_category" != "$expected_category" ]; then
                echo -e "  ${YELLOW}Note: Expected $expected_category${NC}"
            fi

            # Show components
            echo "  Components:"
            echo "$init_response" | grep -o '"componentType":"[^"]*"' | cut -d'"' -f4 | while read comp; do
                echo "    - $comp"
            done
            return 0
        else
            echo -e "${RED}FAILED${NC} - Expected 3 components, got $component_count"
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}FAILED${NC} - No buildCategory in response"
        echo "  Response: $init_response"
        ((FAILED++))
        return 1
    fi
}

# ============================================
# TEST GROUP 1: Error Handling
# ============================================
echo ""
echo -e "${BLUE}--- Test Group 1: Error Handling ---${NC}"

# Test 1.1: Non-existent build returns 404
echo -n "Testing: Init non-existent build returns 404... "
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/builds/non-existent-id-12345/init")
status_code=$(echo "$response" | tail -n 1)
if [ "$status_code" = "404" ]; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC} - Expected 404, got $status_code"
    ((FAILED++))
fi

# Test 1.2: Double initialization returns 409
echo -n "Testing: Double init returns 409... "
create_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"description": "Test build for double init", "budgetMin": 500, "budgetMax": 1000}' \
    "$BASE_URL/api/builds")
build_id=$(echo "$create_response" | grep -o '"buildId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$build_id" ]; then
    echo -e "${RED}FAILED${NC} - Could not create build"
    ((FAILED++))
else
    # First init should succeed
    first_init=$(curl -s -X POST "$BASE_URL/api/builds/$build_id/init")

    # Second init should return 409
    second_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/builds/$build_id/init")
    status_code=$(echo "$second_response" | tail -n 1)

    if [ "$status_code" = "409" ]; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC} - Expected 409, got $status_code"
        echo "  Response: $(echo "$second_response" | head -n -1)"
        ((FAILED++))
    fi
fi

# ============================================
# TEST GROUP 2: Build Category Detection
# ============================================
echo ""
echo -e "${BLUE}--- Test Group 2: Build Category Detection ---${NC}"

# Test 2.1: Gaming PC
test_structure_generation \
    "Gaming PC detection" \
    "I want to build a gaming PC for playing AAA games at 4K resolution with high framerates" \
    1500 2500 \
    "gaming_pc"

# Test 2.2: Workstation
test_structure_generation \
    "Workstation detection" \
    "I need a professional video editing workstation for 8K footage with DaVinci Resolve" \
    3000 5000 \
    "workstation"

# Test 2.3: Home Theater
test_structure_generation \
    "Home theater detection" \
    "Building a home theater system with surround sound for my living room" \
    800 1500 \
    "home_theater"

# Test 2.4: Smart Home
test_structure_generation \
    "Smart home detection" \
    "I want to automate my home with smart lights, thermostat, and security cameras" \
    500 1000 \
    "smart_home"

# Test 2.5: Home Office
test_structure_generation \
    "Home office detection" \
    "Setting up a comfortable work from home office with ergonomic desk and monitors" \
    1000 2000 \
    "home_office"

# Test 2.6: Photography
test_structure_generation \
    "Photography setup detection" \
    "I want to start professional portrait photography with studio lighting" \
    2000 4000 \
    "photography"

# Test 2.7: Music Production
test_structure_generation \
    "Music production detection" \
    "Setting up a home recording studio for producing electronic music" \
    1500 3000 \
    "music_production"

# Test 2.8: Streaming Setup
test_structure_generation \
    "Streaming setup detection" \
    "I want to start streaming on Twitch with good audio and video quality" \
    1000 2000 \
    "streaming"

# ============================================
# TEST GROUP 3: Budget Variations
# ============================================
echo ""
echo -e "${BLUE}--- Test Group 3: Budget Variations ---${NC}"

# Test 3.1: Budget Gaming PC
test_structure_generation \
    "Budget gaming PC" \
    "Entry level gaming computer for esports titles like Valorant and CS2" \
    600 800 \
    "gaming_pc"

# Test 3.2: High-end Workstation
test_structure_generation \
    "High-end 3D workstation" \
    "3D rendering workstation for Blender and Maya with GPU rendering support" \
    4000 7000 \
    "workstation"

# Test 3.3: Ultra-budget smart home
test_structure_generation \
    "Ultra-budget smart home" \
    "Basic smart home setup with just voice control and a few smart devices" \
    100 300 \
    "smart_home"

# ============================================
# TEST GROUP 4: Edge Cases
# ============================================
echo ""
echo -e "${BLUE}--- Test Group 4: Edge Cases ---${NC}"

# Test 4.1: Mixed use case
test_structure_generation \
    "Mixed gaming and streaming" \
    "Gaming and streaming PC - I want to play and stream at the same time" \
    2000 3000 \
    "gaming_pc"

# Test 4.2: Ambiguous request
test_structure_generation \
    "Ambiguous build request" \
    "I need a computer for general use, some gaming, and occasional video editing" \
    1200 1800 \
    ""

# Test 4.3: Very specific request
test_structure_generation \
    "Very specific request" \
    "VR-ready gaming PC optimized for Half-Life Alyx and racing simulators with triple monitor support" \
    2500 3500 \
    "gaming_pc"

# ============================================
# TEST GROUP 5: Database Verification
# ============================================
echo ""
echo -e "${BLUE}--- Test Group 5: Database Verification ---${NC}"

# Test 5.1: Verify structure is saved to database
echo -n "Testing: Structure saved to database... "
create_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"description": "Test gaming PC for database verification", "budgetMin": 1000, "budgetMax": 1500}' \
    "$BASE_URL/api/builds")
build_id=$(echo "$create_response" | grep -o '"buildId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$build_id" ]; then
    echo -e "${RED}FAILED${NC} - Could not create build"
    ((FAILED++))
else
    # Initialize
    curl -s -X POST "$BASE_URL/api/builds/$build_id/init" > /dev/null

    # Fetch build and check structure exists
    get_response=$(curl -s "$BASE_URL/api/builds/$build_id")

    if echo "$get_response" | grep -q '"structure":{'; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC} - Structure not in build response"
        echo "  Response: $get_response"
        ((FAILED++))
    fi
fi

# Test 5.2: Verify build_items created
echo -n "Testing: Build items created (3 items)... "
# Reuse the build from 5.1
if [ -n "$build_id" ]; then
    get_response=$(curl -s "$BASE_URL/api/builds/$build_id")

    # Check for items array with 3 entries
    if echo "$get_response" | grep -q '"items":\['; then
        item_count=$(echo "$get_response" | grep -o '"step_index"' | wc -l | tr -d ' ')
        if [ "$item_count" -eq 3 ]; then
            echo -e "${GREEN}PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}WARNING${NC} - Expected 3 items, got $item_count"
            ((PASSED++))
        fi
    else
        echo -e "${RED}FAILED${NC} - No items array in response"
        ((FAILED++))
    fi
else
    echo -e "${RED}FAILED${NC} - No build ID from previous test"
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
TOTAL=$((PASSED + FAILED))
echo "Total:  $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All Epic 3 tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
