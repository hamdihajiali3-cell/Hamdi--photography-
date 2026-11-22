# Hamdi UI Lab — optional isolated animation development

This directory is a **development playground only**, not a migration of the public website. The production site remains plain HTML, CSS and JS (including Nur, booking and the bilingual pages). Do not publish this lab as a customer-facing page.

## Setup in GitHub Codespaces or a terminal with Node.js

```bash
cd ui-lab
npm install
npm run dev
```

Vite will display a local preview URL. It includes a lazy-loaded ThreeUI Community example using the official `@designcodeio/threeui` React package.

## Install a free Skiper UI component

Skiper UI is a **shadcn React component registry**, not a single drop-in stylesheet:

```bash
cd ui-lab
npm run add:skiper
```

The command requests the public `@skiper-ui/skiper26` component through shadcn, writing a React component into this lab. It is not installed on the production website. Other free component IDs can be selected at [Skiper UI](https://skiper-ui.com/). Paid/Pro components require your own valid license. **Free Skiper UI use requires attribution** under its stated terms.

## Animmaster Lib

[Animmaster Lib](https://animmasterlib.dev/) supplies component source files to customers through its own download process. It does **not** provide a universal `npm install animmaster-lib` for all its components. Its published FAQ says many components are vanilla HTML/CSS/JS; these can be fitted to the existing public site after the owner supplies the legitimately obtained source ZIP and selects the effect. Nothing from a paid component has been copied or claimed as installed.

## Safety

- This lab is excluded from the Cloudflare Worker static assets by `.assetsignore`.
- No photo or customer data is added.
- The public site, its voice assistant, and booking are unaffected by experimentation in this directory.
- ThreeUI examples can be heavy: prefer selective imports, lazy-load and reduced-motion alternatives.
- `npm install` and `npm run add:skiper` must be run inside Codespaces; this repository commit prepares the setup but does not install `node_modules` remotely.

Sources: https://github.com/MengTo/threeui , https://skiper-ui.com/docs/quick-start , https://animmasterlib.dev/
