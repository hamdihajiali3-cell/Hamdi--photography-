(() => {
  const intro = document.getElementById('hamdi-entry');
  if (!intro) return;

  const label = document.getElementById('hamdi-entry-label');
  const number = document.getElementById('hamdi-entry-number');
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const workerOrigin = 'https://hamdi--photography.hamdihajiali3.workers.dev';
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

  function playGreeting(language) {
    const player = new Audio(workerOrigin + '/api/order/prompt/aoede-v1/' + language + '/welcome.wav');
    player.onplaying = () => {
      if (greeting === player) greetingStarted = true;
    };
    player.onended = stopGreeting;
    player.onerror = stopGreeting;
    greeting = player;
    void player.play().catch(stopGreeting);
  }

  function startCountdown() {
    const end = performance.now() + 3000;
    function tick() {
      const remaining = end - performance.now();
      if (remaining <= 0) {
        revealSite(true);
        return;
      }
      const seconds = Math.ceil(remaining / 1000);
      number.textContent = String(seconds);
      timeout = setTimeout(tick, remaining - (seconds - 1) * 1000);
    }
    tick();
  }

  const turkish = document.documentElement.lang === 'tr';
  if (turkish) label.textContent = 'Site açılıyor';
  intro.addEventListener('cancel', () => revealSite());
  window.addEventListener('pagehide', () => revealSite(), { once: true });

  const homeEntry = !location.hash || location.hash === '#top';
  if (homeEntry && typeof intro.showModal === 'function') {
    intro.showModal();
    startCountdown();
    playGreeting(turkish ? 'tr' : 'ar');
    void playChime();
  }
})();
