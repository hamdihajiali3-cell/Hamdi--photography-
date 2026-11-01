/* HAMDI PHOTOGRAPHY — immersive page interactions */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.topbar');
  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const revealTargets = [
    '.section-heading', '.gallery-card', '.manifesto-orb', '.manifesto-copy',
    '.service', '.contact-top', '.contact-section h2', '.contact-description', '.contact-form'
  ];
  document.querySelectorAll(revealTargets.join(',')).forEach((node, index) => {
    node.setAttribute('data-reveal', '');
    if (node.classList.contains('service')) node.style.transitionDelay = (index % 4) * 75 + 'ms';
  });

  if ('IntersectionObserver' in window && !reduce) {
    const observer = new IntersectionObserver((entries, current) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          current.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(node => observer.observe(node));
  } else {
    document.querySelectorAll('[data-reveal]').forEach(node => node.classList.add('is-visible'));
  }

  const visual = document.querySelector('.hero-visual');
  if (visual && !reduce && window.matchMedia('(pointer:fine)').matches) {
    visual.addEventListener('pointermove', event => {
      const bounds = visual.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      visual.style.setProperty('--pointer-x', (x * 12).toFixed(2) + 'px');
      visual.style.setProperty('--pointer-y', (y * 12).toFixed(2) + 'px');
    });
    visual.addEventListener('pointerleave', () => {
      visual.style.setProperty('--pointer-x', '0px');
      visual.style.setProperty('--pointer-y', '0px');
    });
  }

  document.querySelectorAll('.gallery-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (reduce || !window.matchMedia('(pointer:fine)').matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty('--card-x', (x * 5).toFixed(2) + 'px');
      card.style.setProperty('--card-y', (y * 5).toFixed(2) + 'px');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--card-x', '0px');
      card.style.setProperty('--card-y', '0px');
    });
  });
})();
