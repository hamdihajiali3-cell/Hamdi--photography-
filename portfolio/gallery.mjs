// This gallery is intentionally hidden until authentic, owner-supplied photos exist.
// All paths are local portfolio/photos/...; no stock images or external requests.
const section = document.querySelector('#portfolio');
const gallery = section?.querySelector('[data-portfolio-gallery]');
if (gallery) {
  const language = document.documentElement.lang === 'tr' ? 'tr' : 'ar';
  const imagePattern = /^photos\/[a-z0-9][a-z0-9_-]*\.(?:avif|jpe?g|png|webp)$/i;
  const label = (value) => typeof value === 'string' ? value
    : value && typeof value[language] === 'string' ? value[language] : '';
  try {
    const response = await fetch(new URL('./manifest.json', import.meta.url), { cache: 'no-store' });
    if (!response.ok) throw new Error('portfolio-not-ready');
    const data = await response.json();
    const items = (Array.isArray(data.items) ? data.items : [])
      .filter(item => item && typeof item.src === 'string' && imagePattern.test(item.src) && label(item.alt))
      .slice(0, 18);
    for (const item of items) {
      const figure = document.createElement('figure');
      figure.className = 'portfolio-item';
      const picture = document.createElement('img');
      picture.src = new URL(item.src, import.meta.url).href;
      picture.alt = label(item.alt);
      picture.loading = 'lazy';
      picture.decoding = 'async';
      picture.width = 960;
      picture.height = 1200;
      picture.addEventListener('error', () => {
        figure.remove();
        if (!gallery.childElementCount) section.hidden = true;
      }, { once: true });
      const caption = document.createElement('figcaption');
      const name = document.createElement('strong');
      name.textContent = label(item.title) || picture.alt;
      caption.append(name);
      if (label(item.description)) {
        const detail = document.createElement('span');
        detail.textContent = label(item.description);
        caption.append(detail);
      }
      figure.append(picture, caption);
      gallery.append(figure);
    }
    if (gallery.childElementCount) section.hidden = false;
  } catch {
    // No photos yet: keep this section out of the public interface.
  }
}
