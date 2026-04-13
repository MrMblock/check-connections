require('dotenv').config();

const MISTRAL = {
  name: 'Mistral',
  url: 'https://api.mistral.ai/v1/chat/completions',
  key: process.env.MISTRAL_API_KEY,
  model: 'mistral-small-latest',
};

const VARIATIONS = [
  'Explique le machine learning',
  'Explique-moi le machine learning',
  'Peux-tu m\'expliquer le machine learning ?',
  'C\'est quoi le machine learning ?',
  'Machine learning : définition et explication',
];

async function callMistral(prompt) {
  const res = await fetch(MISTRAL.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MISTRAL.key}` },
    body: JSON.stringify({
      model: MISTRAL.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function run() {
  console.log('\nSensibilité du prompt (Mistral, temperature 0.3) :\n');

  const col1 = 34, col2 = 8, col3 = 10;
  console.log(`${'Formulation'.padEnd(col1)} | ${'Tokens'.padEnd(col2)} | ${'Longueur'.padEnd(col3)} | Première phrase`);
  console.log(`${'-'.repeat(col1)}-|-${'-'.repeat(col2)}-|-${'-'.repeat(col1)}`);

  const results = await Promise.all(VARIATIONS.map(async v => {
    try {
      const content = await callMistral(v);
      const tokens = Math.ceil(content.length / 4);
      const firstSentence = content.split(/[.!?]/)[0]?.trim() ?? content;
      return { variation: v, tokens, length: content.length, firstSentence };
    } catch (err) {
      return { variation: v, tokens: 0, length: 0, firstSentence: `ERROR: ${err.message}` };
    }
  }));

  for (const r of results) {
    const label = `"${r.variation}"`;
    console.log(
      `${label.padEnd(col1)} | ${String(r.tokens).padEnd(col2)} | ${String(r.length).padEnd(col3)} | "${r.firstSentence.slice(0, 55)}…"`
    );
  }

  console.log('\nObservation : la formulation impacte le ton et la longueur, pas le fond.');
}

run();
