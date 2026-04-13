require('dotenv').config();

const GROQ = {
  name: 'Groq',
  url: 'https://api.groq.com/openai/v1/chat/completions',
  key: process.env.GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile',
};

const HF = {
  name: 'HuggingFace',
  url: 'https://router.huggingface.co/featherless-ai/v1/chat/completions',
  key: process.env.HF_API_KEY,
  model: 'meta-llama/Llama-3.1-8B-Instruct',
};

async function callOne(provider, prompt) {
  const start = Date.now();
  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });
    const latency = Date.now() - start;
    if (!res.ok) return { content: null, latency, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { content: data.choices?.[0]?.message?.content?.trim() ?? null, latency };
  } catch (err) {
    return { content: null, latency: Date.now() - start, error: err.message };
  }
}

async function compareSameModel(prompt) {
  const [groq, hf] = await Promise.all([callOne(GROQ, prompt), callOne(HF, prompt)]);
  const speedRatio = hf.latency && groq.latency ? (hf.latency / groq.latency).toFixed(1) : 'N/A';
  const diff = groq.latency < hf.latency
    ? `Groq ${speedRatio}x plus rapide`
    : `HuggingFace ${(groq.latency / hf.latency).toFixed(1)}x plus rapide`;
  return { groq, huggingface: hf, diff };
}

const PROMPT = 'Explique le machine learning en 2 phrases.';

compareSameModel(PROMPT).then(({ groq, huggingface, diff }) => {
  console.log(`\nPrompt : "${PROMPT}"\n`);
  console.log(`Groq (${GROQ.model}) : ${groq.latency}ms`);
  console.log(`  → "${(groq.content ?? groq.error ?? '').slice(0, 120)}…"\n`);
  console.log(`HuggingFace (${HF.model}) : ${huggingface.latency}ms`);
  console.log(`  → "${(huggingface.content ?? huggingface.error ?? '').slice(0, 120)}…"\n`);
  console.log(`Latence : ${diff}`);
  console.log(`Réponses : similaires en substance, style potentiellement différent`);
});
