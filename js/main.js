import("./immersive-gallery.js").catch(() => {
  const fallback = document.querySelector(".gallery-fallback");
  if (fallback) fallback.hidden = false;
});
import { initLanguage } from "./language.js";
import { initServiceLinks } from "./service-links.js";
import { initContactForm } from "./contact-form.js";

document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  initServiceLinks();
  initContactForm();
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
});
