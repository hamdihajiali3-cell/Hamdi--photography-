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
for (const link of languageLinks) link.addEventListener("click", updateLanguageLinks);
