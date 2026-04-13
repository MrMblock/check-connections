const { checkProvider, formatResults } = require('../check-connections');

describe('checkProvider', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('retourne OK avec latence quand le provider répond 200', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200 });
    const result = await checkProvider({
      name: 'TestProvider',
      url: 'https://api.test.com/v1/chat',
      key: 'valid-key',
      model: 'test-model',
      format: 'openai',
    });
    expect(result.provider).toBe('TestProvider');
    expect(result.status).toBe('OK');
    expect(typeof result.latency).toBe('number');
    expect(result.latency).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  test('retourne ERROR HTTP 401 quand la clé est invalide', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401 });
    const result = await checkProvider({
      name: 'Mistral',
      url: 'https://api.mistral.ai/v1/chat/completions',
      key: 'bad-key',
      model: 'mistral-small-latest',
      format: 'openai',
    });
    expect(result.status).toBe('ERROR');
    expect(result.error).toBe('HTTP 401');
    expect(typeof result.latency).toBe('number');
  });

  test('retourne ERROR sans appel réseau quand la clé est absente', async () => {
    const result = await checkProvider({
      name: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: undefined,
      model: 'llama3-8b-8192',
      format: 'openai',
    });
    expect(result.status).toBe('ERROR');
    expect(result.error).toBe('Clé API manquante');
    expect(result.latency).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('retourne ERROR sur une erreur réseau (ex: pas de wifi)', async () => {
    global.fetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await checkProvider({
      name: 'HuggingFace',
      url: 'https://api-inference.huggingface.co/models/test',
      key: 'hf-key',
      model: 'test',
      format: 'huggingface',
    });
    expect(result.status).toBe('ERROR');
    expect(result.error).toBe('ECONNREFUSED');
    expect(typeof result.latency).toBe('number');
  });

  test('envoie un body au format HuggingFace (inputs + parameters)', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200 });
    await checkProvider({
      name: 'HuggingFace',
      url: 'https://api-inference.huggingface.co/models/test',
      key: 'hf-key',
      model: 'test',
      format: 'huggingface',
    });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toHaveProperty('inputs');
    expect(body).toHaveProperty('parameters');
    expect(body).not.toHaveProperty('messages');
  });

  test('envoie un body au format OpenAI (model + messages + max_tokens)', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200 });
    await checkProvider({
      name: 'Mistral',
      url: 'https://api.mistral.ai/v1/chat/completions',
      key: 'test-key',
      model: 'mistral-small-latest',
      format: 'openai',
    });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toHaveProperty('model', 'mistral-small-latest');
    expect(body).toHaveProperty('messages');
    expect(body).toHaveProperty('max_tokens', 5);
  });

  test("envoie le header Authorization: Bearer <key>", async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200 });
    await checkProvider({
      name: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: 'my-secret-key',
      model: 'llama3-8b-8192',
      format: 'openai',
    });
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer my-secret-key');
  });
});

describe('formatResults', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('affiche bien le score final (ex: 2/3)', () => {
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation(msg => logs.push(String(msg)));
    formatResults([
      { provider: 'Mistral', status: 'OK', latency: 300 },
      { provider: 'Groq', status: 'OK', latency: 180 },
      { provider: 'HuggingFace', status: 'ERROR', latency: 0, error: 'Clé API manquante' },
    ]);
    const output = logs.join('\n');
    expect(output).toContain('2/3');
  });

  test('affiche OK pour un provider qui répond', () => {
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation(msg => logs.push(String(msg)));
    formatResults([{ provider: 'Mistral', status: 'OK', latency: 250 }]);
    expect(logs.join('\n')).toContain('OK');
  });

  test('affiche le message d\'erreur pour un provider en échec', () => {
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation(msg => logs.push(String(msg)));
    formatResults([{ provider: 'Groq', status: 'ERROR', latency: 50, error: 'HTTP 401' }]);
    const output = logs.join('\n');
    expect(output).toContain('ERROR');
    expect(output).toContain('HTTP 401');
  });
});
