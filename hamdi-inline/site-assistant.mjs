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

export function orderWorkflowReady(event, expectedWindow) {
  return Boolean(expectedWindow && event.source === expectedWindow && event.origin === VOICE_ORIGIN
    && event.data && !Array.isArray(event.data) && event.data.type === 'hamdi-ai:order-ready'
    && Object.keys(event.data).length === 1);
}

if (typeof document !== 'undefined') {
  const dialog = document.querySelector('#hamdi-ai-dialog');
  const frame = document.querySelector('#hamdi-ai-frame');
  const close = document.querySelector('#hamdi-ai-close');
  const book = document.querySelector('#hamdi-ai-book');
  const subtitle = document.querySelector('#hamdi-ai-subtitle');
  const bookingSelect = document.querySelector('#booking-service');
  const directBooking = document.querySelector('#direct-booking');
  const directFrame = document.querySelector('#direct-booking-frame');
  const directClose = document.querySelector('#direct-booking-close');
  let ordersReady = false;
  let gmailForm = false;
  let directTrigger;
  const language = () => document.documentElement.lang === 'tr' ? 'tr' : 'ar';
  const labels = () => {
    const tr = language() === 'tr';
    subtitle.textContent = tr ? 'Stüdyonun sesli asistanı' : 'مساعد الاستوديو الصوتي';
    book.textContent = tr ? 'Randevu talebi' : 'طلب موعد';
    close.setAttribute('aria-label', tr ? 'Kapat' : 'إغلاق');
    frame.title = tr ? 'Hamdi AI sesli asistanı' : 'مساعد حمدي AI الصوتي';
  };
  const closeAssistant = () => {
    ordersReady = false;
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
    labels();
    frame.src = assistantUrl().href;
    dialog.showModal();
    document.documentElement.classList.add('hamdi-assistant-open');
  };
  const closeDirectBooking = () => {
    directBooking.hidden = true;
    directFrame.src = 'about:blank';
  };
  const openDirectBooking = (service, trigger) => {
    gmailForm = false;
    const tr = language() === 'tr';
    directTrigger = trigger;
    directClose.textContent = tr ? 'Talebi kapat' : 'إغلاق الطلب';
    directFrame.title = tr ? 'Çekim talebi' : 'طلب جلسة';
    const source = assistantUrl();
    source.searchParams.set('bookingService', service);
    source.searchParams.set('presentation', 'inline');
    directFrame.height = 340;
    directFrame.src = source.href;
    directBooking.hidden = false;
    directBooking.scrollIntoView({ block: 'start' });
    directBooking.focus({ preventScroll: true });
  };
  document.querySelectorAll('[data-open-hamdi-ai]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    openAssistant();
  }));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', event => {
    const service = button.dataset.service;
    if (!service || !SERVICES.has(service)) return;
    event.preventDefault();
    openDirectBooking(service, button);
  }, { capture: true }));
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
    directTrigger?.focus();
  });
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    if (!directBooking.hidden) closeDirectBooking();
  }));
  book.addEventListener('click', () => {
    if (ordersReady) frame.contentWindow.postMessage({ type:'hamdi-ai:start-order' }, VOICE_ORIGIN);
    else openBooking();
  });
  dialog.addEventListener('close', closeAssistant);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeAssistant();
  });
  window.addEventListener('message', event => {
    if (!directBooking.hidden && event.source === directFrame.contentWindow && event.origin === VOICE_ORIGIN) {
      const data = event.data;
      if (data?.type === 'hamdi-ai:order-height' && Number.isInteger(data.height) && data.height > 0) {
        directFrame.height = Math.min(data.height, 1600);
      }
      const request = readBookingRequest(event, directFrame.contentWindow);
      if (request) {
        closeDirectBooking();
        openBooking(request.service, request.language);
      }
      return;
    }
    if (orderWorkflowReady(event, frame.contentWindow)) { ordersReady = true; return; }
    const request = readBookingRequest(event, frame.contentWindow);
    if (request && dialog.open) openBooking(request.service, request.language);
  });
  window.addEventListener('pagehide', closeAssistant);
  labels();
}
