(() => {
  const intro = document.getElementById('hamdi-entry');
  if (!intro) return;

  const sound = document.getElementById('hamdi-entry-sound');
  const label = document.getElementById('hamdi-entry-label');
  const number = document.getElementById('hamdi-entry-number');
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const workerOrigin = 'https://hamdi--photography.hamdihajiali3.workers.dev';
  const pagesOrigin = 'https://hamdihajiali3-cell.github.io';
  const isPublicSite = location.origin === workerOrigin || location.origin === pagesOrigin;
  let timeout;
  let audio;
  let chimePlayed = false;
  let greeting;
  let greetingStarted = false;

  function releaseAudio() {
    const context = audio;
    audio = undefined;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  function stopGreeting() {
    if (!greeting) return;
    const player = greeting;
    greeting = undefined;
    player.pause();
    player.removeAttribute('src');
    player.load();
  }

  function revealSite(finishGreeting = false) {
    clearTimeout(timeout);
    if (intro.open) intro.close();
    if (!chimePlayed) releaseAudio();
    if (!finishGreeting || !greetingStarted) stopGreeting();
  }

  async function playChime() {
    if (!AudioContext || chimePlayed || !intro.open) return;
    try {
      const context = (audio ??= new AudioContext());
      if (context.state !== 'running') await context.resume();
      if (!intro.open || chimePlayed || context.state !== 'running') return;

      chimePlayed = true;
      if (!greeting) sound.disabled = true;
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

  function prepareGreeting(language) {
    const player = new Audio(workerOrigin + '/api/order/prompt/aoede-v1/' + language + '/welcome.wav');
    player.onplaying = () => {
      if (greeting !== player) return;
      greetingStarted = true;
      sound.disabled = true;
    };
    player.onended = stopGreeting;
    player.onerror = () => {
      if (greeting !== player) return;
      stopGreeting();
      sound.disabled = chimePlayed || !AudioContext;
    };
    greeting = player;
    sound.disabled = false;
  }

  function playWelcome() {
    if (!intro.open) return;
    if (greeting && !greetingStarted) void greeting.play().catch(() => {});
    void playChime();
  }

  async function countVisit() {
    try {
      const response = await fetch(workerOrigin + '/api/visits', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'omit'
      });
      if (!response.ok) return;
      const { visits } = await response.json();
      if (!Number.isSafeInteger(visits) || visits < 1) return;
      number.textContent = new Intl.NumberFormat('en-US').format(visits);
      number.dataset.loaded = '';
    } catch {
      // Keep the placeholder if the count is temporarily unavailable.
    }
  }

  const turkish = document.documentElement.lang === 'tr';
  if (turkish) {
    label.textContent = 'Site ziyaretleri';
    sound.textContent = 'Karşılamayı dinle';
  }
  intro.addEventListener('click', playWelcome);
  intro.addEventListener('cancel', () => revealSite());
  window.addEventListener('pagehide', () => revealSite(), { once: true });

  const homeEntry = !location.hash || location.hash === '#top';
  if (homeEntry && typeof intro.showModal === 'function') {
    timeout = setTimeout(() => revealSite(true), matchMedia('(prefers-reduced-motion: reduce)').matches ? 1700 : 3500);
    intro.showModal();
    prepareGreeting(turkish ? 'tr' : 'ar');
    playWelcome();
  }
  if (isPublicSite) void countVisit();
})();
