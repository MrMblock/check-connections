require('dotenv').config();

const PROVIDERS = [
  { name: 'Mistral',     url: 'https://api.mistral.ai/v1/chat/completions',                              key: process.env.MISTRAL_API_KEY, model: 'mistral-small-latest' },
  { name: 'Groq',        url: 'https://api.groq.com/openai/v1/chat/completions',                         key: process.env.GROQ_API_KEY,    model: 'llama-3.3-70b-versatile' },
  { name: 'HuggingFace', url: 'https://router.huggingface.co/featherless-ai/v1/chat/completions',        key: process.env.HF_API_KEY,      model: 'meta-llama/Llama-3.1-8B-Instruct' },
];

const TEMPERATURES = [0, 0.5, 1];
const PROMPT = 'Explique ce qu\'est un cookie HTTP en une phrase.';

async function callProvider(provider, prompt, temperature) {
  const temp = provider.name === 'HuggingFace' && temperature === 0 ? 0.01 : temperature;
  const start = Date.now();
  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: temp,
      }),
    });
    const latency = Date.now() - start;
    if (!res.ok) return { provider: provider.name, temperature, content: null, latency, error: `HTTP ${res.status}` };
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? null;
    return { provider: provider.name, temperature, content, latency };
  } catch (err) {
    return { provider: provider.name, temperature, content: null, latency: Date.now() - start, error: err.message };
  }
}

const tasks = PROVIDERS.flatMap(p => TEMPERATURES.map(t => callProvider(p, PROMPT, t)));

Promise.all(tasks).then(results => {
  console.log(`\nPrompt : "${PROMPT}"\n`);
  for (const r of results) {
    const temp = r.temperature.toFixed(1);
    const content = r.content ? r.content.slice(0, 80).replace(/\n/g, ' ') + (r.content.length > 80 ? '…' : '') : `ERROR: ${r.error}`;
    console.log(`${r.provider.padEnd(12)} | temp ${temp} | ${content}`);
  }
});
