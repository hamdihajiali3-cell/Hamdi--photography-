import { createLiveApi, liveSettings } from './hamdi-live.mjs';

const MAX_BODY_BYTES = 2048;
const COOLDOWN_MS = 15000;
// The provider request has a 12-second timeout. A longer durable lease also
// recovers a claim left behind by a terminated Worker without rapid retries.
const PENDING_STALE_MS = 30000;
const STORAGE_KEY = 'voice-quota-v1';
const GLOBAL_GUARD_NAME = 'hamdi-ai-voice-global-v1';
const PUBLIC_ERRORS = new Set([
  'voice-not-configured', 'same-origin-required', 'json-required', 'invalid-json',
  'consent-required', 'unexpected-fields', 'pilot-limit', 'invalid-server-config',
  'provider-quota', 'provider-unavailable', 'invalid-provider-response',
  'provider-key-rejected', 'provider-permission', 'provider-model-unavailable',
  'provider-model-not-found', 'provider-auth', 'provider-forbidden',
  'provider-model', 'provider-network',
]);

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function settingsFor(env) {
  const settings = liveSettings(env);
  // Durable counters are integers even when a dashboard value contains decimals.
  return { ...settings, daily: Math.min(20, Math.max(1, Math.floor(settings.daily))) };
}

function validServerConfig(settings) {
  return /^[a-zA-Z0-9._-]+$/.test(settings.model)
    && ['v1alpha', 'v1beta'].includes(settings.version);
}

function statusResponse(settings, guardReady = true) {
  return json({
    configured: guardReady && settings.enabled && Boolean(settings.key) && validServerConfig(settings),
    maxSeconds: settings.seconds,
    pilot: true,
  });
}

function isVoiceRoute(url, method) {
  return (url.pathname === '/api/status' && method === 'GET')
    || (url.pathname === '/api/live-token' && method === 'POST');
}

// The public Worker forwards the original URL and headers. The Durable Object
// never accepts a client-supplied upstream URL or proxies an arbitrary target.
export async function handleVoiceRequest(request, env) {
  const url = new URL(request.url);
  if (!isVoiceRoute(url, request.method)) return json({ error: 'not-found' }, 404);
  const settings = settingsFor(env);
  if (!env.VOICE_SESSION_GUARD) {
    return url.pathname === '/api/status'
      ? statusResponse(settings, false)
      : json({ error: 'voice-not-configured' }, 503);
  }
  try {
    const id = env.VOICE_SESSION_GUARD.idFromName(GLOBAL_GUARD_NAME);
    return await env.VOICE_SESSION_GUARD.get(id).fetch(request);
  } catch {
    return url.pathname === '/api/status'
      ? statusResponse(settings, false)
      : json({ error: 'voice-temporarily-unavailable' }, 503);
  }
}

async function boundedJson(request) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return { error: 'payload-too-large', status: 413 };
  }
  if (!request.body) return { error: 'invalid-json', status: 400 };
  const reader = request.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { error: 'payload-too-large', status: 413 };
      }
      chunks.push(value);
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
    return { body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)) };
  } catch {
    return { error: 'invalid-json', status: 400 };
  } finally {
    reader.releaseLock();
  }
}

function quotaState(raw, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  const used = raw?.day === day && Number.isSafeInteger(raw.used) && raw.used >= 0 ? raw.used : 0;
  const lastAttempt = Number.isFinite(raw?.lastAttempt) ? raw.lastAttempt : null;
  const lease = raw?.pending;
  const pending = typeof lease?.id === 'string' && Number.isFinite(lease.at)
    && now - lease.at < PENDING_STALE_MS ? { id: lease.id, at: lease.at } : null;
  return { day, used, lastAttempt, pending };
}

export class VoiceSessionGuard {
  constructor(ctx, env, dependencies = {}) {
    this.ctx = ctx;
    this.env = env;
    // Optional injected functions are used only by the local mock tests.
    this.fetchImpl = dependencies.fetch || fetch;
    this.now = dependencies.now || Date.now;
    this.uuid = dependencies.uuid || (() => crypto.randomUUID());
  }

