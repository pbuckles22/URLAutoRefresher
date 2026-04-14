# DEV_GUIDE — URL Auto Refresher

## Tech stack

**Target:** Chromium **Manifest V3** extension for **Microsoft Edge** (service worker background, action popup/options as planned). Implementation language TBD — commonly **TypeScript** with npm tooling; document the chosen stack here once the scaffold exists.

## Architecture

- **Product plan:** [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../../doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)
- **Layout:** `manifest.json` at repo root; `src/background/` (`index.ts`, `scheduler.ts`, `page-overlay-handler.ts`); `src/content/page-overlay.ts` (in-page countdown overlay); `src/lib/` shared logic; `dashboard/` and `sidepanel/` UI; `dist/` holds built `background.js` and `page-overlay.js` (gitignored).

## Conventions

- Prefer pure functions for business logic where possible (timer math, URL normalization, group sync rules).
- See AGENT_HANDOFF.md for run/test commands and source of truth.
