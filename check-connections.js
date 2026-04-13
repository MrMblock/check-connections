require('dotenv').config();

const keys = {
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  HF_API_KEY: process.env.HF_API_KEY,
};

for (const [name, value] of Object.entries(keys)) {
  console.log(`${name}: ${value ? 'présente' : 'MANQUANTE'}`);
}

async function checkMistral() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    return { provider: 'Mistral', status: 'ERROR', latency: 0, error: 'Clé API manquante' };
  }

  const start = Date.now();
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      return { provider: 'Mistral', status: 'ERROR', latency, error: `HTTP ${response.status}` };
    }

    return { provider: 'Mistral', status: 'OK', latency };
  } catch (err) {
    return { provider: 'Mistral', status: 'ERROR', latency: Date.now() - start, error: err.message };
  }
}

checkMistral().then(console.log);
