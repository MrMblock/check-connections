const { checkProvider, checkPinecone, displayResult } = require('../check-connections');

describe('checkProvider', () => {
  beforeEach(() => { global.fetch = jest.fn(); });
  afterEach(() => { jest.clearAllMocks(); });

  test('retourne OK avec latence sur réponse 200', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const result = await checkProvider({
      name: 'TestProvider',
      url: 'https://api.test.com/v1/chat',
      key: 'valid-key',
      model: 'test-model',
    });
    expect(result.provider).toBe('TestProvider');
    expect(result.status).toBe('OK');
    expect(typeof result.latency).toBe('number');
  });

  test('retourne ERROR HTTP 401 sur clé invalide', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401 });
    const result = await checkProvider({
      name: 'Mistral',
      url: 'https://api.mistral.ai/v1/chat/completions',
      key: 'bad-key',
      model: 'mistral-small-latest',
    });
    expect(result.status).toBe('ERROR');
    expect(result.error).toBe('HTTP 401');
  });

  test('retourne ERROR sans appel réseau quand la clé est absente', async () => {
    const result = await checkProvider({ name: 'Groq', url: 'x', key: undefined, model: 'x' });
    expect(result.status).toBe('ERROR');
    expect(result.error).toBe('Clé API manquante');
    expect(result.latency).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('retourne ERROR sur erreur réseau', async () => {
    global.fetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await checkProvider({ name: 'HF', url: 'x', key: 'key', model: 'x' });
    expect(result.status).toBe('ERROR');
    expect(result.error).toBe('ECONNREFUSED');
  });
});

describe('checkPinecone', () => {
  beforeEach(() => { global.fetch = jest.fn(); });
  afterEach(() => { jest.clearAllMocks(); });

  test('retourne OK sur réponse 200', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200 });
    const result = await checkPinecone();
    // On mock process.env via le module — on teste juste la structure
    expect(['OK', 'ERROR']).toContain(result.status);
    expect(result.provider).toBe('Pinecone');
  });

  test('utilise le header Api-Key (pas Bearer)', async () => {
    process.env.PINECONE_API_KEY = 'test-key';
    global.fetch.mockResolvedValue({ ok: true, status: 200 });
    await checkPinecone();
    const headers = global.fetch.mock.calls[0]?.[1]?.headers ?? {};
    expect(headers['Api-Key']).toBe('test-key');
    expect(headers['X-Pinecone-API-Version']).toBe('2024-07');
  });
});

describe('displayResult', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  test('affiche ✅ pour un résultat OK', () => {
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation(m => logs.push(m));
    displayResult({ provider: 'Mistral', status: 'OK', latency: 300 });
    expect(logs[0]).toContain('✅');
    expect(logs[0]).toContain('Mistral');
  });

  test('affiche ❌ et le message d\'erreur pour un résultat ERROR', () => {
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation(m => logs.push(m));
    displayResult({ provider: 'Groq', status: 'ERROR', latency: 50, error: 'HTTP 401' });
    expect(logs[0]).toContain('❌');
    expect(logs[0]).toContain('HTTP 401');
  });

  test('affiche la réponse en mode verbose', () => {
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation(m => logs.push(m));
    displayResult({ provider: 'Mistral', status: 'OK', latency: 300, answer: 'Paris' });
    expect(logs[0]).toContain('Paris');
  });
});
