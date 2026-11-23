// AR and TR are separate localized HTML pages; 'auto' follows browser settings.
// Manual selections persist across visits and take priority over automatic detection.
const languageLinks = [...document.querySelectorAll('.lang a[data-lang]')];
const automaticLanguageButton = document.querySelector('.lang button[data-lang="auto"]');
const languageModeKey = 'hamdi-language-mode';
const selectedLanguage = () => document.documentElement.lang.slice(0, 2);

function getLanguageMode() {
  try {
    const saved = localStorage.getItem(languageModeKey);
    return saved === 'ar' || saved === 'tr' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

function saveLanguageMode(mode) {
  try {
    if (mode === 'auto') localStorage.removeItem(languageModeKey);
    else localStorage.setItem(languageModeKey, mode);
  } catch {
    // Keep language links usable if the browser disallows storage.
  }
}

function preferredBrowserLanguage() {
  const available = navigator.languages?.length ? navigator.languages : [navigator.language];
  return [...available]
    .map(locale => String(locale || '').toLowerCase().split('-')[0])
    .find(locale => locale === 'tr' || locale === 'ar') || 'ar';
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
  automaticLanguageButton?.setAttribute('aria-pressed', String(getLanguageMode() === 'auto'));
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
    saveLanguageMode(link.dataset.lang);
    updateLanguageLinks();
    if (link.dataset.lang === selectedLanguage()) return;

    markLanguageNavigation();
    window.location.assign(link.href);
  });
}

automaticLanguageButton?.addEventListener('click', () => {
  saveLanguageMode('auto');
  updateLanguageLinks();
  const detected = preferredBrowserLanguage();
  if (detected === selectedLanguage()) return;
  const destination = languageLinks.find(link => link.dataset.lang === detected);
  if (!destination) return;
  markLanguageNavigation();
  window.location.assign(destination.href);
});
