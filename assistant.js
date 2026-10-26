(() => {
  const config = window.HAMDI_ASSISTANT_CONFIG;
  const widget = document.getElementById("assistantWidget");
  if (!widget || !config || typeof config.endpoint !== "string") return;

  let endpoint;
  try {
    const url = new URL(config.endpoint);
    if (url.protocol !== "https:") return;
    endpoint = url.href;
  } catch {
    return;
  }

  const launcher = document.getElementById("assistantLauncher");
  const panel = document.getElementById("assistantPanel");
  const closeButton = document.getElementById("assistantClose");
  const form = document.getElementById("assistantForm");
  const input = document.getElementById("assistantInput");
  const sendButton = document.getElementById("assistantSend");
  const messagesNode = document.getElementById("assistantMessages");
  const welcome = widget.querySelector("[data-assistant-welcome]");
  if (!launcher || !panel || !closeButton || !form || !input || !sendButton || !messagesNode) return;

  const copy = {
    ar: {
      launcher: "المساعد الذكي", eyebrow: "HAMDI PHOTOGRAPHY · مساعد حمدي",
      title: "كيف أقدر أساعدك؟", close: "إغلاق", welcome: "أهلًا! اسألني عن الأسعار، أنواع الجلسات أو طريقة الحجز.",
      label: "اكتب سؤالك", placeholder: "اكتب رسالتك هنا...", send: "إرسال",
      pricesChip: "أسعار التصوير", bookingChip: "حجز جلسة",
      pricePrompt: "ما أسعار باقات التصوير؟", bookingPrompt: "أريد حجز جلسة تصوير. ما المعلومات المطلوبة؟",
      thinking: "عم حضّر لك الإجابة…", missing: "المساعد غير جاهز حاليًا. تواصل مع حمدي عبر واتساب.",
      limited: "وصلنا للحد المؤقت من الرسائل. جرّب بعد دقيقة.",
      error: "ما قدرت أوصل للمساعد الآن. جرّب مرة ثانية أو تواصل مع حمدي عبر واتساب.",
      network: "تعذر الاتصال. تحقق من الإنترنت وحاول مجددًا.",
      footer: "للتأكيد والحجز:", whatsapp: "واتساب"
    },
    tr: {
      launcher: "Yapay zekâ asistanı", eyebrow: "HAMDI PHOTOGRAPHY · ASİSTAN",
      title: "Size nasıl yardımcı olabilirim?", close: "Kapat",
      welcome: "Merhaba! Fiyatları, çekim türlerini veya rezervasyon adımlarını sorabilirsiniz.",
      label: "Sorunuzu yazın", placeholder: "Mesajınızı yazın...", send: "Gönder",
      pricesChip: "Çekim fiyatları", bookingChip: "Çekim randevusu",
      pricePrompt: "Fotoğraf çekim paketlerinin fiyatları nedir?",
      bookingPrompt: "Bir çekim randevusu almak istiyorum. Hangi bilgiler gerekli?",
      thinking: "Yanıt hazırlanıyor…", missing: "Asistan şu anda hazır değil. Hamdi ile WhatsApp üzerinden iletişime geçin.",
      limited: "Geçici mesaj sınırına ulaşıldı. Bir dakika sonra tekrar deneyin.",
      error: "Asistana şu anda ulaşılamadı. Tekrar deneyin veya WhatsApp üzerinden yazın.",
      network: "Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.",
      footer: "Rezervasyonu onaylamak için:", whatsapp: "WhatsApp"
    },
    en: {
      launcher: "AI assistant", eyebrow: "HAMDI PHOTOGRAPHY · ASSISTANT",
      title: "How can I help?", close: "Close",
      welcome: "Hello! Ask me about prices, session types, or how to book.",
      label: "Write your question", placeholder: "Type your message...", send: "Send",
      pricesChip: "Photography prices", bookingChip: "Book a session",
      pricePrompt: "What are the photography package prices?",
      bookingPrompt: "I would like to book a photography session. What information is needed?",
      thinking: "Preparing an answer…", missing: "The assistant is not ready yet. Contact Hamdi on WhatsApp.",
      limited: "The temporary message limit was reached. Please try again in a minute.",
      error: "I couldn’t reach the assistant just now. Try again or contact Hamdi on WhatsApp.",
      network: "Connection failed. Check your internet and try again.",
      footer: "To confirm a booking:", whatsapp: "WhatsApp"
    }
  };

  let history = [];
  let busy = false;
  let busyNode = null;

  function currentLanguage() {
    const value = (document.documentElement.lang || "ar").toLowerCase();
    return value.startsWith("tr") ? "tr" : value.startsWith("en") ? "en" : "ar";
  }

  function setLanguage() {
    const lang = currentLanguage();
    const text = copy[lang];
    widget.dir = lang === "ar" ? "rtl" : "ltr";
    widget.querySelectorAll("[data-ai-copy]").forEach((node) => {
      const key = node.dataset.aiCopy;
      if (text[key]) node.textContent = text[key];
    });
    widget.querySelectorAll("[data-ai-placeholder]").forEach((node) => {
      const key = node.dataset.aiPlaceholder;
      if (text[key]) node.setAttribute("placeholder", text[key]);
    });
    widget.querySelectorAll("[data-ai-aria]").forEach((node) => {
      const key = node.dataset.aiAria;
      if (text[key]) node.setAttribute("aria-label", text[key]);
    });
    widget.querySelectorAll("[data-assistant-prompt]").forEach((node) => {
      node.textContent = text[node.dataset.assistantPrompt === "prices" ? "pricesChip" : "bookingChip"];
    });
    if (welcome && history.length === 0) welcome.textContent = text.welcome;
    input.setAttribute("aria-label", text.label);
  }

  function appendMessage(message, kind) {
    const bubble = document.createElement("p");
    bubble.className = "assistant-message assistant-message--" + kind;
    bubble.dir = "auto";
    bubble.textContent = message;
    messagesNode.appendChild(bubble);
    messagesNode.scrollTop = messagesNode.scrollHeight;
    return bubble;
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (open) {
      window.setTimeout(() => input.focus(), 40);
    } else {
      launcher.focus();
    }
  }

  function errorText(error) {
    const text = copy[currentLanguage()];
    if (error.status === 429 || error.code === "rate_limited") return text.limited;
    if (error.code === "missing_api_key" || error.code === "api_key_invalid") return text.missing;
    if (error.name === "AbortError" || error instanceof TypeError) return text.network;
    return text.error;
  }

  async function sendMessage(message) {
    const content = String(message || "").trim();
    if (!content || busy) return;
    const requestMessages = history.concat([{ role: "user", content }]).slice(-8);
    appendMessage(content, "user");
    busy = true;
    input.disabled = true;
    sendButton.disabled = true;
    busyNode = appendMessage(copy[currentLanguage()].thinking, "status");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error("Assistant request failed");
        error.status = response.status;
        error.code = data.error || "";
        throw error;
      }
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("Assistant reply was empty");
      }
      history = requestMessages.concat([{ role: "assistant", content: data.reply.trim() }]).slice(-12);
      busyNode.remove();
      busyNode = null;
      appendMessage(data.reply.trim(), "bot");
    } catch (error) {
      if (busyNode) busyNode.remove();
      busyNode = null;
      appendMessage(errorText(error), "status");
    } finally {
      window.clearTimeout(timeout);
      busy = false;
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener("click", () => setOpen(panel.hidden));
  closeButton.addEventListener("click", () => setOpen(false));
  widget.addEventListener("click", (event) => {
    const promptButton = event.target.closest("[data-assistant-prompt]");
    if (!promptButton) return;
    const key = promptButton.dataset.assistantPrompt === "prices" ? "pricePrompt" : "bookingPrompt";
    sendMessage(copy[currentLanguage()][key]);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    input.value = "";
    sendMessage(value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  const languageObserver = new MutationObserver(setLanguage);
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  setLanguage();
  widget.hidden = false;
})();
