# Hamdi Photography — project structure

The site remains a static HTML/CSS/JavaScript project hosted on GitHub Pages. No framework or build step is required.

## Structure

- `index.html`: semantic page structure and content.
- `css/base.css`: design tokens, reset, header and navigation.
- `css/components.css`: reusable controls and interface elements.
- `css/sections.css`: hero, services, process, about and contact sections.
- `css/responsive.css`: breakpoints and reduced-motion rules.
- `js/main.js`: application entry point.
- `js/translations.js`: Arabic, Turkish and English copy.
- `js/language.js`: language switching and persistence.
- `js/service-links.js`: service-to-request-form selection.
- `js/contact-form.js`: WhatsApp, SMS and email request handoff.
- `mobile-menu.js` / `mobile-menu.css`: accessible mobile navigation.
- `assets/`: reserved for real, optimized portfolio images and brand assets.

## Principles

- Keep real client work separate from decorative assets; never present stock or generated images as client work.
- Keep contact requests user-reviewed before sending; the site does not claim a booking is confirmed.
- Prefer semantic HTML, keyboard access, responsive layouts and reduced-motion support.
- Keep JavaScript focused and split by responsibility; avoid adding a framework without a real need.
