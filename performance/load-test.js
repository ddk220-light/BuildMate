/**
 * K6 Load Test for BuildMate API
 *
 * Tests API performance under concurrent load
 *
 * Run with: k6 run performance/load-test.js
 *
 * Or with custom settings:
 * k6 run --vus 10 --duration 30s performance/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },  // Ramp up to 5 users
    { duration: '1m', target: 10 },  // Stay at 10 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s
    http_req_failed: ['rate<0.1'],     // Less than 10% failure rate
    errors: ['rate<0.1'],              // Less than 10% error rate
  },
};

const API_BASE_URL = __ENV.API_URL || 'https://buildmate-api.deepakdhanavel.workers.dev';

/**
 * Main test scenario
 */
export default function () {
  // Scenario: Create a build and complete the first step

  // 1. Health check
  const healthRes = http.get(`${API_BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check has status field': (r) => JSON.parse(r.body).status === 'healthy',
  }) || errorRate.add(1);

  sleep(1);

  // 2. Create a build
  const buildPayload = JSON.stringify({
    description: `Test build ${__VU}-${__ITER}`,
    budgetMin: 1000,
    budgetMax: 2000,
  });

  const buildRes = http.post(`${API_BASE_URL}/api/builds`, buildPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const buildCheck = check(buildRes, {
    'build create status is 201': (r) => r.status === 201,
    'build create returns buildId': (r) => JSON.parse(r.body).buildId !== undefined,
    'build create response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!buildCheck) {
    errorRate.add(1);
    return; // Stop test if build creation failed
  }

  const buildData = JSON.parse(buildRes.body);
  const buildId = buildData.buildId;

  sleep(2);

  // 3. Initialize structure
  const initRes = http.post(`${API_BASE_URL}/api/builds/${buildId}/init`, null);

  check(initRes, {
    'init status is 200': (r) => r.status === 200,
    'init returns structure': (r) => JSON.parse(r.body).structure !== undefined,
    'init response time < 5s': (r) => r.timings.duration < 5000,
  }) || errorRate.add(1);

  sleep(2);

  // 4. Get options for step 0
  const optionsRes = http.get(`${API_BASE_URL}/api/builds/${buildId}/step/0/options`);

  check(optionsRes, {
    'options status is 200': (r) => r.status === 200,
    'options returns 3 items': (r) => JSON.parse(r.body).options?.length === 3,
    'options response time < 5s': (r) => r.timings.duration < 5000,
  }) || errorRate.add(1);

  sleep(1);

  // 5. Fetch the build
  const fetchRes = http.get(`${API_BASE_URL}/api/builds/${buildId}`);

  check(fetchRes, {
    'fetch status is 200': (r) => r.status === 200,
    'fetch response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);

  sleep(1);
}

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log(`Starting load test against ${API_BASE_URL}`);
  console.log('Testing endpoints:');
  console.log('  - GET  /api/health');
  console.log('  - POST /api/builds');
  console.log('  - POST /api/builds/:id/init');
  console.log('  - GET  /api/builds/:id/step/:n/options');
  console.log('  - GET  /api/builds/:id');
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  console.log('Load test completed');
}
