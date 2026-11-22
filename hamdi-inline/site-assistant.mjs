import { OpeningChime } from './opening-chime.mjs?v=glass-20261118';

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

export function readLanguageRequest(event, expectedWindow) {
  if (!expectedWindow || event.source !== expectedWindow || event.origin !== VOICE_ORIGIN) return null;
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || data.type !== 'hamdi-ai:language' || !['ar', 'tr'].includes(data.language)
    || Object.keys(data).some(key => !['type', 'language'].includes(key))) return null;
  return data.language;
}

if (typeof document !== 'undefined') {
  const dialog = document.querySelector('#hamdi-ai-dialog');
  const frame = document.querySelector('#hamdi-ai-frame');
  const close = document.querySelector('#hamdi-ai-close');
  const subtitle = document.querySelector('#hamdi-ai-subtitle');
  const directBooking = document.querySelector('#direct-booking');
  const directFrame = document.querySelector('#direct-booking-frame');
  const directClose = document.querySelector('#direct-booking-close');
  const directFallback = document.querySelector('#direct-booking-fallback');
  const bookingError = document.querySelector('#direct-booking-error');
  const bookingContact = document.querySelector('#direct-booking-contact');
  const bookingStatus = document.querySelector('#direct-booking-status');
  const openingAudio = document.querySelector('#direct-booking-audio');
  const bookingLoading = document.querySelector('#direct-booking-loading');
  const openingChime = new OpeningChime();
  let prewarming = false;
  let directTrigger;
  let bookingLoadTimer;
  const isModalOpen = modal => modal.hasAttribute('open');
  const syncModalViewport = () => {
    const viewport = window.visualViewport;
    if (!isModalOpen(dialog) && !isModalOpen(directBooking)) return;
    const height = viewport?.height || window.innerHeight;
    if (!Number.isFinite(height) || height <= 0) return;
    const style = document.documentElement.style;
    style.setProperty('--modal-viewport-height', `${height}px`);
    style.setProperty('--modal-viewport-top', `${Math.max(0, viewport?.offsetTop || 0)}px`);
  };
  const showModal = (modal, closeButton, scrollLock) => {
    if (!isModalOpen(modal)) {
      if (typeof modal.showModal === 'function') modal.showModal();
      else {
        modal.classList.add('mobile-dialog-fallback');
        modal.setAttribute('open','');
        closeButton.focus({ preventScroll: true });
      }
    }
    document.documentElement.classList.add(scrollLock);
    syncModalViewport();
  };
  const revealFrame = (modal, content) => {
    // Show an already-ready frame immediately, without waiting two paint cycles.
    content.hidden = false;
    if (isModalOpen(modal)) modal.removeAttribute('data-loading');
  };
  const closeModal = (modal, scrollLock) => {
    if (isModalOpen(modal)) {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    }
    document.documentElement.classList.remove(scrollLock);
  };
  const language = () => document.documentElement.lang === 'tr' ? 'tr' : 'ar';
  const localePage = (locale, fragment) => {
    const link = document.querySelector(`[data-lang="${locale}"]`);
    const address = new URL(link.href);
    address.hash = fragment;
    return address;
  };
  const labels = () => {
    const tr = language() === 'tr';
    subtitle.textContent = tr ? 'Stüdyonun sesli asistanı' : 'مساعدة الاستوديو الصوتية';
    close.setAttribute('aria-label', tr ? 'Kapat' : 'إغلاق');
    frame.title = tr ? 'Nur sesli asistanı' : 'نور، المساعدة الصوتية';
  };
  const closeAssistant = () => {
    openingChime.stop();
    frame.hidden = true;
    closeModal(dialog, 'hamdi-assistant-open');
    frame.src = 'about:blank';
  };
  const dismissAssistant = () => {
    closeAssistant();
    if (location.hash === '#hamdi-ai-dialog') {
      const address = new URL(location.href);
      address.hash = '';
      history.replaceState(history.state, '', address);
    }
  };
  const assistantUrl = (booking = false) => {
    const source = new URL(booking ? '/hamdi-ai/booking' : '/hamdi-ai/assistant', VOICE_ORIGIN);
    source.searchParams.set('embed', '1');
    source.searchParams.set('lang', language());
    source.searchParams.set('parentOrigin', location.origin);
    source.searchParams.set('languageNavigation', 'parent');
    source.searchParams.set('build', 'hamdi-all-four-20261122');
    return source;
  };
  const openAssistant = ({ withChime = false, autoStart = false } = {}) => {
    stopOpeningAudio();
    labels();
    frame.hidden = true;
    dialog.setAttribute('data-loading', '');
    const address = assistantUrl();
    if (autoStart) address.searchParams.set('autoStart', '1');
    frame.src = address.href;
    showModal(dialog, close, 'hamdi-assistant-open');
    if (withChime) void openingChime.play();
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
  const finishBookingLoad = () => {
    clearTimeout(bookingLoadTimer);
    directBooking.removeAttribute('aria-busy');
    bookingStatus.hidden = true;
    bookingLoading.hidden = true;
  };
  const showBookingFallback = () => {
    finishBookingLoad();
    stopOpeningAudio();
    directFrame.hidden = true;
    directFallback.hidden = false;
    bookingError.hidden = false;
    bookingContact.hidden = false;
  };
  const closeDirectBooking = ({ restoreFocus = true } = {}) => {
    if (!isModalOpen(directBooking)) return;
    finishBookingLoad();
    stopOpeningAudio();
    closeModal(directBooking, 'hamdi-booking-open');
    directFrame.src = 'about:blank';
    if (directTrigger?.matches('[data-service]')) directTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) directTrigger?.focus({ preventScroll: true });
    directTrigger = null;
  };
  const openDirectBooking = (service, trigger) => {
    openingChime.stop();
    prewarming = false;
    const locale = language();
    const tr = locale === 'tr';
    if (directTrigger?.matches('[data-service]')) directTrigger.setAttribute('aria-expanded', 'false');
    directTrigger = trigger;
    if (trigger.matches('[data-service]')) trigger.setAttribute('aria-expanded', 'true');
    directClose.textContent = tr ? 'Talebi kapat' : 'إغلاق الطلب';
    directFallback.textContent = tr ? 'Tekrar dene' : 'إعادة المحاولة';
    directFrame.title = tr ? 'Çekim talebi' : 'طلب جلسة';
    directBooking.setAttribute('aria-label', directFrame.title);
    directFallback.hidden = true;
    bookingError.hidden = true;
    bookingContact.hidden = true;
    directFallback.onclick = () => {
      closeDirectBooking({ restoreFocus: false });
      openDirectBooking(service, trigger);
    };
    directFrame.hidden = true;
    bookingLoading.hidden = false;
    directBooking.setAttribute('data-loading', '');
    directBooking.setAttribute('aria-busy', 'true');
    bookingStatus.textContent = tr ? 'Talep formu yükleniyor…' : 'عم نحمّل طلب الحجز…';
    bookingStatus.hidden = false;
    const source = assistantUrl(true);
    source.searchParams.set('bookingService', service);
    source.searchParams.set('presentation', 'inline');
    directFrame.height = 340;
    // Open the visible shell synchronously on the click; loading the remote form
    // proceeds asynchronously and is not a fixed 100 ms network guarantee.
    showModal(directBooking, directClose, 'hamdi-booking-open');
    directBooking.scrollTop = 0;
    directFrame.src = source.href;
    clearTimeout(bookingLoadTimer);
    // Slower mobile connections should not be marked as failed too early.
    bookingLoadTimer = setTimeout(showBookingFallback, 16000);
    // Keep playback tied to the original trusted service-card tap:
    // Safari/iOS may block audio played later from requestAnimationFrame.
    playOpeningQuestion();
  };
  document.querySelectorAll('[data-open-hamdi-ai]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    openAssistant({ withChime: true, autoStart: true });
  }));
  document.querySelectorAll('[data-service]').forEach(button => {
    button.setAttribute('aria-controls', 'direct-booking');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', event => {
      const service = button.dataset.service;
      if (!service || !SERVICES.has(service)) return;
      event.preventDefault();
      openDirectBooking(service, button);
    }, { capture: true });
  });
  // On narrow touchscreens, tapping any non-interactive part of a service card
  // should activate the same booking link exactly once. Links still work normally.
  document.querySelectorAll('.card').forEach(card => {
    const serviceLink = card.querySelector('a[data-service]');
    if (!serviceLink) return;
    card.addEventListener('click', event => {
      if (event.defaultPrevented || event.target.closest('a,button,input,select,textarea,[role="button"]')) return;
      serviceLink.click();
    });
  });
  close.addEventListener('click', dismissAssistant);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    dismissAssistant();
  });
  directClose.addEventListener('click', () => {
    closeDirectBooking();
  });
  directBooking.addEventListener('cancel', event => {
    event.preventDefault();
    closeDirectBooking();
  });
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    closeDirectBooking({ restoreFocus: false });
  }));
  dialog.addEventListener('close', closeAssistant);
  const closeOnBackdrop = (modal, dismiss) => modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    // Nur's transparent full-screen dialog has no visible frame: a tap on
    // its empty surface must close it, even within the modal's dimensions.
    if (modal === dialog) { dismiss(); return; }
    const box = modal.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dismiss();
  });
  closeOnBackdrop(dialog, dismissAssistant);
  closeOnBackdrop(directBooking, closeDirectBooking);
  window.addEventListener('message', event => {
    if (prewarming && !isModalOpen(directBooking) && event.source === directFrame.contentWindow && event.origin === VOICE_ORIGIN
      && event.data?.type === 'hamdi-ai:booking-warm' && Object.keys(event.data).length === 1) {
      prewarming = false;
      directFrame.src = 'about:blank';
      return;
    }
    if (isModalOpen(directBooking) && event.source === directFrame.contentWindow && event.origin === VOICE_ORIGIN) {
      const data = event.data;
      if (data?.type === 'hamdi-ai:booking-ready' && Object.keys(data).length === 1) {
        finishBookingLoad();
        revealFrame(directBooking, directFrame);
        directFallback.hidden = true;
        bookingError.hidden = true;
        bookingContact.hidden = true;
        return;
      }
      if (data?.type === 'hamdi-ai:close-booking' && Object.keys(data).length === 1) {
        closeDirectBooking();
        return;
      }
      if (data?.type === 'hamdi-ai:stop-opening-audio' && Object.keys(data).length === 1) {
        stopOpeningAudio();
        return;
      }
      if (data?.type === 'hamdi-ai:order-height' && Number.isInteger(data.height) && data.height > 0) {
        directFrame.height = Math.min(data.height, 1600);
        finishBookingLoad();
      }
      const request = readBookingRequest(event, directFrame.contentWindow);
      if (request) {
        showBookingFallback();
      }
      return;
    }
    if (!isModalOpen(dialog)) return;
    if (event.source === frame.contentWindow && event.origin === VOICE_ORIGIN
      && event.data?.type === 'hamdi-ai:close-assistant' && Object.keys(event.data).length === 1) {
      dismissAssistant();
      return;
    }
    if (event.source === frame.contentWindow && event.origin === VOICE_ORIGIN
      && event.data?.type === 'hamdi-ai:assistant-ready' && Object.keys(event.data).length === 1) {
      revealFrame(dialog, frame);
      return;
    }
    const requestedLocale = readLanguageRequest(event, frame.contentWindow);
    if (requestedLocale && requestedLocale !== language()) {
      try { sessionStorage.setItem('hamdi-voice-language-open', String(Date.now())); } catch {}
      location.assign(localePage(requestedLocale, '#hamdi-ai-dialog').href);
      return;
    }
    const request = readBookingRequest(event, frame.contentWindow);
    if (!request) return;
    if (request.language !== language()) {
      const address = localePage(request.language, '#services');
      if (request.service) address.searchParams.set('bookingService', request.service);
      location.assign(address.href);
      return;
    }
    dismissAssistant();
    const serviceButton = request.service && document.querySelector(`[data-service="${request.service}"]`);
    if (serviceButton) {
      openDirectBooking(request.service, serviceButton);
    } else {
      document.querySelector('#services').scrollIntoView({ block: 'start' });
    }
  });
  window.addEventListener('pagehide', () => {
    closeDirectBooking({ restoreFocus: false });
    closeAssistant();
  });
  window.visualViewport?.addEventListener('resize', syncModalViewport);
  window.addEventListener('resize', syncModalViewport);
  document.addEventListener('visibilitychange', () => { if (document.hidden) openingChime.stop(); });
  window.visualViewport?.addEventListener('scroll', syncModalViewport);
  labels();

  const warmBooking = () => {
    if (document.hidden || isModalOpen(directBooking) || isModalOpen(dialog)) return;
    prewarming = true;
    const source = assistantUrl(true);
    source.searchParams.set('presentation', 'inline');
    source.searchParams.set('prewarm', '1');
    directFrame.hidden = true;
    directFrame.src = source.href;
  };
  if (document.readyState === 'complete') setTimeout(warmBooking, 700);
  else window.addEventListener('load', () => setTimeout(warmBooking, 700), { once: true });

  const address = new URL(location.href);
  const pendingService = address.searchParams.get('bookingService');
  if (pendingService !== null) {
    address.searchParams.delete('bookingService');
    history.replaceState(history.state, '', address);
    if (pendingService && SERVICES.has(pendingService)) {
      const trigger = document.querySelector(`[data-service="${pendingService}"]`);
      if (trigger) openDirectBooking(pendingService, trigger);
    }
  } else if (location.hash === '#hamdi-ai-dialog') {
    let autoStart = false;
    try {
      const pending = Number(sessionStorage.getItem('hamdi-voice-language-open'));
      sessionStorage.removeItem('hamdi-voice-language-open');
      autoStart = pending > 0 && Date.now() >= pending && Date.now() - pending < 15000;
    } catch {}
    openAssistant({ autoStart });
  }
}


