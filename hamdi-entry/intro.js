(() => {
  const intro = document.getElementById('hamdi-entry');
  if (!intro) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const workerOrigin = 'https://hamdi--photography.hamdihajiali3.workers.dev';
  let timeout;
  let audio;
  let chimePlayed = false;
  let greeting;
  let greetingStarted = false;
  let greetingPending = false;
  let greetingAttempt = 0;
  let greetingFinished = false;
  let greetingTimeout;
  let greetingBusy = false;

  function stopEntrySoundsForAction(event) {
    if (!event.isTrusted || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
    if (event.target?.closest?.('[data-open-hamdi-ai], [data-service], #hamdi-ai-dialog, #direct-booking')) {
      stopGreeting();
      releaseAudio();
      return;
    }
    if (greetingPending && !greetingStarted && !greetingFinished) playGreeting();
  }

  function releaseAudio() {
    const context = audio;
    audio = undefined;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  function stopGreeting() {
    greetingFinished = true;
    greetingPending = false;
    greetingBusy = false;
    greetingAttempt++;
    clearTimeout(greetingTimeout);
    document.removeEventListener('click', stopEntrySoundsForAction, true);
    document.removeEventListener('keydown', stopEntrySoundsForAction, true);
    if (!greeting) return;
    const player = greeting;
    greeting = undefined;
    player.pause();
    player.removeAttribute('src');
    player.load();
  }

  function revealSite(finishGreeting = false) {
    clearTimeout(timeout);
    if (intro.open) {
      if (typeof intro.close === 'function') intro.close();
      else intro.removeAttribute('open');
    }
    if (!chimePlayed) releaseAudio();
    // Keep a blocked greeting ready for the first permitted tap after the logo closes.
    if (!finishGreeting) stopGreeting();
  }

  async function playChime() {
    if (!AudioContext || chimePlayed || !intro.open) return;
    try {
      const context = (audio ??= new AudioContext());
      if (context.state !== 'running') await context.resume();
      if (!intro.open || chimePlayed || context.state !== 'running') return;

      chimePlayed = true;
      const start = context.currentTime;
      for (const [frequency, delay] of [[523.25, 0], [783.99, .075]]) {
        const note = context.createOscillator();
        const volume = context.createGain();
        const at = start + delay;
        note.frequency.value = frequency;
        volume.gain.setValueAtTime(.001, at);
        volume.gain.exponentialRampToValueAtTime(.024, at + .025);
        volume.gain.exponentialRampToValueAtTime(.001, at + .2);
        note.connect(volume).connect(context.destination);
        if (delay > 0) note.onended = releaseAudio;
        note.start(at);
        note.stop(at + .22);
      }
    } catch {
      // A browser may require a gesture before allowing audio to start.
    }
  }

  function playGreeting() {
    if (greetingFinished || greetingStarted || greetingBusy || document.hidden) return;
    const player = greeting;
    if (!player) return;
    greetingBusy = true;
    const attempt = ++greetingAttempt;
    try {
      const started = player.play();
      Promise.resolve(started).catch(error => {
        if (greeting !== player || attempt !== greetingAttempt) return;
        greetingBusy = false;
        if (error?.name === 'NotAllowedError') greetingPending = true;
        else stopGreeting();
      });
    } catch (error) {
      greetingBusy = false;
      if (error?.name === 'NotAllowedError') greetingPending = true;
      else stopGreeting();
    }
  }

  function prepareGreeting(language) {
    const player = new Audio(workerOrigin + '/api/order/prompt/aoede-v3/' + language + '/welcome.wav');
    player.preload = 'auto';
    player.setAttribute('playsinline', '');
    player.onplaying = () => {
      if (greeting !== player) return;
      greetingStarted = true;
      greetingPending = false;
      greetingBusy = false;
      clearTimeout(greetingTimeout);
    };
    player.onended = stopGreeting;
    player.onerror = stopGreeting;
    greeting = player;
    document.addEventListener('click', stopEntrySoundsForAction, true);
    document.addEventListener('keydown', stopEntrySoundsForAction, true);
    greetingTimeout = setTimeout(stopGreeting, 30000);
    playGreeting();
  }

  const turkish = document.documentElement.lang === 'tr';
  intro.addEventListener('cancel', () => revealSite());
  window.addEventListener('pagehide', () => revealSite(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { revealSite(); releaseAudio(); }
  });

  const homeEntry = !location.hash || location.hash === '#top';
  const mobileEntry = window.matchMedia?.('(max-width: 760px), (pointer: coarse)').matches === true;
  // Phones commonly restore a section hash on reload. Show the brand entrance
  // there too, but don't block an explicit deep link into Nur or booking.
  const deepLink = location.hash === '#hamdi-ai-dialog'
    || new URLSearchParams(location.search).has('bookingService');
  let changedLanguage = false;
  try {
    changedLanguage = sessionStorage.getItem('hamdi-language-nav') === '1';
    sessionStorage.removeItem('hamdi-language-nav');
  } catch {}
  // A user who chose another language should see translated content right
  // away rather than watching the brand's intro again.
  if ((homeEntry || mobileEntry) && !deepLink && !changedLanguage) {
    try {
      if (typeof intro.showModal === 'function') intro.showModal();
      else intro.setAttribute('open', '');
    } catch {
      // Older embedded mobile browsers may not support modal dialog opening.
      intro.setAttribute('open', '');
    }
    // The visual welcome is automatic. Browsers may defer audio until the
    // first natural tap; the existing document listener handles that gesture.
    timeout = setTimeout(() => revealSite(true), mobileEntry ? 3800 : 3000);
    prepareGreeting(turkish ? 'tr' : 'ar');
    void playChime();
  }
})();
