/**
 * Simple Performance Benchmark Script
 *
 * Measures baseline performance metrics without requiring k6
 * Run with: node performance/benchmark.js
 */

const API_BASE_URL = process.env.API_URL || 'https://buildmate-api.deepakdhanavel.workers.dev';

const results = {
  health: [],
  buildCreate: [],
  structureGen: [],
  optionsGen: [],
  buildFetch: [],
};

/**
 * Make HTTP request and measure timing
 */
async function timedRequest(url, options = {}) {
  const start = Date.now();

  try {
    const response = await fetch(url, options);
    const duration = Date.now() - start;
    const data = await response.json();

    return {
      status: response.status,
      duration,
      success: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      duration: Date.now() - start,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test health endpoint
 */
async function testHealth() {
  console.log('Testing GET /api/health...');

  for (let i = 0; i < 10; i++) {
    const result = await timedRequest(`${API_BASE_URL}/api/health`);
    results.health.push(result.duration);

    if (!result.success) {
      console.error(`  ❌ Request ${i + 1} failed:`, result.error || `Status ${result.status}`);
    }
  }

  const avg = results.health.reduce((a, b) => a + b, 0) / results.health.length;
  const min = Math.min(...results.health);
  const max = Math.max(...results.health);

  console.log(`  ✓ Average: ${avg.toFixed(0)}ms`);
  console.log(`  ✓ Min: ${min}ms, Max: ${max}ms`);
  console.log(`  ${avg < 100 ? '✅ PASS' : '⚠️  SLOW'} (target: <100ms)\n`);
}

/**
 * Test build creation
 */
async function testBuildCreate() {
  console.log('Testing POST /api/builds...');

  for (let i = 0; i < 5; i++) {
    const result = await timedRequest(`${API_BASE_URL}/api/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: `Benchmark test ${i + 1}`,
        budgetMin: 1000,
        budgetMax: 2000,
      }),
    });

    results.buildCreate.push(result.duration);

    if (!result.success) {
      console.error(`  ❌ Request ${i + 1} failed`);
    }
  }

  const avg = results.buildCreate.reduce((a, b) => a + b, 0) / results.buildCreate.length;
  const min = Math.min(...results.buildCreate);
  const max = Math.max(...results.buildCreate);

  console.log(`  ✓ Average: ${avg.toFixed(0)}ms`);
  console.log(`  ✓ Min: ${min}ms, Max: ${max}ms`);
  console.log(`  ${avg < 500 ? '✅ PASS' : '⚠️  SLOW'} (target: <500ms)\n`);
}

/**
 * Test structure generation
 */
async function testStructureGeneration() {
  console.log('Testing POST /api/builds/:id/init (Structure Generation)...');

  // Create a build first
  const buildResult = await timedRequest(`${API_BASE_URL}/api/builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Structure generation benchmark',
      budgetMin: 1000,
      budgetMax: 2000,
    }),
  });

  if (!buildResult.success) {
    console.error('  ❌ Failed to create test build');
    return;
  }

  const buildId = buildResult.data.buildId;

  // Test structure generation 3 times
  for (let i = 0; i < 3; i++) {
    const result = await timedRequest(`${API_BASE_URL}/api/builds/${buildId}/init`, {
      method: 'POST',
    });

    if (i === 0) {
      // Only first one should succeed (409 expected after)
      results.structureGen.push(result.duration);
    }

    if (i === 0 && !result.success) {
      console.error(`  ❌ Structure generation failed`);
    }
  }

  const avg = results.structureGen.reduce((a, b) => a + b, 0) / results.structureGen.length;

  console.log(`  ✓ Average: ${avg.toFixed(0)}ms`);
  console.log(`  ${avg < 5000 ? '✅ PASS' : '⚠️  SLOW'} (target: <5000ms)\n`);
}

/**
 * Test options generation
 */
async function testOptionsGeneration() {
  console.log('Testing GET /api/builds/:id/step/:n/options (Option Generation)...');

  // Create and initialize a build
  const buildResult = await timedRequest(`${API_BASE_URL}/api/builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Options generation benchmark',
      budgetMin: 1000,
      budgetMax: 2000,
    }),
  });

  if (!buildResult.success) {
    console.error('  ❌ Failed to create test build');
    return;
  }

  const buildId = buildResult.data.buildId;

  await timedRequest(`${API_BASE_URL}/api/builds/${buildId}/init`, {
    method: 'POST',
  });

  // Test options generation 3 times
  for (let i = 0; i < 3; i++) {
    const result = await timedRequest(
      `${API_BASE_URL}/api/builds/${buildId}/step/0/options`
    );

    results.optionsGen.push(result.duration);

    if (!result.success) {
      console.error(`  ❌ Request ${i + 1} failed`);
    }
  }

  const avg = results.optionsGen.reduce((a, b) => a + b, 0) / results.optionsGen.length;
  const min = Math.min(...results.optionsGen);
  const max = Math.max(...results.optionsGen);

  console.log(`  ✓ Average: ${avg.toFixed(0)}ms`);
  console.log(`  ✓ Min: ${min}ms, Max: ${max}ms`);
  console.log(`  ${avg < 5000 ? '✅ PASS' : '⚠️  SLOW'} (target: <5000ms)\n`);
}

/**
 * Test build fetch
 */
async function testBuildFetch() {
  console.log('Testing GET /api/builds/:id...');

  // Create a build first
  const buildResult = await timedRequest(`${API_BASE_URL}/api/builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Fetch benchmark',
      budgetMin: 1000,
      budgetMax: 2000,
    }),
  });

  if (!buildResult.success) {
    console.error('  ❌ Failed to create test build');
    return;
  }

  const buildId = buildResult.data.buildId;

  // Test fetching 10 times
  for (let i = 0; i < 10; i++) {
    const result = await timedRequest(`${API_BASE_URL}/api/builds/${buildId}`);
    results.buildFetch.push(result.duration);

    if (!result.success) {
      console.error(`  ❌ Request ${i + 1} failed`);
    }
  }

  const avg = results.buildFetch.reduce((a, b) => a + b, 0) / results.buildFetch.length;
  const min = Math.min(...results.buildFetch);
  const max = Math.max(...results.buildFetch);

  console.log(`  ✓ Average: ${avg.toFixed(0)}ms`);
  console.log(`  ✓ Min: ${min}ms, Max: ${max}ms`);
  console.log(`  ${avg < 100 ? '✅ PASS' : '⚠️  SLOW'} (target: <100ms)\n`);
}

