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
  function formatGlobalGroupCountdown(nowMs, group) {
    if (!group.enabled) {
      return "\u2014";
    }
    if (group.nextFireAt === void 0) {
      return "\u2026";
    }
    const remain = group.nextFireAt - nowMs;
    if (remain <= 0) {
      return "0:00";
    }
    const totalSec = Math.ceil(remain / 1e3);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
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

  // src/lib/global-group-form.ts
  function buildGlobalGroupFromForm(input, newId = () => crypto.randomUUID()) {
    const name = input.name.trim();
    if (!name) {
      return { ok: false, error: "Enter a group name" };
    }
    if (input.targets.length < 1) {
      return { ok: false, error: "Select at least one tab" };
    }
    const seen = /* @__PURE__ */ new Set();
    for (const t of input.targets) {
      if (!Number.isInteger(t.tabId) || t.tabId < 1) {
        return { ok: false, error: "Invalid tab" };
      }
      if (!Number.isInteger(t.windowId) || t.windowId < 0) {
        return { ok: false, error: "Invalid window" };
      }
      if (seen.has(t.tabId)) {
        return { ok: false, error: `Duplicate tab ${t.tabId} in selection` };
      }
      seen.add(t.tabId);
    }
    const interval = validateIntervalSec(input.baseIntervalSec);
    if (!interval.ok) {
      return interval;
    }
    const jitter = validateJitterSec(input.jitterSec);
    if (!jitter.ok) {
      return jitter;
    }
    const targets = [];
    for (const t of input.targets) {
      const url = validateHttpUrl(t.targetUrl);
      if (!url.ok) {
        return url;
      }
      const label = t.label?.trim();
      targets.push({
        tabId: t.tabId,
        windowId: t.windowId,
        targetUrl: url.value,
        ...label ? { label } : {}
      });
    }
    return {
      ok: true,
      value: {
        id: newId(),
        name,
        targets,
        baseIntervalSec: interval.value,
        jitterSec: jitter.value,
        enabled: true
      }
    };
  }
  function buildGlobalGroupUpdateFromForm(input, existing) {
    const name = input.name.trim();
    if (!name) {
      return { ok: false, error: "Enter a group name" };
    }
    const interval = validateIntervalSec(input.baseIntervalSec);
    if (!interval.ok) {
      return interval;
    }
    const jitter = validateJitterSec(input.jitterSec);
    if (!jitter.ok) {
      return jitter;
    }
    const inputByTab = new Map(input.targets.map((t) => [t.tabId, t]));
    if (inputByTab.size !== input.targets.length) {
      return { ok: false, error: "Duplicate tab in form" };
    }
    if (existing.targets.length !== input.targets.length) {
      return { ok: false, error: "Each tab target must be provided once" };
    }
    const targets = [];
    for (const ex of existing.targets) {
      const row = inputByTab.get(ex.tabId);
      if (!row) {
        return { ok: false, error: "Each tab target must be provided once" };
      }
      const url = validateHttpUrl(row.targetUrl);
      if (!url.ok) {
        return url;
      }
      const label = row.label?.trim();
      targets.push({
        tabId: ex.tabId,
        windowId: ex.windowId,
        targetUrl: url.value,
        ...label ? { label } : {}
      });
    }
    return {
      ok: true,
      value: {
        ...existing,
        name,
        targets,
        baseIntervalSec: interval.value,
        jitterSec: jitter.value
      }
    };
  }

  // src/lib/global-group-list-row.ts
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
  var inputStyle = "padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid #5f6368; background: #202124; color: #e8eaed";
  function createGlobalGroupListRow(g, nowMs) {
    const li = document.createElement("li");
    li.setAttribute("data-global-group-row", g.id);
    li.style.cssText = rowStyle();
    const top = document.createElement("div");
    top.style.cssText = "display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;";
    const summaryLine = document.createElement("span");
    summaryLine.textContent = `${g.name} \xB7 ${g.targets.length} tabs \xB7 every ${g.baseIntervalSec}s \xB1${g.jitterSec}s`;
    summaryLine.style.flex = "1 1 12rem";
    const countdown = document.createElement("span");
    countdown.setAttribute("data-global-group-countdown", "");
    countdown.textContent = formatGlobalGroupCountdown(nowMs, g);
    countdown.style.cssText = "font-variant-numeric: tabular-nums; min-width: 3.5rem; color: #9aa0a6";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.setAttribute("data-global-group-toggle", "");
    toggle.textContent = g.enabled ? "Stop" : "Start";
    toggle.style.cssText = btnStyle();
    const del = document.createElement("button");
    del.type = "button";
    del.setAttribute("data-global-group-delete", "");
    del.textContent = "Delete";
    del.style.cssText = dangerBtnStyle();
    top.append(summaryLine, countdown, toggle, del);
    li.appendChild(top);
    const rowErr = document.createElement("p");
    rowErr.setAttribute("data-global-group-row-error", "");
    rowErr.setAttribute("role", "alert");
    rowErr.style.cssText = "color: #f28b82; margin: 0.35rem 0 0; min-height: 0; font-size: 0.8rem";
    li.appendChild(rowErr);
    const details = document.createElement("details");
    details.style.marginTop = "0.5rem";
    const sum = document.createElement("summary");
    sum.textContent = "Edit";
    sum.style.cursor = "pointer";
    sum.style.color = "#8ab4f8";
    details.appendChild(sum);
    const editWrap = document.createElement("div");
    editWrap.style.cssText = "display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.35rem; max-width: 28rem";
    const nameLab = document.createElement("label");
    nameLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    nameLab.innerHTML = "<span>Group name</span>";
    const nameIn = document.createElement("input");
    nameIn.type = "text";
    nameIn.setAttribute("data-global-edit-name", "");
    nameIn.value = g.name;
    nameIn.autocomplete = "off";
    nameIn.style.cssText = inputStyle;
    nameLab.appendChild(nameIn);
    const intLab = document.createElement("label");
    intLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    intLab.innerHTML = "<span>Interval (seconds)</span>";
    const intEdit = document.createElement("input");
    intEdit.type = "number";
    intEdit.min = "1";
    intEdit.step = "1";
    intEdit.setAttribute("data-global-edit-interval", "");
    intEdit.value = String(g.baseIntervalSec);
    intEdit.style.cssText = inputStyle;
    intLab.appendChild(intEdit);
    const jitLab = document.createElement("label");
    jitLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    jitLab.innerHTML = "<span>Jitter (seconds)</span>";
    const jitEdit = document.createElement("input");
    jitEdit.type = "number";
    jitEdit.min = "0";
    jitEdit.step = "1";
    jitEdit.setAttribute("data-global-edit-jitter", "");
    jitEdit.value = String(g.jitterSec);
    jitEdit.style.cssText = inputStyle;
    jitLab.appendChild(jitEdit);
    editWrap.append(nameLab, intLab, jitLab);
    for (const t of g.targets) {
      const lab = document.createElement("label");
      lab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
      const cap = document.createElement("span");
      cap.textContent = t.label ? `Tab ${t.tabId} \u2014 ${t.label} \xB7 target URL` : `Tab ${t.tabId} \u2014 target URL`;
      lab.appendChild(cap);
      const urlIn = document.createElement("input");
      urlIn.type = "text";
      urlIn.setAttribute("data-global-edit-target-url", "");
      urlIn.setAttribute("data-global-edit-target-tab", String(t.tabId));
      urlIn.value = t.targetUrl;
      urlIn.autocomplete = "off";
      urlIn.style.cssText = inputStyle;
      lab.appendChild(urlIn);
      editWrap.appendChild(lab);
    }
    const editErr = document.createElement("p");
    editErr.setAttribute("data-global-edit-error", "");
    editErr.style.cssText = "color: #f28b82; margin: 0; min-height: 1rem; font-size: 0.8rem";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.setAttribute("data-global-edit-save", "");
    saveBtn.textContent = "Save changes";
    saveBtn.style.cssText = `${primaryBtnStyle()} align-self: flex-start`;
    editWrap.append(editErr, saveBtn);
    details.appendChild(editWrap);
    li.appendChild(details);
    return li;
  }

  // src/lib/individual-job-list-row.ts
  function rowStyle2() {
    return "list-style: none; margin: 0.75rem 0; padding: 0.75rem; border: 1px solid #5f6368; border-radius: 8px; background: #303134;";
  }
  function btnStyle2() {
    return "padding: 0.3rem 0.65rem; border-radius: 6px; border: 1px solid #5f6368; background: #3c4043; color: #e8eaed; cursor: pointer; font-size: 0.85rem";
  }
  function dangerBtnStyle2() {
    return `${btnStyle2()} border-color: #c5221f; color: #f28b82`;
  }
  function primaryBtnStyle2() {
    return "padding: 0.35rem 0.75rem; border-radius: 6px; border: none; background: #8ab4f8; color: #202124; font-weight: 600; cursor: pointer; font-size: 0.85rem";
  }
  function createIndividualJobListRow(j, nowMs) {
    const li = document.createElement("li");
    li.setAttribute("data-individual-job-row", j.id);
    li.style.cssText = rowStyle2();
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
    toggle.style.cssText = btnStyle2();
    const del = document.createElement("button");
    del.type = "button";
    del.setAttribute("data-job-delete", "");
    del.textContent = "Delete";
    del.style.cssText = dangerBtnStyle2();
    top.append(summaryLine, countdown, toggle, del);
    li.appendChild(top);
    const rowErr = document.createElement("p");
    rowErr.setAttribute("data-job-row-error", "");
    rowErr.setAttribute("role", "alert");
    rowErr.style.cssText = "color: #f28b82; margin: 0.35rem 0 0; min-height: 0; font-size: 0.8rem";
    li.appendChild(rowErr);
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
    saveBtn.style.cssText = `${primaryBtnStyle2()} align-self: flex-start`;
    editWrap.append(urlLab, intLab, jitLab, editErr, saveBtn);
    details.appendChild(editWrap);
    li.appendChild(details);
    return li;
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

  // src/lib/global-groups.ts
  function removeGlobalGroupById(state, groupId) {
    return {
      ...state,
      globalGroups: state.globalGroups.filter((g) => g.id !== groupId)
    };
  }
  function setGlobalGroupEnabled(state, groupId, enabled) {
    return {
      ...state,
      globalGroups: state.globalGroups.map((g) => {
        if (g.id !== groupId) {
          return g;
        }
        if (!enabled) {
          return { ...g, enabled: false, nextFireAt: void 0 };
        }
        return { ...g, enabled: true };
      })
    };
  }
  function replaceGlobalGroup(state, updated) {
    const idx = state.globalGroups.findIndex((g) => g.id === updated.id);
    if (idx === -1) {
      return state;
    }
    const next = [...state.globalGroups];
    next[idx] = updated;
    return { ...state, globalGroups: next };
  }

  // src/lib/window-tab-browser.ts
  function defaultTargetUrlForTab(url) {
    const u = url.trim();
    if (u.startsWith("http://") || u.startsWith("https://")) {
      return u;
    }
    return "";
  }
  function tabRowsFromWindowsSnapshot(windows) {
    const rows = [];
    for (const w of windows) {
      const wid = w.id;
      if (typeof wid !== "number" || wid < 0) {
        continue;
      }
      const tabs = w.tabs ?? [];
      for (const tab of tabs) {
        const tid = tab.id;
        if (typeof tid !== "number") {
          continue;
        }
        rows.push({
          tabId: tid,
          windowId: wid,
          index: typeof tab.index === "number" ? tab.index : 0,
          title: tab.title?.trim() ?? "",
          url: tab.url ?? ""
        });
      }
    }
    rows.sort((a, b) => a.windowId - b.windowId || a.index - b.index);
    return rows;
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
            `Tab ${t.tabId} is already in another enabled global group. Disable or remove the other group, or remove this tab from one of the groups.`
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
        if (prev.startsWith("global")) {
          return err(
            `Tab ${j.target.tabId} cannot be in an enabled global group and an enabled individual job at the same time. Stop or delete one of them, or turn off one schedule, before enabling the other.`
          );
        }
        return err(
          `Tab ${j.target.tabId} already has another enabled individual refresh job. Stop or delete the other job first.`
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

  // src/dashboard/dashboard-app.ts
  function wireCrossSurfaceLinks() {
    const openSide = document.querySelector("[data-open-side-panel]");
    if (openSide) {
      openSide.addEventListener("click", () => {
        void chrome.windows.getCurrent().then((w) => {
          if (w.id !== void 0) {
            void chrome.sidePanel.open({ windowId: w.id });
          }
        });
      });
    }
    const openDash = document.querySelector("[data-open-dashboard-tab]");
    if (openDash) {
      openDash.addEventListener("click", () => {
        void chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
      });
    }
  }
  function initDashboardApp() {
    const title = document.querySelector("[data-app-title]");
    if (title) {
      title.textContent = chrome.runtime.getManifest().name;
    }
    const overlayPref = document.querySelector("[data-pref-overlay]");
    if (overlayPref) {
      void loadExtensionPrefs().then((p) => {
        overlayPref.checked = p.showPageOverlayTimer;
      });
      overlayPref.addEventListener("change", () => {
        void saveExtensionPrefs({ showPageOverlayTimer: overlayPref.checked });
      });
    }
    const tabSelect = document.querySelector("[data-job-tab]");
    const urlInput = document.querySelector("[data-job-target-url]");
    const intervalInput = document.querySelector("[data-job-interval]");
    const jitterInput = document.querySelector("[data-job-jitter]");
    const addJobForm = document.querySelector("[data-add-individual-form]");
    const addJobError = document.querySelector("[data-add-job-error]");
    const jobsList = document.querySelector("[data-individual-jobs-list]");
    const globalGroupForm = document.querySelector("[data-global-group-form]");
    const globalGroupName = document.querySelector("[data-global-group-name]");
    const globalTabBrowser = document.querySelector("[data-global-tab-browser]");
    const globalRefreshTabs = document.querySelector("[data-global-refresh-tabs]");
    const globalIntervalInput = document.querySelector("[data-global-interval]");
    const globalJitterInput = document.querySelector("[data-global-jitter]");
    const globalFormError = document.querySelector("[data-global-form-error]");
    const globalSectionHeading = document.querySelector("[data-global-section-heading]");
    const individualSectionHeading = document.querySelector("[data-individual-section-heading]");
    const globalGroupsList = document.querySelector("[data-global-groups-list]");
    async function renderGlobalGroupsList() {
      const state = await loadAppState();
      if (globalSectionHeading) {
        globalSectionHeading.textContent = `Global (${state.globalGroups.length})`;
      }
      if (!globalGroupsList) {
        return;
      }
      const now = Date.now();
      globalGroupsList.innerHTML = "";
      for (const g of state.globalGroups) {
        globalGroupsList.appendChild(createGlobalGroupListRow(g, now));
      }
    }
    async function renderGlobalTabBrowser() {
      if (!globalTabBrowser) {
        return;
      }
      const windows = await chrome.windows.getAll({ populate: true });
      const rows = tabRowsFromWindowsSnapshot(windows);
      globalTabBrowser.innerHTML = "";
      for (const row of rows) {
        const li = document.createElement("li");
        li.setAttribute("data-global-tab-row", String(row.tabId));
        li.setAttribute("data-window-id", String(row.windowId));
        li.style.display = "grid";
        li.style.gridTemplateColumns = "auto minmax(6rem, 1fr) minmax(10rem, 2fr)";
        li.style.gap = "0.5rem";
        li.style.alignItems = "center";
        li.style.marginBottom = "0.35rem";
        const pick = document.createElement("label");
        pick.style.display = "flex";
        pick.style.alignItems = "center";
        pick.style.gap = "0.35rem";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.setAttribute("data-global-tab-include", "");
        pick.appendChild(cb);
        pick.appendChild(document.createTextNode("Include"));
        const titleEl = document.createElement("span");
        titleEl.setAttribute("data-global-tab-title", "");
        const tlabel = row.title.trim() || row.url || `Tab ${row.tabId}`;
        titleEl.textContent = `${tlabel} (${row.tabId})`;
        titleEl.style.overflow = "hidden";
        titleEl.style.textOverflow = "ellipsis";
        titleEl.style.whiteSpace = "nowrap";
        titleEl.style.fontSize = "0.9rem";
        const urlIn = document.createElement("input");
        urlIn.type = "text";
        urlIn.setAttribute("data-global-target-url", "");
        urlIn.placeholder = "https://\u2026";
        urlIn.value = defaultTargetUrlForTab(row.url);
        urlIn.autocomplete = "off";
        urlIn.style.padding = "0.35rem 0.5rem";
        urlIn.style.borderRadius = "6px";
        urlIn.style.border = "1px solid #5f6368";
        urlIn.style.background = "#303134";
        urlIn.style.color = "#e8eaed";
        li.append(pick, titleEl, urlIn);
        globalTabBrowser.appendChild(li);
      }
    }
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
      const state = await loadAppState();
      if (individualSectionHeading) {
        individualSectionHeading.textContent = `Individual (${state.individualJobs.length})`;
      }
      if (!jobsList) {
        return;
      }
      const now = Date.now();
      jobsList.innerHTML = "";
      for (const j of state.individualJobs) {
        jobsList.appendChild(createIndividualJobListRow(j, now));
      }
    }
    async function tickCountdowns() {
      const state = await loadAppState();
      const now = Date.now();
      if (jobsList) {
        for (const job of state.individualJobs) {
          const row = jobsList.querySelector(`[data-individual-job-row="${CSS.escape(job.id)}"]`);
          const el = row?.querySelector("[data-job-countdown]");
          if (el) {
            el.textContent = formatIndividualJobCountdown(now, job);
          }
        }
      }
      if (globalGroupsList) {
        for (const g of state.globalGroups) {
          const row = globalGroupsList.querySelector(`[data-global-group-row="${CSS.escape(g.id)}"]`);
          const el = row?.querySelector("[data-global-group-countdown]");
          if (el) {
            el.textContent = formatGlobalGroupCountdown(now, g);
          }
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
            const rowErr = row.querySelector("[data-job-row-error]");
            if (rowErr) {
              rowErr.textContent = "";
            }
            const state = await loadAppState();
            const job = state.individualJobs.find((j) => j.id === id);
            if (!job) {
              return;
            }
            const next = setIndividualJobEnabled(state, id, !job.enabled);
            try {
              await saveAppState(next);
            } catch (err2) {
              if (rowErr) {
                rowErr.textContent = err2 instanceof Error ? err2.message : String(err2);
              } else {
                console.error(err2);
              }
              return;
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
    function bindGlobalGroupsListEvents() {
      if (!globalGroupsList || globalGroupsList.dataset.epic42Bound === "1") {
        return;
      }
      globalGroupsList.dataset.epic42Bound = "1";
      globalGroupsList.addEventListener("click", (e) => {
        const t = e.target;
        const row = t.closest("[data-global-group-row]");
        if (!row) {
          return;
        }
        const id = row.getAttribute("data-global-group-row");
        if (!id) {
          return;
        }
        if (t.closest("[data-global-group-delete]")) {
          void (async () => {
            const state = await loadAppState();
            const next = removeGlobalGroupById(state, id);
            try {
              await saveAppState(next);
            } catch (err2) {
              console.error(err2);
            }
            await renderGlobalGroupsList();
            await renderIndividualJobs();
          })();
          return;
        }
        if (t.closest("[data-global-group-toggle]")) {
          void (async () => {
            const rowErr = row.querySelector("[data-global-group-row-error]");
            if (rowErr) {
              rowErr.textContent = "";
            }
            const state = await loadAppState();
            const g = state.globalGroups.find((x) => x.id === id);
            if (!g) {
              return;
            }
            const next = setGlobalGroupEnabled(state, id, !g.enabled);
            try {
              await saveAppState(next);
            } catch (err2) {
              if (rowErr) {
                rowErr.textContent = err2 instanceof Error ? err2.message : String(err2);
              } else {
                console.error(err2);
              }
              return;
            }
            await renderGlobalGroupsList();
            await renderIndividualJobs();
          })();
          return;
        }
        if (t.closest("[data-global-edit-save]")) {
          void (async () => {
            const errEl = row.querySelector("[data-global-edit-error]");
            if (errEl) {
              errEl.textContent = "";
            }
            const state = await loadAppState();
            const existing = state.globalGroups.find((x) => x.id === id);
            if (!existing) {
              return;
            }
            const name = row.querySelector("[data-global-edit-name]")?.value ?? "";
            const interval = Number(row.querySelector("[data-global-edit-interval]")?.value);
            const jitter = Number(row.querySelector("[data-global-edit-jitter]")?.value);
            const targets = [];
            for (const ex of existing.targets) {
              const urlIn = row.querySelector(
                `[data-global-edit-target-url][data-global-edit-target-tab="${ex.tabId}"]`
              );
              targets.push({
                tabId: ex.tabId,
                windowId: ex.windowId,
                targetUrl: urlIn?.value ?? ""
              });
            }
            const built = buildGlobalGroupUpdateFromForm(
              { name, baseIntervalSec: interval, jitterSec: jitter, targets },
              existing
            );
            if (!built.ok) {
              if (errEl) {
                errEl.textContent = built.error;
              }
              return;
            }
            const next = replaceGlobalGroup(state, built.value);
            try {
              await saveAppState(next);
            } catch (err2) {
              if (errEl) {
                errEl.textContent = err2 instanceof Error ? err2.message : String(err2);
              }
              return;
            }
            await renderGlobalGroupsList();
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
      void renderGlobalGroupsList();
    });
    bindJobsListEvents();
    bindGlobalGroupsListEvents();
    wireCrossSurfaceLinks();
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
    if (globalRefreshTabs) {
      globalRefreshTabs.addEventListener("click", () => void renderGlobalTabBrowser());
    }
    if (globalGroupForm && globalGroupName && globalTabBrowser && globalIntervalInput && globalJitterInput) {
      globalGroupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        void (async () => {
          if (globalFormError) {
            globalFormError.textContent = "";
          }
          const targets = [];
          for (const li of globalTabBrowser.querySelectorAll("[data-global-tab-row]")) {
            const tabId = Number(li.getAttribute("data-global-tab-row"));
            const windowId = Number(li.getAttribute("data-window-id"));
            const checked = li.querySelector("[data-global-tab-include]")?.checked;
            if (!checked) {
              continue;
            }
            const targetUrl = li.querySelector("[data-global-target-url]")?.value ?? "";
            const titleText = li.querySelector("[data-global-tab-title]")?.textContent ?? "";
            const m = /^(.*) \((\d+)\)\s*$/.exec(titleText);
            const label = m?.[1]?.trim();
            targets.push({
              tabId,
              windowId,
              targetUrl,
              ...label ? { label } : {}
            });
          }
          const built = buildGlobalGroupFromForm({
            name: globalGroupName.value,
            baseIntervalSec: Number(globalIntervalInput.value),
            jitterSec: Number(globalJitterInput.value),
            targets
          });
          if (!built.ok) {
            if (globalFormError) {
              globalFormError.textContent = built.error;
            }
            return;
          }
          const state = await loadAppState();
          const next = { ...state, globalGroups: [...state.globalGroups, built.value] };
          try {
            await saveAppState(next);
          } catch (err2) {
            if (globalFormError) {
              globalFormError.textContent = err2 instanceof Error ? err2.message : String(err2);
            }
            return;
          }
          globalGroupName.value = "";
          await renderGlobalGroupsList();
          await renderIndividualJobs();
        })();
      });
    }
    void Promise.all([populateTabSelect(), renderGlobalTabBrowser(), renderGlobalGroupsList()]).then(
      () => renderIndividualJobs()
    );
  }

  // src/dashboard/dashboard.ts
  initDashboardApp();
})();
