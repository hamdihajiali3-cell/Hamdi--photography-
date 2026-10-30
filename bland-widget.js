(() => {
  "use strict";
  // Replace with the public Widget ID from Bland Dashboard.
  // Never put a private Bland API key in this public GitHub Pages file.
  const WIDGET_ID = "ADD_BLAND_WIDGET_ID";
  if (!WIDGET_ID || WIDGET_ID === "ADD_BLAND_WIDGET_ID") return;

  window.blandSettings = {
    widget_id: WIDGET_ID,
    default_chat: false,
    request_data: {
      business_name: "Hamdi Photography",
      business_location: "Gaziantep, Türkiye",
      supported_languages: ["Arabic", "Turkish"],
      services: [
        "Portrait and family photography",
        "Graduation photography",
        "Product and commercial photography",
        "Events",
        "Engagement and wedding photography",
        "Photo color correction"
      ],
      booking_url: window.location.origin + window.location.pathname + "#contact",
      website_language: (document.documentElement.lang || "ar").slice(0, 2)
    }
  };

  const loader = document.createElement("script");
  loader.src = "https://widget.bland.ai/loader.js";
  loader.defer = true;
  loader.onload = () => {
    const fallback = document.getElementById("assistantWidget");
    if (fallback) fallback.hidden = true;
  };
  loader.onerror = () => {
    console.error("Bland AI widget could not load; keeping the existing Hamdi assistant visible.");
  };
  document.head.appendChild(loader);
})();