/**
 * Print summary
 */
function printSummary() {
  console.log('═══════════════════════════════════════════════════');
  console.log('                  BENCHMARK SUMMARY                ');
  console.log('═══════════════════════════════════════════════════\n');

  const metrics = [
    {
      name: 'Health Check',
      data: results.health,
      target: 100,
    },
    {
      name: 'Build Creation',
      data: results.buildCreate,
      target: 500,
    },
    {
      name: 'Structure Generation',
      data: results.structureGen,
      target: 5000,
    },
    {
      name: 'Options Generation',
      data: results.optionsGen,
      target: 5000,
    },
    {
      name: 'Build Fetch',
      data: results.buildFetch,
      target: 100,
    },
  ];

  metrics.forEach((metric) => {
    if (metric.data.length === 0) return;

    const avg = metric.data.reduce((a, b) => a + b, 0) / metric.data.length;
    const status = avg < metric.target ? '✅' : '⚠️ ';

    console.log(`${status} ${metric.name.padEnd(25)} ${avg.toFixed(0).padStart(6)}ms (target: <${metric.target}ms)`);
  });

  console.log('\n═══════════════════════════════════════════════════\n');
}

/**
 * Main function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('       BuildMate API Performance Benchmark         ');
  console.log('═══════════════════════════════════════════════════');
  console.log(`API URL: ${API_BASE_URL}\n`);

  try {
    await testHealth();
    await testBuildCreate();
    await testStructureGeneration();
    await testOptionsGeneration();
    await testBuildFetch();

    printSummary();

    console.log('✅ Benchmark completed successfully\n');
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

main();
