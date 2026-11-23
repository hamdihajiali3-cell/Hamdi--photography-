// Device/browser language is detected before page paint by language-auto.js.
// This file keeps manual AR/TR links usable and remembers explicit choices.
const languageLinks = [...document.querySelectorAll('.lang a[data-lang]')];
const languageModeKey = 'hamdi-language-mode';
const selectedLanguage = () => document.documentElement.lang.slice(0, 2);

function saveManualLanguage(mode) {
  try { localStorage.setItem(languageModeKey, mode); } catch {
    // Manual navigation still works if storage is disabled.
  }
}

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
  link.setAttribute('data-language-path', link.getAttribute('href'));
}
updateLanguageLinks();
window.addEventListener('hashchange', updateLanguageLinks);
window.addEventListener('popstate', updateLanguageLinks);

function markLanguageNavigation() {
  try { sessionStorage.setItem('hamdi-language-nav', '1'); } catch {}
}

for (const link of languageLinks) {
  link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    updateLanguageLinks();
    event.preventDefault();
    saveManualLanguage(link.dataset.lang);
    if (link.dataset.lang === selectedLanguage()) return;

    markLanguageNavigation();
    window.location.assign(link.href);
  });
}

