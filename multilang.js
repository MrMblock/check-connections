require('dotenv').config();
const { estimateTokens } = require('./cost-calculator');

const PROVIDERS = [
  { name: 'Mistral',     url: 'https://api.mistral.ai/v1/chat/completions',                         key: process.env.MISTRAL_API_KEY, model: 'mistral-small-latest' },
  { name: 'Groq',        url: 'https://api.groq.com/openai/v1/chat/completions',                    key: process.env.GROQ_API_KEY,    model: 'llama-3.3-70b-versatile' },
  { name: 'HuggingFace', url: 'https://router.huggingface.co/featherless-ai/v1/chat/completions',   key: process.env.HF_API_KEY,      model: 'meta-llama/Llama-3.1-8B-Instruct' },
];

const PRICE_PER_MILLION = { 'Mistral': 0.20, 'Groq': 0.05, 'HuggingFace': 0.10 };

const QUESTIONS = [
  { lang: 'FR', prompt: 'Qu\'est-ce que l\'intelligence artificielle ? Réponds en 2 phrases.' },
  { lang: 'EN', prompt: 'What is artificial intelligence? Answer in 2 sentences.' },
  { lang: 'ES', prompt: '¿Qué es la inteligencia artificial? Responde en 2 frases.' },
];

async function callProvider(provider, prompt) {
  const start = Date.now();
  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });
    const latency = Date.now() - start;
    if (!res.ok) return { content: null, latency, tokens: 0, error: `HTTP ${res.status}` };
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    return { content, latency, tokens: estimateTokens(content) };
  } catch (err) {
    return { content: null, latency: Date.now() - start, tokens: 0, error: err.message };
  }
}

async function run() {
  const tasks = QUESTIONS.flatMap(q => PROVIDERS.map(p =>
    callProvider(p, q.prompt).then(r => ({ ...r, lang: q.lang, provider: p.name }))
  ));

  const results = await Promise.all(tasks);

  console.log('\nComparaison multi-langue (même question, 3 langues)\n');
  const col = 10;
  console.log(`${'Lang'.padEnd(5)} | ${'Provider'.padEnd(12)} | ${'Tokens'.padEnd(8)} | ${'Latence'.padEnd(9)} | Coût estimé`);
  console.log(`${'-'.repeat(5)}-|-${'-'.repeat(12)}-|-${'-'.repeat(8)}-|-${'-'.repeat(9)}-|-${'-'.repeat(12)}`);

  for (const r of results) {
    const ppm = PRICE_PER_MILLION[r.provider] ?? 0.10;
    const cost = ((ppm / 1_000_000) * r.tokens).toFixed(8);
    const tokens = r.tokens ? String(r.tokens) : 'ERR';
    console.log(
      `${r.lang.padEnd(5)} | ${r.provider.padEnd(12)} | ${tokens.padEnd(8)} | ${String(r.latency).padEnd(7)}ms | ${cost}€`
    );
  }

  // Surcoût FR vs EN pour Mistral
  const mistralFR = results.find(r => r.lang === 'FR' && r.provider === 'Mistral');
  const mistralEN = results.find(r => r.lang === 'EN' && r.provider === 'Mistral');
  if (mistralFR?.tokens && mistralEN?.tokens) {
    const overhead = (((mistralFR.tokens - mistralEN.tokens) / mistralEN.tokens) * 100).toFixed(0);
    console.log(`\nSurcoût FR vs EN (Mistral) : +${overhead}% de tokens`);
  }
}

run();
