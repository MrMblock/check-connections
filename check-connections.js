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
    model: 'llama-3.1-8b-instant',
    format: 'openai',
  },
  {
    name: 'HuggingFace',
    url: 'https://router.huggingface.co/featherless-ai/v1/chat/completions',
    key: process.env.HF_API_KEY,
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    format: 'openai',
  },
];

Promise.all(providers.map(checkProvider)).then(results => results.forEach(r => console.log(r)));