  async claim(settings) {
    const now = this.now();
    const id = this.uuid();
    return this.ctx.storage.transaction(async storage => {
      const state = quotaState(await storage.get(STORAGE_KEY), now);
      if (state.pending || state.used >= settings.daily
        || (state.lastAttempt !== null && now - state.lastAttempt < COOLDOWN_MS)) {
        await storage.put(STORAGE_KEY, state);
        return null;
      }
      state.pending = { id, at: now };
      state.lastAttempt = now;
      await storage.put(STORAGE_KEY, state);
      return id;
    });
  }

  async finish(id, successful, settings) {
    const now = this.now();
    return this.ctx.storage.transaction(async storage => {
      const state = quotaState(await storage.get(STORAGE_KEY), now);
      // A delayed result must never release a replacement claim or deliver a
      // token after its own lease expired. Only delivered successes count.
      if (state.pending?.id !== id) return false;
      state.pending = null;
      const accepted = successful && state.used < settings.daily;
      if (accepted) state.used++;
      await storage.put(STORAGE_KEY, state);
      return accepted;
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (!isVoiceRoute(url, request.method)) return json({ error: 'not-found' }, 404);
    const settings = settingsFor(this.env);
    if (url.pathname === '/api/status') return statusResponse(settings);
    if (!settings.enabled || !settings.key) return json({ error: 'voice-not-configured' }, 503);
    if (!validServerConfig(settings)) return json({ error: 'invalid-server-config' }, 503);
    if (request.headers.get('origin') !== url.origin
      || request.headers.get('sec-fetch-site') === 'cross-site') {
      return json({ error: 'same-origin-required' }, 403);
    }
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return json({ error: 'json-required' }, 415);
    }
    const parsed = await boundedJson(request);
    if (parsed.error) return json({ error: parsed.error }, parsed.status);
    const body = parsed.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || body.adult !== true || body.consent !== true || !['ar', 'tr'].includes(body.language)) {
      return json({ error: 'consent-required' }, 400);
    }
    if (Object.keys(body).some(key => !['adult', 'consent', 'language'].includes(key))) {
      return json({ error: 'unexpected-fields' }, 400);
    }

    let claimId;
    try { claimId = await this.claim(settings); }
    catch { return json({ error: 'voice-temporarily-unavailable' }, 503); }
    if (!claimId) return json({ error: 'pilot-limit' }, 429);

    let result;
    try {
      const headers = new Headers(request.headers);
      headers.delete('content-length');
      headers.set('content-type', 'application/json');
      const validated = new Request(request.url, {
        method: 'POST', headers, body: JSON.stringify(body), signal: request.signal,
      });
      // A new handler for each request leaves the persistent global quota solely
      // in durable storage, rather than a Worker isolate's process memory.
      const response = await createLiveApi(settings, this.fetchImpl, this.now)(validated);
      const data = await response.json();
      if (response.ok && typeof data.token === 'string'
        && data.token.startsWith('auth_tokens/') && !/\s/.test(data.token) && data.token.length <= 8192) {
        result = { token: data.token };
      } else {
        result = {
          error: PUBLIC_ERRORS.has(data.error) ? data.error : 'provider-unavailable',
          status: [400, 403, 404, 415, 429, 502, 503].includes(response.status) ? response.status : 503,
        };
      }
    } catch {
      result = { error: 'provider-unavailable', status: 503 };
    }

    try {
      const accepted = await this.finish(claimId, Boolean(result.token), settings);
      if (result.token && !accepted) return json({ error: 'voice-session-expired' }, 503);
    } catch {
      return json({ error: 'voice-temporarily-unavailable' }, 503);
    }
    return result.token
      ? json({ token: result.token, model: `models/${settings.model}`, version: settings.version, maxSeconds: settings.seconds })
      : json({ error: result.error }, result.status);
  }
}
