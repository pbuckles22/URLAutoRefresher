/**
 * Full-page dashboard (Epic 0 stub). Shared list UI arrives in later epics.
 */
const title = document.querySelector<HTMLElement>('[data-app-title]');
if (title) {
  title.textContent = chrome.runtime.getManifest().name;
}
