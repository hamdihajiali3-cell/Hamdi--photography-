import { readBodyLimited } from './request-security.mjs';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = MAX_IMAGE_BYTES + 64 * 1024;
const reply = (value, status = 200) => Response.json(value, {
  status, headers: { 'Cache-Control': 'no-store' },
});

function isAuthorized(request, token) {
  const supplied = request.headers.get('authorization') || '';
  const expected = 'Bearer ' + token;
  if (supplied.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++) {
    mismatch |= supplied.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function handleStudioRequest(request, env) {
  const path = new URL(request.url).pathname;
  const configured = env.STUDIO_EDIT_ENABLED === 'true'
    && typeof env.STUDIO_EDIT_TOKEN === 'string'
    && env.STUDIO_EDIT_TOKEN.length >= 32
    && Boolean(env.OPENAI_API_KEY);
  if (path === '/api/studio/status' && request.method === 'GET') {
    return reply({ ok: true, configured, max_upload_bytes: MAX_IMAGE_BYTES, model: 'gpt-image-1' });
  }
  if (path !== '/api/studio/edit' || request.method !== 'POST') {
    return reply({ error: 'not_found' }, 404);
  }
  if (!configured) return reply({ error: 'studio_not_configured' }, 503);
  if (!isAuthorized(request, env.STUDIO_EDIT_TOKEN)) {
    return reply({ error: 'authorization_required' }, 401);
  }
  const contentType = request.headers.get('content-type') || '';
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return reply({ error: 'multipart_required' }, 415);
  }
  const bytes = await readBodyLimited(request, MAX_UPLOAD_BYTES);
  if (!bytes) return reply({ error: 'upload_too_large' }, 413);
  let form;
  try {
    form = await new Response(bytes, { headers: { 'content-type': contentType } }).formData();
  } catch {
    return reply({ error: 'invalid_form' }, 400);
  }
  const file = form.get('image');
  const rawPrompt = form.get('prompt');
  if (!(file instanceof File) || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
    return reply({ error: 'image_required' }, 400);
  }
  if (file.size > MAX_IMAGE_BYTES) return reply({ error: 'image_too_large' }, 413);
  if (typeof rawPrompt !== 'string') return reply({ error: 'prompt_required' }, 400);
  const prompt = rawPrompt.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 1800);
  if (!prompt) return reply({ error: 'prompt_required' }, 400);
  const payload = new FormData();
  payload.append('model', 'gpt-image-1');
  payload.append('prompt', prompt);
  payload.append('image', file, file.name || 'photo.png');
  payload.append('size', 'auto');
  payload.append('quality', 'high');
  try {
    const upstream = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY },
      body: payload,
      signal: AbortSignal.timeout(60000),
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return reply({ error: 'image_edit_unavailable' }, 502);
    }
    const result = await upstream.json();
    const image = result.data?.[0]?.b64_json;
    if (typeof image !== 'string' || !image) return reply({ error: 'empty_image_response' }, 502);
    return reply({ ok: true, image: 'data:image/png;base64,' + image });
  } catch {
    return reply({ error: 'image_edit_unavailable' }, 503);
  }
}
