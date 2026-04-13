require('dotenv').config();

// Même prompt que premier-appel.js, provider différent — notez la différence de vitesse

const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'user', content: 'Explique les LLMs en une phrase.' },
    ],
    temperature: 0.7,
  }),
});

const data = await response.json();

console.log('Groq répond :', data.choices[0].message.content);
