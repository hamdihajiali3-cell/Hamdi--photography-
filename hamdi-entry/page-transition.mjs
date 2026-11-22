// Internal, button-driven navigation between the photography site and the About screen.
// No external links, popups, or JavaScript inline handlers are used.
const returningKey = 'hamdi-about-return-20261122';
let navigating = false;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
document.querySelectorAll('[data-page-transition]').forEach(button => {
  button.addEventListener('click', () => {
    if (navigating) return;
    const relative = button.getAttribute('data-page-transition');
    if (!relative) return;
    const destination = new URL(relative, location.href);
    if (destination.origin !== location.origin || !['http:', 'https:'].includes(destination.protocol)) return;
    navigating = true;
    if (button.hasAttribute('data-return-home')) {
      try { sessionStorage.setItem(returningKey, '1'); } catch {}
    }
    if (reducedMotion) {
      location.assign(destination.href);
      return;
    }
    document.documentElement.classList.add('hamdi-page-leaving');
    window.setTimeout(() => location.assign(destination.href), 220);
  });
});
window.addEventListener('pageshow', () => {
  navigating = false;
  document.documentElement.classList.remove('hamdi-page-leaving');
});
