# Documentation (`doc/`)

All project documentation lives under **`doc/`** (lowercase). The old top-level **`Docs/`** folder was removed to avoid duplicate trees and case confusion on Windows.

## Layout

| Path | Purpose |
|------|---------|
| **[`plan/EDGE_URL_AUTO_REFRESHER_PLAN.md`](plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)** | Product spec, epics, checkboxes, reference-UI scope — **source of truth** for roadmap work. |
| **[`requirements/`](requirements/)** | Fine-grained requirements (`product.md`, `ui-ux.md`, …) when you add them; skills point here when present. |
| **[`ui-reference/`](ui-reference/)** | Third-party UI inspiration screenshots (not our branding); see README there. |
| **[`handoff/`](handoff/)** | Operational / historical notes (e.g. UNC → local move). |

## History

**AgenticTemplate** conventions used **`doc/requirements/`** early on. The main Edge extension plan and UI references lived separately under **`Docs/`**. Everything is now consolidated here under **`doc/`** with subfolders by role (`plan`, `requirements`, `ui-reference`, `handoff`).
