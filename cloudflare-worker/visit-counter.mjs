const siteOrigins = new Set([
  'https://hamdihajiali3-cell.github.io',
  'https://hamdi--photography.hamdihajiali3.workers.dev'
]);

function reply(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

export class VisitCounter {
  constructor(ctx) {
    this.storage = ctx.storage;
  }

  async fetch(request) {
    if (request.method === 'GET') {
      return reply({ visits: await this.storage.get('total') ?? 0 });
    }
    if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

    const visits = await this.storage.transaction(async (transaction) => {
      const total = (await transaction.get('total') ?? 0) + 1;
      await transaction.put('total', total);
      return total;
    });
    return reply({ visits });
  }
}

export async function handleVisitRequest(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = siteOrigins.has(origin);
  if (!allowedOrigin && (origin || request.method === 'POST')) {
    return reply({ error: 'origin_not_allowed' }, 403);
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    return reply({ error: 'method_not_allowed' }, 405);
  }

  let response;
  try {
    const counter = env.VISIT_COUNTER.get(env.VISIT_COUNTER.idFromName('site-visits'));
    response = await counter.fetch('https://visit-counter/total', { method: request.method });
  } catch {
    response = reply({ error: 'counter_unavailable' }, 503);
  }
  const headers = new Headers(response.headers);
  headers.set('Vary', 'Origin');
  if (allowedOrigin) headers.set('Access-Control-Allow-Origin', origin);
  return new Response(response.body, { status: response.status, headers });
}
