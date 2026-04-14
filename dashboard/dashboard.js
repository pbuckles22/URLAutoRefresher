"use strict";
(() => {
  // src/lib/validation.ts
  function validateHttpUrl(input) {
    const trimmed = input.trim();
    if (!trimmed) {
      return { ok: false, error: "URL is required" };
    }
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      return { ok: false, error: "Invalid URL" };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "URL must start with http:// or https://" };
    }
    return { ok: true, value: trimmed };
  }
  function validateIntervalSec(n) {
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, error: "Interval must be a positive number (seconds)" };
    }
    return { ok: true, value: n };
  }
  function validateJitterSec(n) {
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "Jitter must be a non-negative number (seconds)" };
    }
    return { ok: true, value: n };
  }

  // src/lib/individual-job-form.ts
  function buildIndividualJobFromForm(input, newId = () => crypto.randomUUID()) {
    if (!Number.isInteger(input.tabId) || input.tabId < 1) {
      return { ok: false, error: "Pick a tab" };
    }
    if (!Number.isInteger(input.windowId) || input.windowId < 0) {
      return { ok: false, error: "Invalid window" };
    }
    const url = validateHttpUrl(input.targetUrl);
    if (!url.ok) {
      return url;
    }
    const interval = validateIntervalSec(input.baseIntervalSec);
    if (!interval.ok) {
      return interval;
    }
    const jitter = validateJitterSec(input.jitterSec);
    if (!jitter.ok) {
      return jitter;
    }
    return {
      ok: true,
      value: {
        id: newId(),
        target: {
          tabId: input.tabId,
          windowId: input.windowId,
          targetUrl: url.value
        },
        baseIntervalSec: interval.value,
        jitterSec: jitter.value,
        enabled: true
      }
    };
  }

  // src/lib/prefs.ts
  var PREFS_STORAGE_KEY = "urlAutoRefresher_prefs_v1";
  var DEFAULT_PREFS = {
    showPageOverlayTimer: true
  };
  function parsePrefs(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ...DEFAULT_PREFS };
    }
    const o = raw;
    const show = typeof o.showPageOverlayTimer === "boolean" ? o.showPageOverlayTimer : DEFAULT_PREFS.showPageOverlayTimer;
    return { showPageOverlayTimer: show };
  }
  async function loadExtensionPrefs() {
    const data = await chrome.storage.local.get(PREFS_STORAGE_KEY);
    const raw = data[PREFS_STORAGE_KEY];
    return parsePrefs(raw);
  }
  async function saveExtensionPrefs(prefs) {
    await chrome.storage.local.set({ [PREFS_STORAGE_KEY]: prefs });
  }

  // src/lib/state.ts
  var CURRENT_SCHEMA = 1;
  var DEFAULT_STATE = {
    schemaVersion: CURRENT_SCHEMA,
    globalGroups: [],
    individualJobs: []
  };
  function ok(value) {
    return { ok: true, value };
  }
  function err(error) {
    return { ok: false, error };
  }
  function parseStoredPayload(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ...DEFAULT_STATE };
    }
    const o = value;
    const sv = o.schemaVersion;
    if (typeof sv !== "number" || sv !== CURRENT_SCHEMA) {
      return { ...DEFAULT_STATE };
    }
    if (!Array.isArray(o.globalGroups) || !Array.isArray(o.individualJobs)) {
      return { ...DEFAULT_STATE };
    }
    return {
      schemaVersion: CURRENT_SCHEMA,
      globalGroups: o.globalGroups,
      individualJobs: o.individualJobs
    };
  }
  function validateUniqueIds(state) {
    const seen = /* @__PURE__ */ new Set();
    for (const g of state.globalGroups) {
      if (seen.has(g.id)) {
        return err(`Duplicate id: ${g.id}`);
      }
      seen.add(g.id);
    }
    for (const j of state.individualJobs) {
      if (seen.has(j.id)) {
        return err(`Duplicate id: ${j.id}`);
      }
      seen.add(j.id);
    }
    return ok(void 0);
  }
  function validateGlobalGroupTargets(group) {
    const tabs = /* @__PURE__ */ new Set();
    for (const t of group.targets) {
      if (tabs.has(t.tabId)) {
        return err(`Duplicate tabId ${t.tabId} in global group ${group.id}`);
      }
      tabs.add(t.tabId);
    }
    return ok(void 0);
  }
  function validateEnabledEnrollment(state) {
    const map = /* @__PURE__ */ new Map();
    for (const g of state.globalGroups) {
      if (!g.enabled) {
        continue;
      }
      const inner = validateGlobalGroupTargets(g);
      if (!inner.ok) {
        return inner;
      }
      for (const t of g.targets) {
        const prev = map.get(t.tabId);
        if (prev) {
          return err(
            `Tab ${t.tabId} is enrolled twice (global "${g.id}" conflicts with ${prev})`
          );
        }
        map.set(t.tabId, `global "${g.id}"`);
      }
    }
    for (const j of state.individualJobs) {
      if (!j.enabled) {
        continue;
      }
      const prev = map.get(j.target.tabId);
      if (prev) {
        return err(
          `Tab ${j.target.tabId} is enrolled as individual "${j.id}" but already in ${prev}`
        );
      }
      map.set(j.target.tabId, `individual "${j.id}"`);
    }
    return ok(void 0);
  }
  function validateStateFields(state) {
    for (const g of state.globalGroups) {
      const ji = validateIntervalSec(g.baseIntervalSec);
      if (!ji.ok) {
        return err(ji.error);
      }
      const jj = validateJitterSec(g.jitterSec);
      if (!jj.ok) {
        return err(jj.error);
      }
      for (const t of g.targets) {
        const ju = validateHttpUrl(t.targetUrl);
        if (!ju.ok) {
          return err(ju.error);
        }
      }
    }
    for (const j of state.individualJobs) {
      const ji = validateIntervalSec(j.baseIntervalSec);
      if (!ji.ok) {
        return err(ji.error);
      }
      const jj = validateJitterSec(j.jitterSec);
      if (!jj.ok) {
        return err(jj.error);
      }
      const ju = validateHttpUrl(j.target.targetUrl);
      if (!ju.ok) {
        return err(ju.error);
      }
    }
    return ok(void 0);
  }

  // src/lib/storage.ts
  var STORAGE_KEY = "urlAutoRefresher_state_v1";
  async function loadAppState() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const raw = data[STORAGE_KEY];
    return parseStoredPayload(raw);
  }
  async function saveAppState(state) {
    const u = validateUniqueIds(state);
    if (!u.ok) {
      throw new Error(u.error);
    }
    const e = validateEnabledEnrollment(state);
    if (!e.ok) {
      throw new Error(e.error);
    }
    const f = validateStateFields(state);
    if (!f.ok) {
      throw new Error(f.error);
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
  }

  // src/dashboard/dashboard.ts
  var title = document.querySelector("[data-app-title]");
  if (title) {
    title.textContent = chrome.runtime.getManifest().name;
  }
  var overlayPref = document.querySelector("[data-pref-overlay]");
  if (overlayPref) {
    void loadExtensionPrefs().then((p) => {
      overlayPref.checked = p.showPageOverlayTimer;
    });
    overlayPref.addEventListener("change", () => {
      void saveExtensionPrefs({ showPageOverlayTimer: overlayPref.checked });
    });
  }
  var tabSelect = document.querySelector("[data-job-tab]");
  var urlInput = document.querySelector("[data-job-target-url]");
  var intervalInput = document.querySelector("[data-job-interval]");
  var jitterInput = document.querySelector("[data-job-jitter]");
  var addJobForm = document.querySelector("[data-add-individual-form]");
  var addJobError = document.querySelector("[data-add-job-error]");
  var jobsList = document.querySelector("[data-individual-jobs-list]");
  async function populateTabSelect() {
    if (!tabSelect) {
      return;
    }
    const tabs = await chrome.tabs.query({});
    const withIds = tabs.filter(
      (t) => typeof t.id === "number" && typeof t.windowId === "number"
    );
    withIds.sort((a, b) => a.windowId - b.windowId || (a.index ?? 0) - (b.index ?? 0));
    tabSelect.innerHTML = '<option value="">Select a tab\u2026</option>';
    for (const t of withIds) {
      const opt = document.createElement("option");
      opt.value = String(t.id);
      const label = t.title?.trim() || t.url || `Tab ${t.id}`;
      opt.textContent = `${label} (${t.id})`;
      tabSelect.appendChild(opt);
    }
  }
  async function renderIndividualJobs() {
    if (!jobsList) {
      return;
    }
    const state = await loadAppState();
    jobsList.innerHTML = "";
    for (const j of state.individualJobs) {
      const li = document.createElement("li");
      li.textContent = `Tab ${j.target.tabId} \u2192 ${j.target.targetUrl} \xB7 every ${j.baseIntervalSec}s \xB1${j.jitterSec}s`;
      jobsList.appendChild(li);
    }
  }
  if (addJobForm && tabSelect && urlInput && intervalInput && jitterInput) {
    addJobForm.addEventListener("submit", (e) => {
      e.preventDefault();
      void (async () => {
        if (addJobError) {
          addJobError.textContent = "";
        }
        const tabId = Number(tabSelect.value);
        const tabs = await chrome.tabs.query({});
        const tab = tabs.find((t) => t.id === tabId);
        if (!tab?.id) {
          if (addJobError) {
            addJobError.textContent = "Pick a tab";
          }
          return;
        }
        const built = buildIndividualJobFromForm({
          tabId: tab.id,
          windowId: tab.windowId,
          targetUrl: urlInput.value,
          baseIntervalSec: Number(intervalInput.value),
          jitterSec: Number(jitterInput.value)
        });
        if (!built.ok) {
          if (addJobError) {
            addJobError.textContent = built.error;
          }
          return;
        }
        const state = await loadAppState();
        const next = { ...state, individualJobs: [...state.individualJobs, built.value] };
        try {
          await saveAppState(next);
        } catch (err2) {
          if (addJobError) {
            addJobError.textContent = err2 instanceof Error ? err2.message : String(err2);
          }
          return;
        }
        await renderIndividualJobs();
      })();
    });
  }
  void populateTabSelect().then(() => renderIndividualJobs());
})();
