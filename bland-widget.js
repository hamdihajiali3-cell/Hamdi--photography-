(() => {
  "use strict";

  // Official Bland Web Chat embed configuration for Hamdi Photography.
  // This public widget ID is intended for browser use; never place private API keys here.
  window.blandSettings = {
    widget_id: "617b77cc-7777-4803-bee6-c4babbb74c56"
  };

  // Avoid injecting the Bland loader more than once.
  const loaderSrc = "https://widget.bland.ai/loader.js";
  const alreadyLoaded = document.querySelector('script[src^="' + loaderSrc + '"]');
  if (alreadyLoaded) return;

  const script = document.createElement("script");
  script.src = loaderSrc;
  script.defer = true;
  document.body.appendChild(script);
})();
