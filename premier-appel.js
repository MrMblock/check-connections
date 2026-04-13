require('dotenv').config();

// Premier appel à Mistral — on lit la réponse et les tokens consommés

const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'mistral-small-latest',
    messages: [
      { role: 'user', content: 'Explique les LLMs en une phrase.' },
    ],
    temperature: 0.7,
  }),
});

const data = await response.json();

console.log('Réponse du modèle :', data.choices[0].message.content);
console.log('---');
console.log('Tokens utilisés :', data.usage);
