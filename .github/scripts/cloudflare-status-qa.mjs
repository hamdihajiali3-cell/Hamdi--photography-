import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleVoiceRequest } from '../../cloudflare-worker/hamdi-voice.mjs';

const base = 'https://hamdi--photography.example';
const readyEnv = () => ({
  LIVE_ENABLED: 'true',
  GEMINI_FREE_TIER_CONFIRMED: 'true',
  GEMINI_API_KEY: 'test-only-secret-never-public',
  GEMINI_MODEL: 'gemini-test-live',
  GEMINI_API_VERSION: 'v1alpha',
  VOICE_SESSION_SECONDS: '120',
  VOICE_SESSIONS_PER_DAY: '20',
  VOICE_SESSION_GUARD: {
    idFromName() { throw new Error('status must never touch DO'); },
  },
});

test('status checks bypass the global Durable Object without exposing keys', async () => {
  const response = await handleVoiceRequest(new Request(base + '/api/status'), readyEnv());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.deepEqual(body, { configured: true, maxSeconds: 120, pilot: true });
  assert(!JSON.stringify(body).includes('test-only-secret'));
});

test('status remains unconfigured when the guard or provider is missing', async () => {
  const env = readyEnv();
  delete env.VOICE_SESSION_GUARD;
  assert.equal((await (await handleVoiceRequest(new Request(base + '/api/status'), env)).json()).configured, false);
  const disabled = readyEnv();
  disabled.LIVE_ENABLED = 'false';
  assert.equal((await (await handleVoiceRequest(new Request(base + '/api/status'), disabled)).json()).configured, false);
});

test('POST token admissions still route through the Durable Object', async () => {
  let calls = 0;
  const env = readyEnv();
  env.VOICE_SESSION_GUARD = {
    idFromName(name) { assert.equal(name, 'hamdi-ai-voice-global-v1'); return 'voice-object'; },
    get(id) {
      assert.equal(id, 'voice-object');
      return { async fetch(request) {
        calls++;
        assert.equal(new URL(request.url).pathname, '/api/live-token');
        return Response.json({ routed: true });
      } };
    },
  };
  const response = await handleVoiceRequest(new Request(base + '/api/live-token', { method: 'POST' }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { routed: true });
  assert.equal(calls, 1);
});

test('unknown routes and missing token guards fail closed', async () => {
  assert.equal((await handleVoiceRequest(new Request(base + '/api/missing'), readyEnv())).status, 404);
  const env = readyEnv();
  delete env.VOICE_SESSION_GUARD;
  assert.equal((await handleVoiceRequest(new Request(base + '/api/live-token', { method: 'POST' }), env)).status, 503);
});
