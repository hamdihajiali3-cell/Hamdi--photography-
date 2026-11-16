(() => {
  const intro = document.getElementById('hamdi-entry');
  if (!intro) return;

  const skip = document.getElementById('hamdi-entry-skip');
  const sound = document.getElementById('hamdi-entry-sound');
  const label = document.getElementById('hamdi-entry-label');
  const number = document.getElementById('hamdi-entry-number');
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const workerOrigin = 'https://hamdi--photography.hamdihajiali3.workers.dev';
  const pagesOrigin = 'https://hamdihajiali3-cell.github.io';
  const isPublicSite = location.origin === workerOrigin || location.origin === pagesOrigin;
  let timeout;
  let audio;

  function revealSite() {
    clearTimeout(timeout);
    if (intro.open) intro.close();
  }

  async function playChime() {
    try {
      audio ??= new AudioContext();
      if (audio.state !== 'running') await audio.resume();
      const start = audio.currentTime;
      for (const [frequency, delay] of [[523.25, 0], [783.99, .105]]) {
        const note = audio.createOscillator();
        const volume = audio.createGain();
        const at = start + delay;
        note.frequency.value = frequency;
        volume.gain.setValueAtTime(.001, at);
        volume.gain.exponentialRampToValueAtTime(.055, at + .035);
        volume.gain.exponentialRampToValueAtTime(.001, at + .28);
        note.connect(volume).connect(audio.destination);
        note.start(at);
        note.stop(at + .3);
      }
    } catch {
      sound.disabled = true;
    }
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
    skip.textContent = 'Atla';
    sound.textContent = 'Sayaç sesi';
  }
  sound.disabled = !AudioContext;
  skip.addEventListener('click', revealSite);
  sound.addEventListener('click', playChime);
  intro.addEventListener('cancel', revealSite);
  window.addEventListener('pagehide', revealSite, { once: true });

  const homeEntry = !location.hash || location.hash === '#top';
  if (homeEntry && typeof intro.showModal === 'function') {
    timeout = setTimeout(revealSite, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1700 : 3500);
    intro.showModal();
  }
  if (isPublicSite) void countVisit();
})();
