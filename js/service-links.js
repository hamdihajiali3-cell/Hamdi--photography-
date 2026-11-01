export function initServiceLinks() {
  const select = document.getElementById("sessionType");
  if (!select) return;
  document.querySelectorAll("[data-select-service]").forEach((link) => {
    link.addEventListener("click", () => {
      const key = link.getAttribute("data-select-service");
      const option = Array.from(select.options).find((item) => item.dataset.i18nValue === key);
      if (!option) return;
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.classList.add("service-prefilled");
    });
  });
  select.addEventListener("change", () => select.classList.remove("service-prefilled"));
}
