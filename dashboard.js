require('dotenv').config();
const fs = require('fs');
const { checkProvider, checkPinecone, PROVIDERS } = require('./check-connections');
const { estimateCostData } = require('./cost-calculator');

async function quickStress(provider, n = 3) {
  const tasks = Array.from({ length: n }, () => checkProvider(provider));
  const settled = await Promise.allSettled(tasks);
  const latencies = settled
    .filter(r => r.status === 'fulfilled' && r.value.status === 'OK')
    .map(r => r.value.latency);
  const success = latencies.length;
  const avg = success ? Math.round(latencies.reduce((a, b) => a + b, 0) / success) : 0;
  return { success, failed: n - success, avg, n };
}

function statusColor(status) {
  return status === 'OK' ? '#22c55e' : '#ef4444';
}

function renderConnectionRows(results) {
  return results.map(r => `
    <tr>
      <td>${r.provider}</td>
      <td style="color:${statusColor(r.status)};font-weight:bold">${r.status}</td>
      <td>${r.latency}ms</td>
      <td>${r.error ?? '—'}</td>
    </tr>`).join('');
}

function renderStressRows(stressResults) {
  return stressResults.map(({ name, res }) => {
    const icon = res.failed === 0 ? '✅' : res.failed < res.n / 2 ? '⚠️' : '❌';
    const bg = res.failed === 0 ? '#dcfce7' : res.failed < res.n / 2 ? '#fef9c3' : '#fee2e2';
    return `
    <tr style="background:${bg}">
      <td>${name}</td>
      <td>${res.success}/${res.n} ${icon}</td>
      <td>${res.avg}ms</td>
    </tr>`;
  }).join('');
}

function renderCostRows(costData) {
  return costData.map(d => `
    <tr>
      <td>${d.provider}</td>
      <td>${d.tokens}</td>
      <td>${d.costPerRequest.toFixed(8)}€</td>
      <td>${d.costPer1000.toFixed(5)}€</td>
    </tr>`).join('');
}

async function generateDashboard() {
  console.log('🔄 Génération du dashboard...');

  const [connResults, stressData, costData] = await Promise.all([
    Promise.all([...PROVIDERS.map(checkProvider), checkPinecone()]),
    Promise.all(PROVIDERS.map(async p => ({ name: p.name, res: await quickStress(p, 3) }))),
    Promise.resolve(estimateCostData('Le machine learning est une sous-discipline de l\'intelligence artificielle.')),
  ]);

  const ok = connResults.filter(r => r.status === 'OK').length;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>API Dashboard — check-connections</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 40px auto; padding: 0 20px; background: #f8fafc; color: #1e293b; }
    h1 { font-size: 1.6rem; margin-bottom: 4px; }
    .meta { color: #64748b; font-size: 0.85rem; margin-bottom: 32px; }
    h2 { font-size: 1.1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 36px; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    th { background: #f1f5f9; text-align: left; padding: 10px 14px; font-size: 0.82rem; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
    td { padding: 10px 14px; border-top: 1px solid #f1f5f9; font-size: 0.9rem; }
    .badge { display:inline-block; padding: 2px 10px; border-radius: 999px; font-weight: 600; font-size: 0.8rem; }
    .ok { background: #dcfce7; color: #166534; }
    .score { font-size: 2rem; font-weight: 700; color: ${ok === connResults.length ? '#16a34a' : '#dc2626'}; }
  </style>
</head>
<body>
  <h1>API Dashboard</h1>
  <p class="meta">Généré le ${new Date().toLocaleString('fr-FR')} &nbsp;·&nbsp; check-connections</p>

  <h2>Connexions API</h2>
  <p class="score">${ok}/${connResults.length}</p>
  <table>
    <thead><tr><th>Provider</th><th>Statut</th><th>Latence</th><th>Erreur</th></tr></thead>
    <tbody>${renderConnectionRows(connResults)}</tbody>
  </table>

  <h2>Stress Test (3 requêtes parallèles)</h2>
  <table>
    <thead><tr><th>Provider</th><th>Succès</th><th>Latence moy.</th></tr></thead>
    <tbody>${renderStressRows(stressData)}</tbody>
  </table>

  <h2>Estimation de coût</h2>
  <p style="font-size:0.85rem;color:#64748b">Texte de référence : ~${costData[0]?.tokens} tokens</p>
  <table>
    <thead><tr><th>Provider</th><th>Tokens</th><th>Coût / requête</th><th>Pour 1000 req.</th></tr></thead>
    <tbody>${renderCostRows(costData)}</tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync('results.html', html);
  console.log('✅ results.html généré — ouvre-le dans ton navigateur :');
  console.log('   xdg-open results.html');
}

generateDashboard();
