require('dotenv').config();

const PROVIDERS = [
  { name: 'Mistral',     url: 'https://api.mistral.ai/v1/chat/completions',                         key: process.env.MISTRAL_API_KEY, model: 'mistral-small-latest' },
  { name: 'Groq',        url: 'https://api.groq.com/openai/v1/chat/completions',                    key: process.env.GROQ_API_KEY,    model: 'llama-3.3-70b-versatile' },
  { name: 'HuggingFace', url: 'https://router.huggingface.co/featherless-ai/v1/chat/completions',   key: process.env.HF_API_KEY,      model: 'meta-llama/Llama-3.1-8B-Instruct' },
];

const PROMPTS = [
  { type: 'traduction', prompt: 'Traduis en anglais : "Le chat dort sur le canapé."' },
  { type: 'résumé',     prompt: 'Résume en une phrase : "Le machine learning est une branche de l\'IA qui permet aux machines d\'apprendre à partir de données sans être explicitement programmées."' },
  { type: 'code',       prompt: 'Écris une fonction JavaScript qui inverse une chaîne de caractères. Retourne uniquement le code, sans explication.' },
  { type: 'créatif',    prompt: 'Donne une métaphore originale pour expliquer ce qu\'est un LLM à quelqu\'un qui ne connaît pas l\'informatique.' },
  { type: 'factuel',    prompt: 'Qui a inventé l\'architecture Transformer en 2017 ? Réponds en une phrase.' },
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
        max_tokens: 200,
        temperature: 0.3,
      }),
    });
    const latency = Date.now() - start;
    if (!res.ok) return { provider: provider.name, content: null, latency, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { provider: provider.name, content: data.choices?.[0]?.message?.content?.trim() ?? null, latency };
  } catch (err) {
    return { provider: provider.name, content: null, latency: Date.now() - start, error: err.message };
  }
}

const tasks = PROMPTS.flatMap(p => PROVIDERS.map(prov => callProvider(prov, p.prompt).then(r => ({ ...r, type: p.type }))));

Promise.all(tasks).then(results => {
  const col = 46;
  const header = '| Type       | ' + PROVIDERS.map(p => p.name.padEnd(col)).join(' | ') + ' |';
  const sep    = '|------------|' + PROVIDERS.map(() => '-'.repeat(col + 2)).join('|') + '|';

  console.log('\n' + header);
  console.log(sep);

  for (const { type } of PROMPTS) {
    const row = PROVIDERS.map(p => {
      const r = results.find(x => x.type === type && x.provider === p.name);
      const txt = r?.content ?? r?.error ?? '—';
      return txt.slice(0, col - 3).replace(/\n/g, ' ') + (txt.length > col - 3 ? '…' : '');
    });
    console.log(`| ${type.padEnd(10)} | ${row.map(c => c.padEnd(col)).join(' | ')} |`);
  }
});
