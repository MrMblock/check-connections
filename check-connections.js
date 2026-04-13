require('dotenv').config();

const keys = {
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  HF_API_KEY: process.env.HF_API_KEY,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
};

for (const [name, value] of Object.entries(keys)) {
  console.log(`${name}: ${value ? 'présente' : 'MANQUANTE'}`);
}

const verbose = process.argv.includes('--verbose');

async function checkProvider(provider) {
  if (!provider.key) {
    return { provider: provider.name, status: 'ERROR', latency: 0, error: 'Clé API manquante' };
  }

  const prompt = verbose ? 'Donne-moi la capitale de la France en un mot.' : 'Hi';
  const start = Date.now();

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: verbose ? 10 : 5,
      }),
    });

    const latency = Date.now() - start;
    if (!response.ok) {
      return { provider: provider.name, status: 'ERROR', latency, error: `HTTP ${response.status}` };
    }

    let answer;
    if (verbose) {
      const data = await response.json();
      answer = data.choices?.[0]?.message?.content?.trim();
    }

    return { provider: provider.name, status: 'OK', latency, ...(answer && { answer }) };
  } catch (err) {
    return { provider: provider.name, status: 'ERROR', latency: Date.now() - start, error: err.message };
  }
}

async function checkPinecone() {
  const key = process.env.PINECONE_API_KEY;
  if (!key) return { provider: 'Pinecone', status: 'ERROR', latency: 0, error: 'Clé API manquante' };

  const start = Date.now();
  try {
    const response = await fetch('https://api.pinecone.io/indexes', {
      headers: {
        'Api-Key': key,
        'X-Pinecone-API-Version': '2024-07',
      },
    });
    const latency = Date.now() - start;
    if (!response.ok) return { provider: 'Pinecone', status: 'ERROR', latency, error: `HTTP ${response.status}` };
    return { provider: 'Pinecone', status: 'OK', latency };
  } catch (err) {
    return { provider: 'Pinecone', status: 'ERROR', latency: Date.now() - start, error: err.message };
  }
}

async function listMistralModels() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) { console.log('MISTRAL_API_KEY manquante'); return; }
  const res = await fetch('https://api.mistral.ai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  console.log('\nModèles Mistral disponibles :');
  data.data.forEach(m => console.log(`  - ${m.id}`));
}

function displayResult(result) {
  const icon = result.status === 'OK' ? '✅' : '❌';
  const ans = result.answer ? ` → "${result.answer}"` : '';
  const err = result.error ? ` (${result.error})` : '';
  console.log(`${icon} ${result.provider} ${result.latency}ms${ans}${err}`);
}

const PROVIDERS = [
  {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest',
  },
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
  },
  {
    name: 'HuggingFace',
    url: 'https://router.huggingface.co/featherless-ai/v1/chat/completions',
    key: process.env.HF_API_KEY,
    model: 'meta-llama/Llama-3.1-8B-Instruct',
  },
];

if (require.main === module) {
  console.log('\n🔍 Vérification des connexions API...');
  Promise.all([...PROVIDERS.map(checkProvider), checkPinecone()]).then(results => {
    results.forEach(displayResult);
    const ok = results.filter(r => r.status === 'OK').length;
    console.log(`\n${ok}/${results.length} connexions actives`);
    if (ok === results.length) console.log('Tout est vert. Vous êtes prêts pour la suite !');
  });
}

module.exports = { checkProvider, checkPinecone, displayResult, PROVIDERS };
