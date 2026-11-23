// Apply a saved AR/TR choice, otherwise follow the visitor's browser languages.
(() => {
  const languageKey = 'hamdi-language-mode';
  let mode = 'auto';
  try {
    const stored = localStorage.getItem(languageKey);
    if (stored === 'ar' || stored === 'tr') mode = stored;
  } catch {
    // Private browsing can disable storage; automatic mode still works.
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  const deviceLanguage = [...preferred]
    .map(locale => String(locale || '').toLowerCase().split('-')[0])
    .find(locale => locale === 'ar' || locale === 'tr') || 'ar';
  const desired = mode === 'auto' ? deviceLanguage : mode;
  const current = document.documentElement.lang.slice(0, 2);
  if (desired === current) return;

  // Keep the same query/hash and support both root hosting and GitHub Pages subpaths.
  const root = new URL(current === 'tr' ? '../' : './', location.href);
  const target = new URL(desired === 'tr' ? 'tr/' : '', root);
  target.search = location.search;
  target.hash = location.hash;
  location.replace(target.href);
})();
