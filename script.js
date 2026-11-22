const languageLinks = document.querySelectorAll("[data-lang]");
function updateLanguageLinks() {
  const current = new URL(location.href);
  current.searchParams.delete("bookingService");
  for (const link of languageLinks) {
    const target = new URL(link.href);
    target.search = current.search;
    target.hash = current.hash;
    link.href = target.href;
  }
}
updateLanguageLinks();
window.addEventListener("hashchange", updateLanguageLinks);
for (const link of languageLinks) {
  link.addEventListener("click", event => {
    updateLanguageLinks();
    // Clicking the already selected language should not reload the page.
    if (link.dataset.lang === document.documentElement.lang) {
      event.preventDefault();
      return;
    }
    // Skip the cinematic welcome after an explicit language switch, so the
    // translated page appears immediately rather than behind a 3–4s overlay.
    if (event.defaultPrevented || event.button !== 0
      || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    try { sessionStorage.setItem("hamdi-language-nav", "1"); } catch {}
  });
}
