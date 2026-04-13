require('dotenv').config();
const { checkProvider, PROVIDERS } = require('./check-connections');

async function stressTest(provider, n = 10) {
  console.log(`\nStress test : ${n} requêtes parallèles → ${provider.name}`);
  const tasks = Array.from({ length: n }, () => checkProvider(provider));
  const settled = await Promise.allSettled(tasks);

  const latencies = [];
  const errors = [];

  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value.status === 'OK') {
      latencies.push(r.value.latency);
    } else {
      const msg = r.status === 'rejected' ? r.reason.message : r.value.error;
      errors.push(msg ?? 'unknown');
    }
  }

  latencies.sort((a, b) => a - b);
  const success = latencies.length;
  const failed = n - success;
  const avgLatency = success ? Math.round(latencies.reduce((a, b) => a + b, 0) / success) : 0;
  const p95idx = Math.min(Math.floor(success * 0.95), success - 1);
  const p95 = success ? latencies[p95idx] : 0;

  return { success, failed, avgLatency, p95, errors };
}

function formatStressResult(provider, n, result) {
  const ratio = `${result.success}/${n}`;
  const icon = result.failed === 0 ? '✅' : result.failed < n / 2 ? '⚠️' : '❌';
  const errSummary = result.errors.length
    ? ` (${[...new Set(result.errors)].join(', ')})`
    : '';
  return `${provider.name.padEnd(14)}: ${ratio} ${icon} avg ${result.avgLatency}ms p95 ${result.p95}ms${errSummary}`;
}

async function run() {
  console.log('\nStress test : 10 requêtes parallèles');
  const n = 10;
  const results = await Promise.all(PROVIDERS.map(p => stressTest(p, n)));
  results.forEach((r, i) => console.log(formatStressResult(PROVIDERS[i], n, r)));
}

run();

module.exports = { stressTest };
