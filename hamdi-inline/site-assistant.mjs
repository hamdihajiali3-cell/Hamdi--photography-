const VOICE_ORIGIN = 'https://hamdi--photography.hamdihajiali3.workers.dev';
const SERVICES = new Set(['', 'color', 'graduation', 'hair', 'id', 'portrait']);

export function readBookingRequest(event, expectedWindow) {
  if (!expectedWindow || event.source !== expectedWindow || event.origin !== VOICE_ORIGIN) return null;
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || data.type !== 'hamdi-ai:booking' || !SERVICES.has(data.service)
    || !['ar', 'tr'].includes(data.language)
    || Object.keys(data).some(key => !['type', 'service', 'language'].includes(key))) return null;
  return { service: data.service, language: data.language };
}

if (typeof document !== 'undefined') {
  const dialog = document.querySelector('#hamdi-ai-dialog');
  const frame = document.querySelector('#hamdi-ai-frame');
  const close = document.querySelector('#hamdi-ai-close');
  const subtitle = document.querySelector('#hamdi-ai-subtitle');
  const bookingSelect = document.querySelector('#booking-service');
  const directBooking = document.querySelector('#direct-booking');
  const directFrame = document.querySelector('#direct-booking-frame');
  const directClose = document.querySelector('#direct-booking-close');
  const directFallback = document.querySelector('#direct-booking-fallback');
  const openingAudio = document.querySelector('#direct-booking-audio');
  let gmailForm = false;
  let directTrigger;
  const language = () => document.documentElement.lang === 'tr' ? 'tr' : 'ar';
  const labels = () => {
    const tr = language() === 'tr';
    subtitle.textContent = tr ? 'Stüdyonun sesli asistanı' : 'مساعد الاستوديو الصوتي';
    close.setAttribute('aria-label', tr ? 'Kapat' : 'إغلاق');
    frame.title = tr ? 'Hamdi AI sesli asistanı' : 'مساعد حمدي AI الصوتي';
  };
  const closeAssistant = () => {
    if (dialog.open) dialog.close();
    frame.src = 'about:blank';
    document.documentElement.classList.remove('hamdi-assistant-open');
  };
  const openBooking = (service = '', requestedLanguage = language()) => {
    closeAssistant();
    gmailForm = true;
    if (requestedLanguage !== language()) document.querySelector(`[data-lang="${requestedLanguage}"]`)?.click();
    if (service) bookingSelect.value = service;
    document.querySelector('#booking').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    (service ? document.querySelector('#booking-name') : bookingSelect).focus({ preventScroll: true });
  };
  const assistantUrl = () => {
    const source = new URL('/hamdi-ai/', VOICE_ORIGIN);
    source.searchParams.set('embed', '1');
    source.searchParams.set('lang', language());
    source.searchParams.set('parentOrigin', location.origin);
    return source;
  };
  const openAssistant = () => {
    stopOpeningAudio();
    labels();
    frame.src = assistantUrl().href;
    dialog.showModal();
    document.documentElement.classList.add('hamdi-assistant-open');
  };
  const stopOpeningAudio = () => {
    if (!openingAudio.hasAttribute('src')) return;
    openingAudio.pause();
    openingAudio.removeAttribute('src');
    openingAudio.load();
  };
  const playOpeningQuestion = () => {
    stopOpeningAudio();
    const source = new URL(`/api/order/prompt/aoede-v1/${language()}/name.wav`, VOICE_ORIGIN);
    openingAudio.src = source.href;
    openingAudio.play().catch(() => {});
  };
  const closeDirectBooking = () => {
    stopOpeningAudio();
    directBooking.hidden = true;
    directFrame.src = 'about:blank';
    if (directTrigger?.matches('[data-service]')) directTrigger.setAttribute('aria-expanded', 'false');
  };
  const openDirectBooking = (service, trigger) => {
    gmailForm = false;
    const tr = language() === 'tr';
    if (directTrigger?.matches('[data-service]')) directTrigger.setAttribute('aria-expanded', 'false');
    directTrigger = trigger;
    if (trigger.matches('[data-service]')) trigger.setAttribute('aria-expanded', 'true');
    directClose.textContent = tr ? 'Talebi kapat' : 'إغلاق الطلب';
    directFallback.textContent = tr ? 'Gmail formuyla devam et' : 'تابع عبر نموذج Gmail';
    directFrame.title = tr ? 'Çekim talebi' : 'طلب جلسة';
    directFallback.hidden = true;
    directFrame.hidden = false;
    const source = assistantUrl();
    source.searchParams.set('bookingService', service);
    source.searchParams.set('presentation', 'inline');
    directFrame.height = 340;
    (trigger.closest('label') || trigger).after(directBooking);
    directFrame.src = source.href;
    directBooking.hidden = false;
    playOpeningQuestion();
  };
  document.querySelectorAll('[data-open-hamdi-ai]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    openAssistant();
  }));
  document.querySelectorAll('[data-service]').forEach(button => {
    button.setAttribute('aria-controls', 'direct-booking');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', event => {
      const service = button.dataset.service;
      if (!service || !SERVICES.has(service)) return;
      event.preventDefault();
      openDirectBooking(service, button);
    }, { capture: true });
  });
  bookingSelect.addEventListener('change', () => {
    const service = bookingSelect.value;
    if (gmailForm || !service || !SERVICES.has(service)) return;
    openDirectBooking(service, bookingSelect);
    bookingSelect.value = '';
  });
  document.querySelectorAll('a[href="#booking"]').forEach(link => link.addEventListener('click', () => {
    if (!gmailForm) return;
    gmailForm = false;
    bookingSelect.value = '';
  }));
  close.addEventListener('click', closeAssistant);
  directClose.addEventListener('click', () => {
    closeDirectBooking();
    directTrigger?.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    if (!directBooking.hidden) closeDirectBooking();
  }));
  dialog.addEventListener('close', closeAssistant);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeAssistant();
  });
  window.addEventListener('message', event => {
    if (!directBooking.hidden && event.source === directFrame.contentWindow && event.origin === VOICE_ORIGIN) {
      const data = event.data;
      if (data?.type === 'hamdi-ai:stop-opening-audio' && Object.keys(data).length === 1) {
        stopOpeningAudio();
        return;
      }
      if (data?.type === 'hamdi-ai:order-height' && Number.isInteger(data.height) && data.height > 0) {
        directFrame.height = Math.min(data.height, 1600);
      }
      const request = readBookingRequest(event, directFrame.contentWindow);
      if (request) {
        stopOpeningAudio();
        directFrame.hidden = true;
        directFallback.hidden = false;
        directFallback.onclick = () => {
          closeDirectBooking();
          openBooking(request.service, request.language);
        };
      }
      return;
    }
    const request = readBookingRequest(event, frame.contentWindow);
    if (!request || !dialog.open) return;
    closeAssistant();
    if (request.language !== language()) document.querySelector(`[data-lang="${request.language}"]`)?.click();
    const serviceButton = request.service && document.querySelector(`button[data-service="${request.service}"]`);
    if (serviceButton) {
      openDirectBooking(request.service, serviceButton);
      serviceButton.focus({ preventScroll: true });
      serviceButton.scrollIntoView({ block: 'nearest' });
    } else {
      document.querySelector('#services').scrollIntoView({ block: 'start' });
    }
  });
  window.addEventListener('pagehide', () => {
    stopOpeningAudio();
    closeAssistant();
  });
  labels();
}
