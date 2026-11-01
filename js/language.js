import { translations } from "./translations.js";

export function setLanguage(lang) {
  const copy = translations[lang];
  if (!copy) return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = copy.pageTitle;

  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = copy.pageDescription;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (copy[key] !== undefined) element.innerHTML = copy[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    if (copy[key] !== undefined) element.placeholder = copy[key];
  });
  document.querySelectorAll("[data-i18n-value]").forEach((element) => {
    const key = element.getAttribute("data-i18n-value");
    if (copy[key] !== undefined) element.value = copy[key];
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.getAttribute("data-i18n-aria-label");
    if (copy[key] !== undefined) element.setAttribute("aria-label", copy[key]);
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === lang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  try { localStorage.setItem("hamdiLanguage", lang); } catch {}
  window.dispatchEvent(new CustomEvent("hamdi:languagechange", { detail: { lang } }));
}

window.setLanguage = setLanguage;

export function initLanguage() {
  let initial = translations[document.documentElement.lang] ? document.documentElement.lang : "ar";
  try {
    const saved = localStorage.getItem("hamdiLanguage");
    if (translations[saved]) initial = saved;
  } catch {}
  setLanguage(initial);
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  });
}
