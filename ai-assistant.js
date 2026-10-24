(() => {
  "use strict";

  const copy = {
    ar: {
      title: "مساعد حمدي الذكي",
      subtitle: "اسأل عن التصوير أو احجز جلستك",
      open: "افتح المساعد الذكي",
      close: "إغلاق المساعد",
      greeting: "أهلاً فيك! اسألني عن أنواع جلسات التصوير، التحضير، أو الحجز في غازي عنتاب.",
      placeholder: "اكتب سؤالك هنا...",
      send: "إرسال",
      busy: "عم بجهز لك جواب...",
      offline: "المساعد الذكي لم يتصل بالخادم بعد. تواصل مع حمدي عبر واتساب للحجز الآن.",
      offlineButton: "تابع عبر واتساب",
      error: "ما وصلني اتصال بالخادم. جرّب مرة ثانية أو تابع عبر واتساب.",
      pricePrompt: "ما هي الأسعار التقريبية لأنواع التصوير؟",
      portraitPrompt: "كيف أستعد لجلسة بورتريه؟",
      bookingPrompt: "كيف أحجز جلسة تصوير؟",
      inputLabel: "اكتب رسالتك للمساعد الذكي",
      privacy: "يرسل الموقع رسالتك إلى المساعد لمعالجتها، ولا يحفظ المحادثة.",
      typing: "المساعد يكتب الآن"
    },
    tr: {
      title: "Hamdi Akıllı Asistan",
      subtitle: "Fotoğrafçılığı sorun veya çekim planlayın",
      open: "Akıllı asistanı aç",
      close: "Asistanı kapat",
      greeting: "Merhaba! Çekim türleri, hazırlık veya Gaziantep'te rezervasyon hakkında sorabilirsiniz.",
      placeholder: "Sorunuzu yazın...",
      send: "Gönder",
      busy: "Yanıt hazırlanıyor...",
      offline: "Akıllı asistan henüz sunucuya bağlanmadı. Rezervasyon için WhatsApp'tan Hamdi'ye yazabilirsiniz.",
      offlineButton: "WhatsApp'tan devam et",
      error: "Sunucuya bağlanamadım. Tekrar deneyin veya WhatsApp'tan devam edin.",
      pricePrompt: "Fotoğrafçılık türlerinin yaklaşık fiyatları nedir?",
      portraitPrompt: "Portre çekimine nasıl hazırlanabilirim?",
      bookingPrompt: "Fotoğraf çekimi için nasıl rezervasyon yapabilirim?",
      inputLabel: "Akıllı asistana mesajınızı yazın",
      privacy: "Mesajınız yanıt oluşturmak için asistana gönderilir; sohbet kaydedilmez.",
      typing: "Asistan yazıyor"
    },
    en: {
      title: "Hamdi AI Assistant",
      subtitle: "Ask about photography or plan a shoot",
      open: "Open AI assistant",
      close: "Close assistant",
      greeting: "Welcome! Ask about session types, preparation, or booking in Gaziantep.",
      placeholder: "Write your question...",
      send: "Send",
      busy: "Preparing your answer...",
      offline: "The AI assistant is not connected to its server yet. Contact Hamdi on WhatsApp to book now.",
      offlineButton: "Continue on WhatsApp",
      error: "I couldn't reach the server. Try again or continue on WhatsApp.",
      pricePrompt: "What are approximate prices for different photography services?",
      portraitPrompt: "How should I prepare for a portrait session?",
      bookingPrompt: "How can I book a photography session?",
      inputLabel: "Write your message to the AI assistant",
      privacy: "Your message is sent to the assistant to create a reply; this chat is not saved.",
      typing: "Assistant is typing"
    }
  };

  const locale = () => copy[document.documentElement.lang] || copy.en;
  const endpoint = String(window.HAMDI_AI_CONFIG?.endpoint || "").trim();
  const validEndpoint = (() => {
    if (!endpoint) return false;
    try {
      return new URL(endpoint).protocol === "https:";
    } catch (_) {
      return false;
    }
  })();

  function init() {
    if (document.getElementById("hamdiAiLauncher")) return;

    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.id = "hamdiAiLauncher";
    launcher.className = "hamdi-ai-launcher";
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML =
      '<span class="hamdi-ai-launcher-icon" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false"><path d="M8 6.5h16A4.5 4.5 0 0 1 28.5 11v9a4.5 4.5 0 0 1-4.5 4.5h-7l-6.5 4v-4H8A4.5 4.5 0 0 1 3.5 20v-9A4.5 4.5 0 0 1 8 6.5Z"/><path d="m16 10 1.35 3.65L21 15l-3.65 1.35L16 20l-1.35-3.65L11 15l3.65-1.35L16 10Z"/></svg></span>' +
      '<span class="hamdi-ai-launcher-label"></span>';
    document.body.appendChild(launcher);

    const panel = document.createElement("section");
    panel.id = "hamdiAiPanel";
    panel.className = "hamdi-ai-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "hamdiAiTitle");
    panel.innerHTML =
      '<header class="hamdi-ai-header">' +
        '<div class="hamdi-ai-brand-mark" aria-hidden="true">H<span>✦</span></div>' +
        '<div class="hamdi-ai-heading"><h2 id="hamdiAiTitle"></h2><p class="hamdi-ai-subtitle"></p></div>' +
        '<button type="button" class="hamdi-ai-close" aria-label="">×</button>' +
      '</header>' +
      '<div class="hamdi-ai-status" role="status" aria-live="polite"></div>' +
      '<div class="hamdi-ai-messages" aria-live="polite" aria-relevant="additions text"></div>' +
      '<div class="hamdi-ai-offline-action" hidden><a href="#" target="_blank" rel="noopener noreferrer"></a></div>' +
      '<form class="hamdi-ai-form">' +
        '<label class="sr-only" for="hamdiAiInput"></label>' +
        '<textarea id="hamdiAiInput" rows="1" maxlength="1200"></textarea>' +
        '<button type="submit" class="hamdi-ai-send"><span></span><b aria-hidden="true">↗</b></button>' +
      '</form>' +
      '<p class="hamdi-ai-privacy"></p>';
    document.body.appendChild(panel);

    const messagesEl = panel.querySelector(".hamdi-ai-messages");
    const statusEl = panel.querySelector(".hamdi-ai-status");
    const input = panel.querySelector("#hamdiAiInput");
    const send = panel.querySelector(".hamdi-ai-send");
    const form = panel.querySelector(".hamdi-ai-form");
    const offlineAction = panel.querySelector(".hamdi-ai-offline-action");
    const conversation = [];
    let busy = false;

    const whatsappUrl = (text) => "https://wa.me/905377423671?text=" + encodeURIComponent(text);
    const addMessage = (role, text, className = "") => {
      const bubble = document.createElement("div");
      bubble.className = "hamdi-ai-message hamdi-ai-message-" + role + (className ? " " + className : "");
      bubble.textContent = text;
      messagesEl.appendChild(bubble);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    };

    function renderLanguage() {
      const t = locale();
      const lang = document.documentElement.lang || "en";
      launcher.setAttribute("aria-label", t.open);
      launcher.setAttribute("aria-expanded", String(!panel.hidden));
      launcher.querySelector(".hamdi-ai-launcher-label").textContent = t.title;
      panel.lang = lang;
      panel.dir = lang === "ar" ? "rtl" : "ltr";
      panel.querySelector("#hamdiAiTitle").textContent = t.title;
      panel.querySelector(".hamdi-ai-subtitle").textContent = t.subtitle;
      panel.querySelector(".hamdi-ai-close").setAttribute("aria-label", t.close);
      panel.querySelector("label[for='hamdiAiInput']").textContent = t.inputLabel;
      input.placeholder = t.placeholder;
      send.querySelector("span").textContent = t.send;
      panel.querySelector(".hamdi-ai-privacy").textContent = t.privacy;
      statusEl.textContent = validEndpoint ? "" : t.offline;
      offlineAction.hidden = validEndpoint;
      const waLink = offlineAction.querySelector("a");
      waLink.textContent = t.offlineButton;
      waLink.href = whatsappUrl(t.title);
      input.disabled = !validEndpoint || busy;
      send.disabled = !validEndpoint || busy;
      if (!messagesEl.childElementCount) addMessage("assistant", t.greeting);
      launcher.setAttribute("aria-expanded", String(!panel.hidden));
    }

    function openPanel() {
      panel.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      renderLanguage();
      window.setTimeout(() => {
        if (validEndpoint) input.focus();
        else panel.querySelector(".hamdi-ai-close").focus();
      }, 0);
    }

    function closePanel() {
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    }

    async function sendMessage(text) {
      const cleanText = String(text || "").trim();
      if (!cleanText || busy || !validEndpoint) return;

      addMessage("user", cleanText);
      conversation.push({ role: "user", content: cleanText });
      input.value = "";
      busy = true;
      const t = locale();
      statusEl.textContent = t.busy;
      input.disabled = true;
      send.disabled = true;
      const typing = addMessage("assistant", "···", "hamdi-ai-typing");
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversation.slice(-8) })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || typeof data.answer !== "string" || !data.answer.trim()) {
          throw new Error("assistant unavailable");
        }
        typing.remove();
        const answer = data.answer.trim();
        conversation.push({ role: "assistant", content: answer });
        addMessage("assistant", answer);
      } catch (_) {
        typing.remove();
        addMessage("assistant", locale().error);
      } finally {
        busy = false;
        statusEl.textContent = validEndpoint ? "" : locale().offline;
        input.disabled = !validEndpoint;
        send.disabled = !validEndpoint;
        input.focus();
      }
    }

    launcher.addEventListener("click", () => panel.hidden ? openPanel() : closePanel());
    panel.querySelector(".hamdi-ai-close").addEventListener("click", closePanel);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    panel.addEventListener("click", (event) => {
      const quick = event.target.closest("[data-ai-prompt]");
      if (quick && validEndpoint) sendMessage(quick.getAttribute("data-ai-prompt"));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) closePanel();
    });
    new MutationObserver(renderLanguage).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });
    renderLanguage();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
