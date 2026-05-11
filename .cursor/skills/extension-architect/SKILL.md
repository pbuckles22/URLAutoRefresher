---
name: extension-architect
description: >-
  Shapes extension-wide architecture for this repo: boundaries between background,
  content scripts, and UI surfaces; composition with existing overlays; storage and
  messaging contracts; feature flags and permissions rationale. Use when designing
  a new epic, splitting work across layers, reviewing structural risk, or when the
  user asks for an extension architect, system design for the extension, or how
  features should be layered in MV3.
---

# Extension architect — Project

Use this skill for **design and structure** before or alongside implementation. For **tactical MV3 behavior** (service worker sleep, `sendResponse` + `return true`, context invalidation), read **[chromium-mv3-extension](../chromium-mv3-extension/SKILL.md)** first when touching manifest, background, or content messaging.

---

## Responsibilities

- **Layering:** What lives in the **service worker** vs **content scripts** vs **dashboard / side panel** HTML; avoid duplicating state across layers without a single writer.
- **Composition:** New behavior must **compose** with existing injectors (e.g. page overlay host in `src/content/page-overlay.ts`)—prefer isolated roots or clear ownership of shared DOM, not competing globals.
- **Contracts:** Prefer typed messages in `src/lib/messages.ts`; document new flows (who sends, who handles, async vs sync).
- **Persistence:** Prefer `chrome.storage.local` with explicit keys; call out **migration** if renaming keys (breaks upgrades). Align with **DEV_GUIDE** and the **EDGE plan**.
- **Permissions:** Add the **minimum** host or API permissions that satisfy the feature; justify broad patterns (e.g. `https://*/*`) in the plan or PR.
- **Capture vs inject:** For **in-page media / volume** style features, prefer **DOM + Web Audio in the page world** over `tabCapture` unless the product explicitly needs capture-based pipelines—`tabCapture` changes threat model and UX (e.g. indicator).

## Design checklist

| Question | Action |
|----------|--------|
| Where is the source of truth for this feature? | Pick one layer + storage; others read or subscribe via messages. |
| Survives service worker restart? | Persist; rehydrate on startup paths. |
| Works after extension reload? | Content script guards + teardown (see chromium-mv3-extension). |
| Conflicts with another script? | Namespace IDs, shadow DOM, or separate entry bundle. |

## Handoffs

- **Implementation detail / code review:** code-reviewer skill.
- **Scope and gates:** pm-governance skill.
- **Product checkboxes:** [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../../../doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) and **PM_PLAN.md**.
