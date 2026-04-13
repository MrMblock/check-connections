require('dotenv').config();

const keys = {
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  HF_API_KEY: process.env.HF_API_KEY,
};

for (const [name, value] of Object.entries(keys)) {
  console.log(`${name}: ${value ? 'présente' : 'MANQUANTE'}`);
}

async function checkProvider(provider) {
  if (!provider.key) {
    return { provider: provider.name, status: 'ERROR', latency: 0, error: 'Clé API manquante' };
  }

  const start = Date.now();

  const body =
    provider.format === 'huggingface'
      ? JSON.stringify({ inputs: 'Hi', parameters: { max_new_tokens: 5 } })
      : JSON.stringify({
          model: provider.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        });

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body,
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      return { provider: provider.name, status: 'ERROR', latency, error: `HTTP ${response.status}` };
    }

    return { provider: provider.name, status: 'OK', latency };
  } catch (err) {
    return { provider: provider.name, status: 'ERROR', latency: Date.now() - start, error: err.message };
  }
}

function formatResults(results) {
  const nameWidth = 14;

  console.log('\n' + '─'.repeat(42));
  console.log('Provider'.padEnd(nameWidth) + 'Status'.padEnd(10) + 'Latency');
  console.log('─'.repeat(42));

  for (const r of results) {
    const icon = r.status === 'OK' ? '✅' : '❌';
    const status = `${icon} ${r.status}`;
    const latency = r.status === 'OK' ? `${r.latency} ms` : r.error;
    console.log(r.provider.padEnd(nameWidth) + status.padEnd(12) + latency);
  }

  console.log('─'.repeat(42));

  const ok = results.filter(r => r.status === 'OK').length;
  console.log(`\n${ok}/${results.length} providers OK\n`);
}

const providers = [
  {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest',
    format: 'openai',
  },
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    format: 'openai',
  },
  {
    name: 'HuggingFace',
    url: 'https://router.huggingface.co/featherless-ai/v1/chat/completions',
    key: process.env.HF_API_KEY,
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    format: 'openai',
  },
];

if (require.main === module) {
  Promise.all(providers.map(checkProvider)).then(formatResults);
}

module.exports = { checkProvider, formatResults };
