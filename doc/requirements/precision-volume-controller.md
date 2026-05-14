# Precision volume (Web Audio) — requirements

Finer-grained requirements for **Epic 11** in [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md). Human source PDF: [Precision_Volume_Controller_PRD.pdf](Precision_Volume_Controller_PRD.pdf).

**Sequencing:** Prefer shipping **[Epic 10](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-10--url-first-membership-phased)** (or at least **10.1–10.3**) before deep implementation here—scheduler, overlay, and storage overlap the same code paths.

**Display name vs internals:** User-facing copy may use **Media Control Suite**; existing `urlAutoRefresher_*` storage keys and message prefixes stay until an explicit migration epic—do not rename keys casually.

## Functional requirements

| ID         | Requirement                                                                                                                                                                                                    | Outcome                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **PVC.1**  | **Zero-blast hook:** When the extension attaches to a `<video>` / `<audio>` element, seize `AudioContext` and set master `gain` to **0** until the user intentionally raises volume (no surprise loud spike).  | Safe default on hook.                              |
| **PVC.2**  | **Hybrid precision UI:** Logarithmic slider (fader) where roughly **0–20% audible range uses ~50% of slider travel**; paired **numeric** field accepts decimals (e.g. `5.5%`). Slider and number stay in sync. | Low-end tuning is usable without a mile-long drag. |
| **PVC.3**  | **Shift micro-adjust:** While **Shift** is held, slider steps are **10× finer** for background-level tweaks.                                                                                                   | Fine control without leaving the control.          |
| **PVC.4**  | **Phase inversion:** Numeric input allows **negative** values; UI shows **phase inverted** (or equivalent clear copy), not a validation error.                                                                 | Inverted phase is a supported mode.                |
| **PVC.5**  | **`chrome.commands`:** Global shortcuts for **increase volume**, **decrease volume**, and **panic / mute** (exact key chords TBD; document in manifest + README).                                              | Keyboard control without opening the dashboard.    |
| **PVC.6**  | **Single graph guard:** Each media element may only receive **`createMediaElementSource` once**; guard prevents crash loops if UI or scripts reconnect repeatedly.                                             | No duplicate-source throws.                        |
| **PVC.7**  | **Shortcut OSD:** When shortcuts fire, show a **non-blocking** transient overlay (e.g. top-right) with current level; **fade ~2s** (tunable).                                                                  | User sees feedback when dashboard is closed.       |
| **PVC.8**  | **SPA media churn:** **`MutationObserver`** (or equivalent) discovers new `<video>` / `<audio>` after in-page navigation (e.g. YouTube, Spotify) without full reload.                                          | New players attach automatically.                  |
| **PVC.9**  | **Smooth ramps:** Use **`exponentialRampToValueAtTime`** (or equivalent) for audible gain moves to avoid clicks/pops; document epsilon rules for exponential curves near zero.                                 | No zipper noise on changes.                        |
| **PVC.10** | **CORS awareness:** Document that **`crossOrigin`** / server headers affect `MediaElementSource`; degrade gracefully when hooking fails.                                                                       | Predictable failure vs silent wrong graph.         |

## Product deltas vs sample PRD

- **Surface:** Sample prompts assume a **popup**; this product uses **dashboard + side panel** (choice **C**). Implement volume UX in **shared dashboard/side panel modules** and message to the content script—not a separate popup-only flow unless added later.
- **Composition:** Volume logic must **compose** with the existing page overlay ([`src/content/page-overlay.ts`](../../src/content/page-overlay.ts))—separate shadow host vs shared page world is an implementation choice under Epic 11.
- **Capture:** Prefer **in-page Web Audio** (`GainNode` on `MediaElementSource`); avoid **`tabCapture`** unless requirements explicitly change (different UX/threat model).

## Agent skills

- [.cursor/skills/extension-architect/SKILL.md](../../.cursor/skills/extension-architect/SKILL.md) — layering and permissions.
- [.cursor/skills/chromium-mv3-extension/SKILL.md](../../.cursor/skills/chromium-mv3-extension/SKILL.md) — MV3 messaging and service worker.
- [.cursor/skills/web-audio-dsp/SKILL.md](../../.cursor/skills/web-audio-dsp/SKILL.md) — graph safety and ramps.
