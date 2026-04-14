"use strict";
(() => {
  // src/lib/dashboard-countdown.ts
  function formatIndividualJobCountdown(nowMs, job) {
    if (!job.enabled) {
      return "\u2014";
    }
    if (job.nextFireAt === void 0) {
      return "\u2026";
    }
    const remain = job.nextFireAt - nowMs;
    if (remain <= 0) {
      return "0:00";
    }
    const totalSec = Math.ceil(remain / 1e3);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // src/lib/individual-job-list-row.ts
  function rowStyle() {
    return "list-style: none; margin: 0.75rem 0; padding: 0.75rem; border: 1px solid #5f6368; border-radius: 8px; background: #303134;";
  }
  function btnStyle() {
    return "padding: 0.3rem 0.65rem; border-radius: 6px; border: 1px solid #5f6368; background: #3c4043; color: #e8eaed; cursor: pointer; font-size: 0.85rem";
  }
  function dangerBtnStyle() {
    return `${btnStyle()} border-color: #c5221f; color: #f28b82`;
  }
  function primaryBtnStyle() {
    return "padding: 0.35rem 0.75rem; border-radius: 6px; border: none; background: #8ab4f8; color: #202124; font-weight: 600; cursor: pointer; font-size: 0.85rem";
  }
  function createIndividualJobListRow(j, nowMs) {
    const li = document.createElement("li");
    li.setAttribute("data-individual-job-row", j.id);
    li.style.cssText = rowStyle();
    const top = document.createElement("div");
    top.style.cssText = "display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;";
    const summaryLine = document.createElement("span");
    summaryLine.textContent = `Tab ${j.target.tabId} \u2192 ${j.target.targetUrl} \xB7 every ${j.baseIntervalSec}s \xB1${j.jitterSec}s`;
    summaryLine.style.flex = "1 1 12rem";
    const countdown = document.createElement("span");
    countdown.setAttribute("data-job-countdown", "");
    countdown.textContent = formatIndividualJobCountdown(nowMs, j);
    countdown.style.cssText = "font-variant-numeric: tabular-nums; min-width: 3.5rem; color: #9aa0a6";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.setAttribute("data-job-toggle", "");
    toggle.textContent = j.enabled ? "Stop" : "Start";
    toggle.style.cssText = btnStyle();
    const del = document.createElement("button");
    del.type = "button";
    del.setAttribute("data-job-delete", "");
    del.textContent = "Delete";
    del.style.cssText = dangerBtnStyle();
    top.append(summaryLine, countdown, toggle, del);
    li.appendChild(top);
    const details = document.createElement("details");
    details.style.marginTop = "0.5rem";
    const sum = document.createElement("summary");
    sum.textContent = "Edit";
    sum.style.cursor = "pointer";
    sum.style.color = "#8ab4f8";
    details.appendChild(sum);
    const editWrap = document.createElement("div");
    editWrap.style.cssText = "display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.35rem; max-width: 28rem";
    const urlLab = document.createElement("label");
    urlLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    urlLab.innerHTML = "<span>Target URL</span>";
    const urlEdit = document.createElement("input");
    urlEdit.type = "text";
    urlEdit.setAttribute("data-job-edit-url", "");
    urlEdit.value = j.target.targetUrl;
    urlEdit.autocomplete = "off";
    urlEdit.style.cssText = "padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid #5f6368; background: #202124; color: #e8eaed";
    urlLab.appendChild(urlEdit);
    const intLab = document.createElement("label");
    intLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    intLab.innerHTML = "<span>Interval (seconds)</span>";
    const intEdit = document.createElement("input");
    intEdit.type = "number";
    intEdit.min = "1";
    intEdit.step = "1";
    intEdit.setAttribute("data-job-edit-interval", "");
    intEdit.value = String(j.baseIntervalSec);
    intEdit.style.cssText = urlEdit.style.cssText;
    intLab.appendChild(intEdit);
    const jitLab = document.createElement("label");
    jitLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    jitLab.innerHTML = "<span>Jitter (seconds)</span>";
    const jitEdit = document.createElement("input");
    jitEdit.type = "number";
    jitEdit.min = "0";
    jitEdit.step = "1";
    jitEdit.setAttribute("data-job-edit-jitter", "");
    jitEdit.value = String(j.jitterSec);
    jitEdit.style.cssText = urlEdit.style.cssText;
    jitLab.appendChild(jitEdit);
    const editErr = document.createElement("p");
    editErr.setAttribute("data-job-edit-error", "");
    editErr.style.cssText = "color: #f28b82; margin: 0; min-height: 1rem; font-size: 0.8rem";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.setAttribute("data-job-edit-save", "");
    saveBtn.textContent = "Save changes";
    saveBtn.style.cssText = `${primaryBtnStyle()} align-self: flex-start`;
    editWrap.append(urlLab, intLab, jitLab, editErr, saveBtn);
    details.appendChild(editWrap);
    li.appendChild(details);
    return li;
  }

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
  function buildIndividualJobUpdateFromForm(input, existing) {
    const base = buildIndividualJobFromForm(
      {
        tabId: existing.target.tabId,
        windowId: existing.target.windowId,
        targetUrl: input.targetUrl,
        baseIntervalSec: input.baseIntervalSec,
        jitterSec: input.jitterSec
      },
      () => existing.id
    );
    if (!base.ok) {
      return base;
    }
    return {
      ok: true,
      value: {
        ...base.value,
        enabled: existing.enabled,
        nextFireAt: existing.nextFireAt
      }
    };
  }

  // src/lib/individual-jobs.ts
  function removeIndividualJobById(state, jobId) {
    return {
      ...state,
      individualJobs: state.individualJobs.filter((j) => j.id !== jobId)
    };
  }
  function setIndividualJobEnabled(state, jobId, enabled) {
    return {
      ...state,
      individualJobs: state.individualJobs.map((j) => {
        if (j.id !== jobId) {
          return j;
        }
        if (!enabled) {
          return { ...j, enabled: false, nextFireAt: void 0 };
        }
        return { ...j, enabled: true };
      })
    };
  }
  function replaceIndividualJob(state, updated) {
    const idx = state.individualJobs.findIndex((j) => j.id === updated.id);
    if (idx === -1) {
      return state;
    }
    const next = [...state.individualJobs];
    next[idx] = updated;
    return { ...state, individualJobs: next };
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
    const now = Date.now();
    jobsList.innerHTML = "";
    for (const j of state.individualJobs) {
      jobsList.appendChild(createIndividualJobListRow(j, now));
    }
  }
  async function tickCountdowns() {
    if (!jobsList) {
      return;
    }
    const state = await loadAppState();
    const now = Date.now();
    for (const job of state.individualJobs) {
      const row = jobsList.querySelector(`[data-individual-job-row="${CSS.escape(job.id)}"]`);
      const el = row?.querySelector("[data-job-countdown]");
      if (el) {
        el.textContent = formatIndividualJobCountdown(now, job);
      }
    }
  }
  function bindJobsListEvents() {
    if (!jobsList || jobsList.dataset.epic32Bound === "1") {
      return;
    }
    jobsList.dataset.epic32Bound = "1";
    jobsList.addEventListener("click", (e) => {
      const t = e.target;
      const row = t.closest("[data-individual-job-row]");
      if (!row) {
        return;
      }
      const id = row.getAttribute("data-individual-job-row");
      if (!id) {
        return;
      }
      if (t.closest("[data-job-delete]")) {
        void (async () => {
          const state = await loadAppState();
          const next = removeIndividualJobById(state, id);
          try {
            await saveAppState(next);
          } catch (err2) {
            console.error(err2);
          }
          await renderIndividualJobs();
        })();
        return;
      }
      if (t.closest("[data-job-toggle]")) {
        void (async () => {
          const state = await loadAppState();
          const job = state.individualJobs.find((j) => j.id === id);
          if (!job) {
            return;
          }
          const next = setIndividualJobEnabled(state, id, !job.enabled);
          try {
            await saveAppState(next);
          } catch (err2) {
            console.error(err2);
          }
          await renderIndividualJobs();
        })();
        return;
      }
      if (t.closest("[data-job-edit-save]")) {
        void (async () => {
          const errEl = row.querySelector("[data-job-edit-error]");
          if (errEl) {
            errEl.textContent = "";
          }
          const state = await loadAppState();
          const job = state.individualJobs.find((j) => j.id === id);
          if (!job) {
            return;
          }
          const url = row.querySelector("[data-job-edit-url]")?.value ?? "";
          const interval = Number(row.querySelector("[data-job-edit-interval]")?.value);
          const jitter = Number(row.querySelector("[data-job-edit-jitter]")?.value);
          const built = buildIndividualJobUpdateFromForm(
            { targetUrl: url, baseIntervalSec: interval, jitterSec: jitter },
            job
          );
          if (!built.ok) {
            if (errEl) {
              errEl.textContent = built.error;
            }
            return;
          }
          const next = replaceIndividualJob(state, built.value);
          try {
            await saveAppState(next);
          } catch (err2) {
            if (errEl) {
              errEl.textContent = err2 instanceof Error ? err2.message : String(err2);
            }
            return;
          }
          await renderIndividualJobs();
        })();
      }
    });
  }
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !(STORAGE_KEY in changes)) {
      return;
    }
    void renderIndividualJobs();
  });
  bindJobsListEvents();
  window.setInterval(() => void tickCountdowns(), 1e3);
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
