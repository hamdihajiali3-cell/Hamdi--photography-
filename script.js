// Explicit language navigation: Arabic and Turkish are separate HTML pages.
// Keep normal links as a fallback when JavaScript is unavailable.
const languageLinks = [...document.querySelectorAll('.lang a[data-lang]')];
const selectedLanguage = () => document.documentElement.lang.slice(0, 2);

function updateLanguageLinks() {
  const current = new URL(window.location.href);
  current.searchParams.delete('bookingService');
  for (const link of languageLinks) {
    const target = new URL(link.getAttribute('data-language-path') || link.getAttribute('href'), document.baseURI);
    target.search = current.search;
    target.hash = current.hash;
    link.href = target.href;
    if (link.dataset.lang === selectedLanguage()) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

for (const link of languageLinks) {
  // Remember the original path, even after the search/hash is synchronized.
  link.setAttribute('data-language-path', link.getAttribute('href'));
}
updateLanguageLinks();
window.addEventListener('hashchange', updateLanguageLinks);
window.addEventListener('popstate', updateLanguageLinks);

for (const link of languageLinks) {
  link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    updateLanguageLinks();
    event.preventDefault();
    if (link.dataset.lang === selectedLanguage()) return;

    // The selected locale has its own translated page. Navigate explicitly
    // rather than relying on the browser's default anchor action.
    try { sessionStorage.setItem('hamdi-language-nav', '1'); } catch {}
    window.location.assign(link.href);
  });
}
