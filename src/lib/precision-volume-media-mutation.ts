/**
 * Epic 11.3 — discover `<video>` / `<audio>` under mutation targets (SPA churn).
 */

/** Collect media elements represented by a mutation node (self or descendants). */
export function gatherHtmlMediaUnderRoot(root: Node): HTMLMediaElement[] {
  if (root instanceof HTMLMediaElement) {
    return [root];
  }
  if (root instanceof Element) {
    return [...root.querySelectorAll('video, audio')].filter(
      (n): n is HTMLMediaElement => n instanceof HTMLMediaElement
    );
  }
  return [];
}
