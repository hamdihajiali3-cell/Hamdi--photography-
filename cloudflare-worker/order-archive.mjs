import { signedOrderEnvelope } from './order-email.mjs';

export const ARCHIVE_PREFIX = 'archive:';
export const ARCHIVE_RETRY_MS = 5 * 60 * 1000;

export function archiveConfigured(env) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(env.ORDER_ARCHIVE_ENDPOINT || '') &&
    (env.ORDER_ARCHIVE_SECRET || '').length >= 32;
}

export function archiveKey(time, id) {
  return ARCHIVE_PREFIX + String(time).padStart(16, '0') + ':' + id;
}

export function archiveTime(key) {
  return Number(key.split(':')[1]);
}

export async function scheduleArchive(storage, time) {
  const scheduled = await storage.getAlarm();
  if (scheduled === null || time < scheduled) await storage.setAlarm(time);
}

export async function sendOrderArchive(entry, env, now = Date.now(), fetchImpl = fetch) {
  if (!archiveConfigured(env)) throw new Error('archive-not-configured');
  const { id, service, when } = entry;
  const payload = entry.check === true ? { check: true } : { id, service, when };
  const envelope = await signedOrderEnvelope({ version: 1, sentAt: now, ...payload }, env.ORDER_ARCHIVE_SECRET);
  const signal = AbortSignal.timeout(12000);
  let response = await fetchImpl(env.ORDER_ARCHIVE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(envelope),
    redirect: 'manual',
    signal
  });
  if (response.status === 302 || response.status === 303) {
    const location = response.headers.get('location') || '';
    if (!/^https:\/\/script\.googleusercontent\.com\/macros\/echo\?/.test(location)) {
      throw new Error('archive-unconfirmed');
    }
    response = await fetchImpl(location, { redirect: 'error', signal });
  }
  if (!response.ok) throw new Error('archive-unconfirmed');
  const receipt = await response.json();
  if (receipt?.accepted !== true || (entry.check === true ? receipt.check !== true : receipt.id !== id)) {
    throw new Error('archive-unconfirmed');
  }
}
