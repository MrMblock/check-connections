require('dotenv').config();
const express = require('express');
const { checkProvider, checkPinecone, PROVIDERS } = require('./check-connections');
const { estimateCostData } = require('./cost-calculator');

const app = express();
const PORT = 3000;

// GET /check — vérifie toutes les connexions
app.get('/check', async (req, res) => {
  try {
    const results = await Promise.all([...PROVIDERS.map(checkProvider), checkPinecone()]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /ask?q=...&provider=mistral — envoie un prompt au provider demandé
app.get('/ask', async (req, res) => {
  const { q, provider: name } = req.query;
  if (!q) return res.status(400).json({ error: 'Paramètre q manquant' });

  const provider = PROVIDERS.find(p => p.name.toLowerCase() === (name ?? '').toLowerCase());
  if (!provider) {
    return res.status(400).json({ error: `Provider inconnu. Valeurs acceptées : ${PROVIDERS.map(p => p.name.toLowerCase()).join(', ')}` });
  }

  const start = Date.now();
  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: q }],
        max_tokens: 300,
      }),
    });
    if (!response.ok) return res.status(502).json({ error: `HTTP ${response.status}` });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? null;
    res.json({ provider: provider.name, response: content, latency: Date.now() - start });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /cost?text=... — estime les coûts pour le texte donné
app.get('/cost', (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'Paramètre text manquant' });
  const data = estimateCostData(text);
  res.json(data.map(d => ({
    provider: d.provider,
    tokens: d.tokens,
    estimatedCost: `${d.costPerRequest.toFixed(8)}€`,
  })));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`  GET /check`);
  console.log(`  GET /ask?q=Bonjour&provider=mistral`);
  console.log(`  GET /cost?text=Bonjour+monde`);
});
