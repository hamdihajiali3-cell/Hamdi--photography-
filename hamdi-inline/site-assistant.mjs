const VOICE_ORIGIN = 'https://hamdi--photography.hamdihajiali3.workers.dev';
const SERVICES = new Set(['', 'color', 'graduation', 'hair', 'id']);

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
  let ordersReady = false;
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
    if (requestedLanguage !== language()) document.querySelector(`[data-lang="${requestedLanguage}"]`)?.click();
    const select = document.querySelector('#booking-service');
    if (service) select.value = service;
    document.querySelector('#booking').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    select.focus({ preventScroll: true });
  };
  document.querySelectorAll('[data-open-hamdi-ai]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    labels();
    const source = new URL('/hamdi-ai/', VOICE_ORIGIN);
    source.searchParams.set('embed', '1');
    source.searchParams.set('lang', language());
    source.searchParams.set('parentOrigin', location.origin);
    frame.src = source.href;
    dialog.showModal();
    document.documentElement.classList.add('hamdi-assistant-open');
  }));
  close.addEventListener('click', closeAssistant);
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
    if (orderWorkflowReady(event, frame.contentWindow)) { ordersReady = true; return; }
    const request = readBookingRequest(event, frame.contentWindow);
    if (request && dialog.open) openBooking(request.service, request.language);
  });
  window.addEventListener('pagehide', closeAssistant);
  labels();
}
