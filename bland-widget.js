(() => {
  "use strict";

  // The widget ID is public and is generated in Bland Dashboard > Dispatch > Web Chat Widget.
  // Paste that ID here after creating and configuring the Hamdi AI widget.
  const WIDGET_ID = "";

  if (!WIDGET_ID || WIDGET_ID === "PASTE_BLAND_WIDGET_ID_HERE") return;

  window.blandSettings = {
    widget_id: WIDGET_ID,
    default_chat: false,
    persist_open: true,
    request_data: {
      business_name: "Hamdi Photography",
      business_location: "Gaziantep, Türkiye",
      supported_languages: ["Arabic", "Turkish"],
      service_types: [
        "Portrait and family photography",
        "Graduation photography",
        "Product and commercial photography",
        "Events",
        "Engagement and wedding photography",
        "Photo color correction"
      ],
      booking_page: window.location.origin + window.location.pathname + "#contact",
      website_language: (document.documentElement.lang || "ar").slice(0, 2)
    }
  };

  const loader = document.createElement("script");
  loader.src = "https://widget.bland.ai/loader.js";
  loader.async = true;
  loader.onload = () => {
    // Keep the existing local FAQ assistant as a fallback until Bland loads successfully.
    const fallback = document.getElementById("assistantWidget");
    if (fallback) fallback.hidden = true;
  };
  loader.onerror = () => {
    console.error("Hamdi AI: Bland widget failed to load; local assistant remains available.");
  };
  document.head.appendChild(loader);
})();
