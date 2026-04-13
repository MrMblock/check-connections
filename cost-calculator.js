require('dotenv').config();

const PRICING = [
  { label: 'Mistral Small', pricePerMillion: 0.20 },
  { label: 'Groq Llama 3',  pricePerMillion: 0.05 },
  { label: 'GPT-4o',        pricePerMillion: 2.50 },
];

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function estimateCostData(text) {
  const tokens = estimateTokens(text);
  return PRICING.map(p => ({
    provider: p.label,
    tokens,
    costPerRequest: (p.pricePerMillion / 1_000_000) * tokens,
    costPer1000: (p.pricePerMillion / 1_000_000) * tokens * 1000,
  }));
}

function estimateCost(text, label) {
  const tokens = estimateTokens(text);
  const title = label ?? `${text.length} caractères`;
  console.log(`\nTexte : ${title} → ~${tokens} tokens\n`);

  const col1 = 14, col2 = 21, col3 = 18;
  console.log('Provider'.padEnd(col1) + 'Coût estimé (input)'.padEnd(col2) + 'Pour 1000 requêtes');
  console.log('-'.repeat(col1 + col2 + col3));

  for (const p of PRICING) {
    const cost = (p.pricePerMillion / 1_000_000) * tokens;
    const cost1k = cost * 1000;
    console.log(
      p.label.padEnd(col1) +
      `${cost.toFixed(8)}€`.padEnd(col2) +
      `${cost1k.toFixed(5)}€`
    );
  }
}

async function listMistralModels() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) { console.log('\nMISTRAL_API_KEY manquante'); return; }
  const res = await fetch('https://api.mistral.ai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  console.log('\nModèles Mistral disponibles :');
  data.data.forEach(m => console.log(`  - ${m.id}`));
}

if (require.main === module) {
  const sample = 'Le machine learning est une sous-discipline de l\'intelligence artificielle qui permet aux systèmes d\'apprendre à partir de données.';
  estimateCost(sample, `${sample.length} caractères`);
  listMistralModels();
}

module.exports = { estimateTokens, estimateCost, estimateCostData };
