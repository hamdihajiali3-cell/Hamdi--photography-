(() => {
  const toggle = document.querySelector('.topbar .menu-toggle');
  const nav = document.querySelector('.topbar .nav');
  if (!toggle || !nav) return;

  const labels = {
    ar: { open: 'فتح القائمة', close: 'إغلاق القائمة' },
    tr: { open: 'Menüyü aç', close: 'Menüyü kapat' },
    en: { open: 'Open menu', close: 'Close menu' }
  };
  const language = () => {
    const current = document.documentElement.lang.slice(0, 2);
    return labels[current] ? current : 'ar';
  };
  const updateLabel = () => {
    toggle.setAttribute('aria-label', labels[language()][toggle.getAttribute('aria-expanded') === 'true' ? 'close' : 'open']);
  };

  if (!nav.id) nav.id = 'siteNavigation';
  toggle.id = toggle.id || 'mobileMenuToggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="menu-toggle-lines" aria-hidden="true"><span></span><span></span><span></span></span>';

  const setOpen = (open, restoreFocus = false) => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    updateLabel();
    if (open) nav.querySelector('a')?.focus({ preventScroll: true });
    else if (restoreFocus) toggle.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false, true);
  });
  document.addEventListener('click', (event) => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  });
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 851px)').matches && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
    }
  });
  new MutationObserver(updateLabel).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });
  updateLabel();
})();