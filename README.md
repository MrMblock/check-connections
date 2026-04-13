# check-connections

Vérification des connexions API et exploration des providers LLM : Mistral, Groq, HuggingFace et Pinecone.

## Installation

```bash
npm install
cp .env.example .env
# Remplir les clés dans .env
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `MISTRAL_API_KEY` | Clé API Mistral (console.mistral.ai) |
| `GROQ_API_KEY` | Clé API Groq (console.groq.com) |
| `HF_API_KEY` | Token HuggingFace (huggingface.co/settings/tokens) |
| `PINECONE_API_KEY` | Clé API Pinecone (app.pinecone.io) |

## Scripts

| Script | Description | Commande |
|--------|-------------|----------|
| `check-connections.js` | Vérifie toutes les connexions API | `node check-connections.js` |
| `check-connections.js` | Mode verbose — vérifie les réponses | `node check-connections.js --verbose` |
| `cost-calculator.js` | Estime le coût d'un texte par provider | `node cost-calculator.js` |
| `prompt-lab.js` | 3 providers × 3 températures en parallèle | `node prompt-lab.js` |
| `comparateur.js` | Compare les providers sur 5 types de tâches | `node comparateur.js` |
| `server.js` | Serveur HTTP Express (port 3000) | `node server.js` |
| `same-model.js` | Compare Groq vs HuggingFace sur le même modèle | `node same-model.js` |
| `stress-test.js` | Stress test — N requêtes parallèles par provider | `node stress-test.js` |
| `prompt-sensitivity.js` | Impact de la formulation sur les réponses | `node prompt-sensitivity.js` |
| `multilang.js` | Même question en FR / EN / ES | `node multilang.js` |
| `dashboard.js` | Génère `results.html` avec toutes les métriques | `node dashboard.js` |

## Tests

```bash
npm test
```

## Routes du serveur

```
GET /check                            → statut de toutes les connexions
GET /ask?q=<prompt>&provider=<nom>    → envoie un prompt au provider
GET /cost?text=<texte>                → estimation de coût par provider
```

Exemple :
```bash
curl "http://localhost:3000/check"
curl "http://localhost:3000/ask?q=Bonjour&provider=groq"
curl "http://localhost:3000/cost?text=Bonjour+monde"
```
