function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function clean(value, max = 4000) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function transcriptFrom(payload) {
  if (typeof payload.concatenated_transcript === "string") {
    return clean(payload.concatenated_transcript, 7000);
  }
  if (typeof payload.transcript === "string") return clean(payload.transcript, 7000);
  if (Array.isArray(payload.transcripts)) {
    return payload.transcripts.slice(0, 80).map((turn) => {
      const speaker = clean(turn.user || turn.speaker || turn.role || "متحدث", 30);
      const text = clean(turn.text || turn.content || "", 500);
      return text ? speaker + ": " + text : "";
    }).filter(Boolean).join("\n").slice(0, 7000);
  }
  return "";
}

async function verifyBlandSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const supplied = signature.replace(/^sha256=/i, "").trim();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const base64 = btoa(String.fromCharCode(...digest));
  return constantTimeEqual(supplied.toLowerCase(), hex) || constantTimeEqual(supplied, base64);
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

export class CallbackGuard {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }

    if (body.action === "claim") {
      const result = await this.ctx.storage.transaction(async (txn) => {
        const existing = await txn.get("callback");
        const stillFresh = existing && Date.now() - existing.at < 7 * 24 * 60 * 60 * 1000;
        if (stillFresh && existing.state !== "failed") {
          return { claimed: false, state: existing.state };
        }
        await txn.put("callback", { state: "processing", at: Date.now() });
        return { claimed: true };
      });
      return json(result);
    }

    if (body.action === "finish" || body.action === "fail") {
      const current = await this.ctx.storage.get("callback");
      await this.ctx.storage.put("callback", {
        state: body.action === "finish" ? "queued" : "failed",
        callback_call_id: clean(body.callback_call_id || "", 160),
        at: Date.now()
      });
      return json({ ok: true, previous_state: current?.state || null });
    }

    return json({ error: "invalid_action" }, 400);
  }
}

function getCustomerPhone(payload) {
  // For an inbound Bland number, "from" is the caller and "to" is the Bland number.
  return clean(payload.from || payload.caller_number || payload.phone_number || "", 40);
}

function getCustomerName(payload) {
  const variables = payload.variables && typeof payload.variables === "object" ? payload.variables : {};
  return clean(
    variables.customer_name || variables.caller_name || variables.name ||
    payload.customer_name || payload.caller_name || "",
    120
  );
}

async function handlePostCall(request, env) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!env.BLAND_API_KEY || !env.BLAND_WEBHOOK_SECRET || !env.OWNER_PHONE_NUMBER || !env.CALLBACK_GUARD) {
    return json({ error: "server_not_configured" }, 503);
  }

  const rawBody = await request.text();
  if (rawBody.length > 100_000) return json({ error: "payload_too_large" }, 413);

  const valid = await verifyBlandSignature(
    rawBody,
    request.headers.get("x-webhook-signature"),
    env.BLAND_WEBHOOK_SECRET
  );
  if (!valid) return json({ error: "invalid_webhook_signature" }, 401);

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const callId = clean(payload.call_id || payload.callId || payload.id || "", 160);
  if (!callId) return json({ error: "missing_call_id" }, 400);

  const transcript = transcriptFrom(payload);
  const summary = clean(payload.summary || payload.analysis || "", 2500);
  if (!summary && !transcript) {
    return json({ error: "call_has_no_summary_or_transcript" }, 422);
  }

  const guardId = env.CALLBACK_GUARD.idFromName(callId);
  const guard = env.CALLBACK_GUARD.get(guardId);
  const claimResponse = await guard.fetch("https://callback-guard/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "claim" })
  });
  const claim = await claimResponse.json();
  if (!claim.claimed) return json({ ok: true, duplicate: true, state: claim.state });

  const callerPhone = getCustomerPhone(payload);
  const customerName = getCustomerName(payload);
  const callLength = clean(payload.call_length || payload.duration || "غير محدد", 40);
  const callStatus = clean(payload.status || (payload.completed ? "completed" : "post-call"), 40);

  const task = [
    "أنت Hamdi AI، مساعد هاتفي يتصل بحمدي عليّ لإبلاغه بتفاصيل مكالمة عميل انتهت للتو.",
    "تحدث بالعربية الواضحة وبأسلوب مختصر وطبيعي. ابدأ بقول إن لديك تقرير مكالمة جديدة.",
    "اذكر اسم العميل إن توفر، ورقم هاتفه إن توفر، والخدمة التي طلبها، والموعد أو المنطقة أو الميزانية التي ذكرها، وأي طلب خاص.",
    "لخص ما قاله العميل بدقة. لا تخترع أي معلومة ولا تعتبر الموعد مؤكداً. إذا كانت معلومة غير موجودة فقل إنها غير متوفرة.",
    "في النهاية قل لحمدي إن عليه التواصل مع العميل بنفسه لتأكيد التفاصيل والحجز.",
    "بيانات المكالمة:",
    "اسم العميل: " + (customerName || "لم يذكر"),
    "رقم العميل: " + (callerPhone || "غير متوفر"),
    "مدة المكالمة: " + callLength,
    "حالة المكالمة: " + callStatus,
    "ملخص Bland: " + (summary || "لا يوجد ملخص آلي؛ استخدم نص المحادثة."),
    "نص المحادثة:",
    transcript || "لا يوجد نص محادثة."
  ].join("\n");

  const blandResponse = await fetch("https://api.bland.ai/v1/calls", {
    method: "POST",
    headers: {
      "Authorization": env.BLAND_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phone_number: env.OWNER_PHONE_NUMBER,
      task,
      first_sentence: "مرحباً حمدي، أنا Hamdi AI. انتهت مكالمة عميل جديدة، وسأخبرك الآن بالتفاصيل.",
      max_duration: 4,
      wait_for_greeting: false
    })
  });

  const blandText = await blandResponse.text();
  let blandData = {};
  try { blandData = JSON.parse(blandText); } catch {}

  if (!blandResponse.ok || !blandData.call_id) {
    await guard.fetch("https://callback-guard/fail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fail" })
    });
    return json({
      error: "bland_callback_call_failed",
      bland_status: blandResponse.status,
      bland_message: clean(blandData.message || blandData.error || blandText, 300)
    }, 502);
  }

  await guard.fetch("https://callback-guard/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "finish", callback_call_id: blandData.call_id })
  });

  return json({ ok: true, callback_queued: true, callback_call_id: blandData.call_id });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "hamdi--photography",
        callback_ready: Boolean(
          env.BLAND_API_KEY && env.BLAND_WEBHOOK_SECRET &&
          env.OWNER_PHONE_NUMBER && env.CALLBACK_GUARD
        )
      });
    }

    if (url.pathname === "/api/bland/post-call") {
      return handlePostCall(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, 404);
    }

    if (!env.ASSETS) return json({ error: "assets_binding_missing" }, 500);
    return env.ASSETS.fetch(request);
  }
};
