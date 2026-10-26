const DEFAULT_ORIGIN = "https://hamdihajiali3-cell.github.io";
const assistantInstructions = [
  "You are Hamdi Photography's website assistant. Help visitors understand photography services, prices, and how to request a booking.",
  "Reply in the same language as the visitor: Arabic (friendly Levantine/Syrian style), Turkish, or English. Keep replies concise, warm, and clear.",
  "Only use the facts below. Never invent availability, extra services, package details, or prices. Hamdi confirms dates and final details on WhatsApp.",
  "Business location: Gaziantep, Türkiye. Booking and confirmation are handled by Hamdi through WhatsApp at +90 537 742 36 71. Ask for the session type and preferred date when helpful.",
  "Portrait/family: up to 1 hour; 5 edited photos for TRY 2,000, or 10 edited photos for TRY 3,500.",
  "Graduation: 10 photos for TRY 3,000, or 20 photos for TRY 5,000.",
  "Product/commercial: simple-background products; 5 photos for TRY 3,500, or 10 photos for TRY 6,000. Extra angles or setup are quoted separately.",
  "Events: 20 photos/up to 2 hours for TRY 5,000, or 40 photos/up to 4 hours for TRY 8,500.",
  "Engagement/wedding: 40 photos/up to 4 hours for TRY 8,500, or 80 photos/up to 6 hours for TRY 15,000. Printed album and video are quoted separately.",
  "Color correction: 1 photo for TRY 200, 5 photos for TRY 900, or 15 photos for TRY 2,400. Advanced retouching is quoted separately.",
  "If asked for a service or detail not listed, say you do not have confirmed details and invite the visitor to contact Hamdi on WhatsApp. Do not say you have made a booking."
].join(" ");

const localRateBuckets = new Map();
const RATE_WINDOW_MS = 60000;
const RATE_LIMIT = 10;

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }, corsHeaders || {})
  });
}

function corsFor(origin, allowedOrigin) {
  if (origin !== allowedOrigin) return {};
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function localRateAllowed(ip) {
  const now = Date.now();
  const current = localRateBuckets.get(ip);
  if (!current || now - current.started >= RATE_WINDOW_MS) {
    localRateBuckets.set(ip, { started: now, count: 1 });
    if (localRateBuckets.size > 1000) {
      for (const [key, value] of localRateBuckets) {
        if (now - value.started >= RATE_WINDOW_MS) localRateBuckets.delete(key);
      }
    }
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

async function allowRequest(env, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.CHAT_RATE_LIMITER && typeof env.CHAT_RATE_LIMITER.limit === "function") {
    try {
      const result = await env.CHAT_RATE_LIMITER.limit({ key: ip });
      return Boolean(result.success);
    } catch {
      return localRateAllowed(ip);
    }
  }
  return localRateAllowed(ip);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowedOrigin = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
    const corsHeaders = corsFor(origin, allowedOrigin);

    if (origin && origin !== allowedOrigin) {
      return json({ error: "origin_not_allowed" }, 403);
    }
    if (request.method === "OPTIONS") {
      if (origin !== allowedOrigin) return json({ error: "origin_not_allowed" }, 403);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true }, 200, corsHeaders);
    }
    if (url.pathname !== "/api/chat") {
      return json({ error: "not_found" }, 404, corsHeaders);
    }
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, corsHeaders);
    }
    if (origin !== allowedOrigin) {
      return json({ error: "origin_not_allowed" }, 403);
    }
    if (!env.OPENAI_API_KEY) {
      return json({ error: "missing_api_key" }, 503, corsHeaders);
    }
    if (!(await allowRequest(env, request))) {
      return json({ error: "rate_limited" }, 429, corsHeaders);
    }

    let body;
    try {
      const raw = await request.text();
      if (raw.length > 16000) return json({ error: "request_too_large" }, 413, corsHeaders);
      body = JSON.parse(raw);
    } catch {
      return json({ error: "invalid_json" }, 400, corsHeaders);
    }

    if (!Array.isArray(body.messages)) {
      return json({ error: "invalid_messages" }, 400, corsHeaders);
    }
    const messages = body.messages
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
      .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 1200) }))
      .filter((item) => item.content.length > 0)
      .slice(-8);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return json({ error: "invalid_messages" }, 400, corsHeaders);
    }

    let response;
    let payload;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.OPENAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-6-luna",
          instructions: assistantInstructions,
          input: messages,
          max_output_tokens: 500,
          store: false
        }),
        signal: controller.signal
      });
      payload = await response.json();
    } catch {
      return json({ error: "upstream_unavailable" }, 502, corsHeaders);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      if (response.status === 429) return json({ error: "rate_limited" }, 429, corsHeaders);
      if (response.status === 401 || response.status === 403) {
        return json({ error: "api_key_invalid" }, 502, corsHeaders);
      }
      return json({ error: "upstream_unavailable" }, 502, corsHeaders);
    }

    const reply = typeof payload.output_text === "string"
      ? payload.output_text.trim()
      : (payload.output || [])
        .filter((item) => item && item.type === "message")
        .flatMap((item) => Array.isArray(item.content) ? item.content : [])
        .filter((item) => item && item.type === "output_text" && typeof item.text === "string")
        .map((item) => item.text)
        .join("\n")
        .trim();

    if (!reply) return json({ error: "empty_reply" }, 502, corsHeaders);
    return json({ reply }, 200, corsHeaders);
  }
};
