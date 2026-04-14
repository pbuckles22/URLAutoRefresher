"use strict";
(() => {
  // src/dashboard/dashboard.ts
  var title = document.querySelector("[data-app-title]");
  if (title) {
    title.textContent = chrome.runtime.getManifest().name;
  }
})();
