---
name: web-audio-dsp
description: >-
  Web Audio API patterns for in-page gain and media routing: MediaElementSource
  lifetime, GainNode ramps, CORS and crossOrigin, logarithmic faders, phase
  inversion via negative gain, and avoiding clicks/clipping. Use when implementing
  precision volume, media hooks in content scripts, or when the user mentions
  GainNode, AudioContext, exponentialRampToValueAtTime, or DSP for browser audio.
---

# Web Audio DSP — Project

Use when building **browser-side** volume or tone control **inside the page** (content script), not for server audio processing.

---

## Hard rules

- **One `MediaElementSource` per element:** A `<video>` / `<audio>` may only be connected once. Guard with a stable per-element flag or WeakMap before calling `createMediaElementSource`; otherwise the graph throws and can loop retries.
- **Smooth gain changes:** Snapping `gain` causes clicks. Prefer `gainNode.gain.exponentialRampToValueAtTime(value, audioCtx.currentTime + rampSeconds)` (or linear ramps where appropriate); keep targets **> 0** for exponential ramps unless using a short fade from zero via linear or a small epsilon.
- **CORS:** `createMediaElementSource` requires the media element to participate in a CORS-safe resource when cross-origin; setting `crossOrigin = "anonymous"` only helps when the server sends proper headers—document failure modes (silent graph or errors) in UX or logs.

## UX patterns (from product specs)

- **Zero-blast init:** On hook, set gain to **0** before connecting to destination if the product requires no audible spike until user intent.
- **Log / precision fader:** Map slider position ↔ linear gain with an explicit curve (e.g. power law) so low end has more travel; keep **invert** functions tested in Vitest.
- **Phase inversion:** Negative gain inverts phase; surface **clear labeling** in UI instead of rejecting negative numbers.

## Related skills

- **extension-architect** — where hooking lives vs background.
- **chromium-mv3-extension** — messaging from UI/commands to the tab.

## Reference

- MDN: [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
