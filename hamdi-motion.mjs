/* Vanilla motion-enhancement controller. Never needed for booking, voice or navigation. */
const root = document.documentElement;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
if (!reducedMotion) {
  root.classList.add('has-hamdi-motion');
  const intro = document.getElementById('hamdi-entry');
  const revealHero = () => root.classList.add('hamdi-entry-dismissed');
  if (intro?.open) {
    intro.addEventListener('close', revealHero, { once: true });
    // On older browsers the intro script may remove the open attribute manually.
    const introObserver = new MutationObserver(() => {
      if (!intro.hasAttribute('open')) { introObserver.disconnect(); revealHero(); }
    });
    introObserver.observe(intro, { attributes: true, attributeFilter: ['open'] });
  } else {
    revealHero();
  }

  const revealTargets = document.querySelectorAll(
    '.section-copy, .steps > div:first-child, .steps li, .booking-faq-heading, .contact > div:first-child, .contact-links a'
  );
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('motion-revealed');
        observer.unobserve(entry.target);
      }
    }, { threshold: .14, rootMargin: '0px 0px -4% 0px' });
    revealTargets.forEach(element => revealObserver.observe(element));

    const activeObserver = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('motion-active', entry.isIntersecting);
    }, { rootMargin: '120px 0px 120px 0px', threshold: 0 });
    document.querySelectorAll('.studio, .card').forEach(element => activeObserver.observe(element));
  } else {
    revealTargets.forEach(element => element.classList.add('motion-revealed'));
  }

  if (window.matchMedia?.('(hover:hover) and (pointer:fine)').matches) {
    for (const card of document.querySelectorAll('.card')) {
      let frameId = 0;
      let x = 50;
      let y = 34;
      card.addEventListener('pointermove', event => {
        const box = card.getBoundingClientRect();
        if (!box.width || !box.height) return;
        x = Math.max(0, Math.min(100, ((event.clientX - box.left) / box.width) * 100));
        y = Math.max(0, Math.min(100, ((event.clientY - box.top) / box.height) * 100));
        if (frameId) return;
        frameId = requestAnimationFrame(() => {
          frameId = 0;
          card.style.setProperty('--hamdi-spot-x', x.toFixed(1) + '%');
          card.style.setProperty('--hamdi-spot-y', y.toFixed(1) + '%');
        });
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        card.style.removeProperty('--hamdi-spot-x');
        card.style.removeProperty('--hamdi-spot-y');
      }, { passive: true });
    }
  }
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('hamdi-motion-paused', document.hidden);
  });
}
