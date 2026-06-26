"use strict";
(() => {
  // src/lib/dashboard-countdown.ts
  function formatIndividualJobCountdown(nowMs, job) {
    if (!job.enabled) {
      return "\u2014";
    }
    if (job.overlayPaused) {
      return "paused";
    }
    if (job.nextFireAt === void 0) {
      return "\u2026";
    }
    const remain = job.nextFireAt - nowMs;
    if (remain <= 0) {
      return job.liveAwareRefresh && job.streamLive === true ? "live 0:00" : "0:00";
    }
    const totalSec = Math.ceil(remain / 1e3);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const core = `${m}:${String(s).padStart(2, "0")}`;
    if (job.liveAwareRefresh && job.streamLive === true) {
      return `live ${core}`;
    }
    return core;
  }
  function formatRemainSec(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  function formatGlobalGroupCountdown(nowMs, group) {
    if (!group.enabled) {
      return "\u2014";
    }
    const map = group.memberNextFireAt;
    if (map && Object.keys(map).length > 0) {
      const secList = Object.values(map).map((nf) => Math.ceil((nf - nowMs) / 1e3));
      const minS = Math.min(...secList);
      const maxS = Math.max(...secList);
      if (minS <= 0 && maxS <= 0) {
        return "0:00";
      }
      const a = Math.max(0, minS);
      const b = Math.max(0, maxS);
      if (a === b) {
        return formatRemainSec(a);
      }
      return `${formatRemainSec(a)}\u2013${formatRemainSec(b)}`;
    }
    if (group.nextFireAt === void 0) {
      return "\u2026";
    }
    const remain = group.nextFireAt - nowMs;
    if (remain <= 0) {
      return "0:00";
    }
    const totalSec = Math.ceil(remain / 1e3);
    return formatRemainSec(totalSec);
  }

  // src/lib/url-glob.ts
  var MAX_PATTERN_LEN = 200;
  function escapeRegexLiteral(s) {
    return s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  function urlMatchesGlob(url, pattern) {
    const p = pattern.trim();
    if (!p || p.length > MAX_PATTERN_LEN) {
      return false;
    }
    if (!/^https?:\/\//i.test(url)) {
      return false;
    }
    if (!p.includes("*")) {
      return url.toLowerCase().includes(p.toLowerCase());
    }
    const parts = p.split("*").map(escapeRegexLiteral);
    const re = new RegExp(`^${parts.join(".*")}$`, "i");
    return re.test(url);
  }
  function mergeDistinctPatternLines(baseRaw, additions) {
    const seen = /* @__PURE__ */ new Set();
    const linesOut = [];
    for (const line of baseRaw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) {
        continue;
      }
      seen.add(t.toLowerCase());
      linesOut.push(t);
    }
    for (const add of additions) {
      const t = add.trim();
      if (!t) {
        continue;
      }
      const k = t.toLowerCase();
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      linesOut.push(t);
    }
    return linesOut.join("\n");
  }

  // src/lib/member-url.ts
  function memberKeyFromTargetUrl(url) {
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return null;
      }
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      const path = u.pathname.replace(/\/$/, "").toLowerCase();
      return `${host}${path}`;
    } catch {
      return null;
    }
  }
  function pageMatchesExplicitTarget(pageUrl, targetUrl) {
    const p = pageUrl?.trim();
    const t = targetUrl.trim();
    if (!p || !t || !/^https?:\/\//i.test(p)) {
      return false;
    }
    if (urlMatchesGlob(p, t)) {
      return true;
    }
    const kp = memberKeyFromTargetUrl(p);
    const kt = memberKeyFromTargetUrl(t);
    if (kp === null || kt === null) {
      return false;
    }
    if (kp === kt) {
      return true;
    }
    const kpHasPath = kp.includes("/");
    const ktHasPath = kt.includes("/");
    if (!kpHasPath || !ktHasPath) {
      return false;
    }
    return kp.startsWith(`${kt}/`) || kt.startsWith(`${kp}/`);
  }
  function pickBestOpenTabForMemberTarget(candidates, memberTargetUrl, context) {
    const matched = candidates.filter(
      (t) => t.url != null && pageMatchesExplicitTarget(t.url, memberTargetUrl)
    );
    if (matched.length === 0) {
      return void 0;
    }
    if (matched.length === 1) {
      return matched[0].id;
    }
    const wid = context?.lastFocusedWindowId;
    let pool = matched;
    if (wid !== void 0) {
      const inWin = matched.filter((t) => t.windowId === wid);
      if (inWin.length > 0) {
        pool = inWin;
      }
    }
    const withId = pool.filter((t) => t.id !== void 0);
    if (withId.length === 0) {
      return void 0;
    }
    const activeTabs = withId.filter((t) => t.active === true);
    if (activeTabs.length === 1) {
      return activeTabs[0].id;
    }
    const poolForSort = activeTabs.length > 1 ? activeTabs : withId;
    const sorted = [...poolForSort].sort((a, b) => {
      const ia = a.index ?? Number.MAX_SAFE_INTEGER;
      const ib = b.index ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) {
        return ia - ib;
      }
      return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
    });
    return sorted[0]?.id;
  }

  // src/lib/twitch-favs.ts
  var RESERVED = "twitchfavs";
  var MAX_TWITCH_FAVS_TOKENS = 20;
  var MAX_TOKEN_LEN = 200;
  var TWITCH_FAVS_PATTERN_HINT = "TwitchFavs: enter streamer logins or full Twitch URLs (comma or newline). Each becomes https://www.twitch.tv/\u2026 for matching.";
  function isTwitchFavsGroupName(name) {
    return name.trim().toLowerCase() === RESERVED;
  }
  function twitchChannelLoginFromUrl(url) {
    try {
      const u = new URL(url.trim());
      if (!/(^|\.)twitch\.tv$/i.test(u.hostname)) {
        return null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length !== 1) {
        return null;
      }
      const login = parts[0];
      if (!/^[\w]+$/i.test(login)) {
        return null;
      }
      return login.toLowerCase();
    } catch {
      return null;
    }
  }
  function canonicalTwitchChannelUrl(loginLower) {
    return `https://www.twitch.tv/${loginLower}`;
  }
  function tabUrlMatchesTwitchFavsFavorite(tabUrl, favoriteCanonicalUrl) {
    const a = twitchChannelLoginFromUrl(tabUrl);
    const b = twitchChannelLoginFromUrl(favoriteCanonicalUrl);
    return a !== null && b !== null && a === b;
  }
  function expandTwitchFavsToken(token) {
    const t = token.trim();
    if (!t) {
      return { ok: false, error: "Empty streamer token" };
    }
    if (t.length > MAX_TOKEN_LEN) {
      return { ok: false, error: `Each entry must be at most ${MAX_TOKEN_LEN} characters` };
    }
    if (/^https?:\/\//i.test(t)) {
      const login = twitchChannelLoginFromUrl(t);
      if (!login) {
        return {
          ok: false,
          error: "Twitch URL must be a channel root (e.g. https://www.twitch.tv/streamername)"
        };
      }
      return { ok: true, value: canonicalTwitchChannelUrl(login) };
    }
    if (!/^[\w]+$/i.test(t)) {
      return { ok: false, error: "Streamer names must use letters, numbers, or underscores only" };
    }
    return { ok: true, value: canonicalTwitchChannelUrl(t.toLowerCase()) };
  }
  function parseTwitchFavsUrlPatternsRaw(raw) {
    const tokens = [];
    for (const line of (raw ?? "").split(/\r?\n/)) {
      for (const part of line.split(",")) {
        const segment = part.trim();
        if (!segment) {
          continue;
        }
        tokens.push(segment);
        if (tokens.length > MAX_TWITCH_FAVS_TOKENS) {
          return { ok: false, error: `At most ${MAX_TWITCH_FAVS_TOKENS} streamers or URLs` };
        }
      }
    }
    if (tokens.length === 0) {
      return { ok: true, value: [] };
    }
    const seen = /* @__PURE__ */ new Set();
    const urls = [];
    for (const tok of tokens) {
      const ex = expandTwitchFavsToken(tok);
      if (!ex.ok) {
        return ex;
      }
      const mk = memberKeyFromTargetUrl(ex.value);
      if (!mk) {
        return { ok: false, error: "Invalid expanded Twitch URL" };
      }
      if (seen.has(mk)) {
        continue;
      }
      seen.add(mk);
      urls.push(ex.value);
    }
    return { ok: true, value: urls };
  }
  function twitchFavsFavoriteMemberKeys(canonicalUrls) {
    const keys = /* @__PURE__ */ new Set();
    for (const u of canonicalUrls) {
      const mk = memberKeyFromTargetUrl(u.trim());
      if (mk) {
        keys.add(mk);
      }
    }
    return keys;
  }
  function reconcileTwitchFavsTargets(targets, favoriteCanonicalUrls) {
    const favKeys = twitchFavsFavoriteMemberKeys(favoriteCanonicalUrls);
    const canonicalByKey = /* @__PURE__ */ new Map();
    for (const u of favoriteCanonicalUrls) {
      const mk = memberKeyFromTargetUrl(u.trim());
      if (mk && !canonicalByKey.has(mk)) {
        canonicalByKey.set(mk, u.trim());
      }
    }
    const byKey = /* @__PURE__ */ new Map();
    for (const t of targets) {
      const mk = memberKeyFromTargetUrl(t.targetUrl.trim());
      if (!mk || !favKeys.has(mk)) {
        continue;
      }
      const canon = canonicalByKey.get(mk) ?? t.targetUrl.trim();
      if (!byKey.has(mk)) {
        byKey.set(mk, {
          targetUrl: canon,
          ...t.label?.trim() ? { label: t.label.trim() } : {}
        });
      }
    }
    return [...byKey.values()];
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
  function parseUrlPatternsRaw(raw) {
    if (raw === void 0 || !raw.trim()) {
      return { ok: true, value: [] };
    }
    const lines = raw.split(/\r?\n/);
    const out = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) {
        continue;
      }
      if (t.length > 200) {
        return { ok: false, error: "Each URL pattern line must be at most 200 characters" };
      }
      out.push(t);
      if (out.length > 20) {
        return { ok: false, error: "At most 20 URL patterns" };
      }
    }
    return { ok: true, value: out };
  }
  function buildGlobalGroupFromForm(input, newId = () => crypto.randomUUID()) {
    const name = input.name.trim();
    if (!name) {
      return { ok: false, error: "Enter a group name" };
    }
    const patternsResult = isTwitchFavsGroupName(name) ? parseTwitchFavsUrlPatternsRaw(input.urlPatternsRaw) : parseUrlPatternsRaw(input.urlPatternsRaw);
    if (!patternsResult.ok) {
      return patternsResult;
    }
    const urlPatterns = patternsResult.value;
    if (input.targets.length < 1 && urlPatterns.length < 1) {
      return { ok: false, error: "Select at least one tab or add at least one URL pattern" };
    }
    const interval = validateIntervalSec(input.baseIntervalSec);
    if (!interval.ok) {
      return interval;
    }
    const jitter = validateJitterSec(input.jitterSec);
    if (!jitter.ok) {
      return jitter;
    }
    const seenMk = /* @__PURE__ */ new Set();
    const targets = [];
    for (const t of input.targets) {
      const url = validateHttpUrl(t.targetUrl);
      if (!url.ok) {
        return url;
      }
      const mk = memberKeyFromTargetUrl(url.value);
      if (!mk) {
        return { ok: false, error: "Invalid member URL" };
      }
      if (seenMk.has(mk)) {
        return { ok: false, error: "Duplicate member URL in selection" };
      }
      seenMk.add(mk);
      const label = t.label?.trim();
      targets.push({
        targetUrl: url.value,
        ...label ? { label } : {}
      });
    }
    if (isTwitchFavsGroupName(name)) {
      const pruned = reconcileTwitchFavsTargets(targets, urlPatterns);
      targets.length = 0;
      targets.push(...pruned);
    }
    return {
      ok: true,
      value: {
        id: newId(),
        name,
        targets,
        ...urlPatterns.length > 0 ? { urlPatterns } : {},
        baseIntervalSec: interval.value,
        jitterSec: jitter.value,
        enabled: true
      }
    };
  }
  function filterPausedStateForTabs(existing, newTargets) {
    const remainingKeys = /* @__PURE__ */ new Set();
    for (const t of newTargets) {
      const mk = memberKeyFromTargetUrl(t.targetUrl);
      if (mk) {
        remainingKeys.add(mk);
      }
    }
    let pausedMemberKeys = existing.pausedMemberKeys?.filter((mk) => remainingKeys.has(mk));
    if (pausedMemberKeys?.length === 0) {
      pausedMemberKeys = void 0;
    }
    let memberNextFireAt = existing.memberNextFireAt;
    if (memberNextFireAt) {
      const next = {};
      for (const [k, v] of Object.entries(memberNextFireAt)) {
        if (remainingKeys.has(k)) {
          next[k] = v;
        }
      }
      memberNextFireAt = Object.keys(next).length > 0 ? next : void 0;
    }
    return { pausedMemberKeys, memberNextFireAt };
  }
  function buildGlobalGroupUpdateFromForm(input, existing) {
    const name = input.name.trim();
    if (!name) {
      return { ok: false, error: "Enter a group name" };
    }
    const patternsResult = isTwitchFavsGroupName(name) ? parseTwitchFavsUrlPatternsRaw(input.urlPatternsRaw) : parseUrlPatternsRaw(input.urlPatternsRaw);
    if (!patternsResult.ok) {
      return patternsResult;
    }
    const urlPatterns = patternsResult.value;
    const interval = validateIntervalSec(input.baseIntervalSec);
    if (!interval.ok) {
      return interval;
    }
    const jitter = validateJitterSec(input.jitterSec);
    if (!jitter.ok) {
      return jitter;
    }
    const seenMk = /* @__PURE__ */ new Set();
    const targets = [];
    for (const t of input.targets) {
      const url = validateHttpUrl(t.targetUrl);
      if (!url.ok) {
        return url;
      }
      const mk = memberKeyFromTargetUrl(url.value);
      if (!mk) {
        return { ok: false, error: "Invalid member URL" };
      }
      if (seenMk.has(mk)) {
        return { ok: false, error: "Duplicate member URL in form" };
      }
      seenMk.add(mk);
      const label = t.label?.trim();
      targets.push({
        targetUrl: url.value,
        ...label ? { label } : {}
      });
    }
    if (targets.length < 1 && urlPatterns.length < 1) {
      return { ok: false, error: "Keep at least one tab or one URL pattern" };
    }
    if (isTwitchFavsGroupName(name)) {
      const pruned = reconcileTwitchFavsTargets(targets, urlPatterns);
      targets.length = 0;
      targets.push(...pruned);
    }
    const { pausedMemberKeys, memberNextFireAt } = filterPausedStateForTabs(existing, targets);
    const next = {
      ...existing,
      name,
      targets,
      baseIntervalSec: interval.value,
      jitterSec: jitter.value
    };
    if (urlPatterns.length > 0) {
      next.urlPatterns = urlPatterns;
    } else {
      delete next.urlPatterns;
    }
    if (pausedMemberKeys !== void 0) {
      next.pausedMemberKeys = pausedMemberKeys;
    } else {
      delete next.pausedMemberKeys;
    }
    if (memberNextFireAt !== void 0) {
      next.memberNextFireAt = memberNextFireAt;
    } else {
      delete next.memberNextFireAt;
    }
    return { ok: true, value: next };
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
  function addMemberBtnStyle() {
    return `${btnStyle()} border-color: #137333; color: #81c995; background: #1e3a2f; font-weight: 600`;
  }
  var inputStyle = "padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid #5f6368; background: #202124; color: #e8eaed";
  function createGlobalGroupListRow(g, nowMs) {
    const li = document.createElement("li");
    li.setAttribute("data-global-group-row", g.id);
    li.style.cssText = rowStyle();
    const top = document.createElement("div");
    top.style.cssText = "display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;";
    const patCount = g.urlPatterns?.filter((p) => p.trim()).length ?? 0;
    const autoHint = patCount > 0 ? isTwitchFavsGroupName(g.name) ? ` + ${patCount} streamer${patCount === 1 ? "" : "s"}` : ` + ${patCount} URL pattern${patCount === 1 ? "" : "s"}` : "";
    const summaryLine = document.createElement("span");
    summaryLine.textContent = `${g.name} \xB7 ${g.targets.length} explicit${autoHint} \xB7 every ${g.baseIntervalSec}s \xB1${g.jitterSec}s`;
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
    const patLab = document.createElement("label");
    patLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    patLab.innerHTML = "<span>Auto-include URL patterns (optional)</span>";
    const patTa = document.createElement("textarea");
    patTa.rows = 3;
    patTa.setAttribute("data-global-edit-url-patterns", "");
    patTa.value = g.urlPatterns?.join("\n") ?? "";
    patTa.autocomplete = "off";
    patTa.style.cssText = `${inputStyle}; resize: vertical; min-height: 3rem`;
    patLab.appendChild(patTa);
    const twitchPatHint = document.createElement("p");
    twitchPatHint.setAttribute("data-twitch-favs-pattern-hint", "");
    twitchPatHint.textContent = TWITCH_FAVS_PATTERN_HINT;
    twitchPatHint.style.cssText = "margin: 0.25rem 0 0; font-size: 0.78rem; color: #9aa0a6; line-height: 1.35; display: none";
    patLab.appendChild(twitchPatHint);
    const syncTwitchPatHint = () => {
      twitchPatHint.style.display = isTwitchFavsGroupName(nameIn.value) ? "block" : "none";
    };
    syncTwitchPatHint();
    nameIn.addEventListener("input", syncTwitchPatHint);
    editWrap.append(nameLab, intLab, jitLab, patLab);
    const membersHeader = document.createElement("div");
    membersHeader.style.cssText = "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.35rem";
    const membersTitle = document.createElement("span");
    membersTitle.textContent = "Member tabs";
    membersTitle.style.fontSize = "0.85rem";
    membersTitle.style.color = "#e8eaed";
    const addTabBtn = document.createElement("button");
    addTabBtn.type = "button";
    addTabBtn.setAttribute("data-global-edit-add-target", "");
    addTabBtn.setAttribute("aria-label", "Add tab to group");
    addTabBtn.textContent = "+";
    addTabBtn.title = "Add tab to group";
    addTabBtn.style.cssText = addMemberBtnStyle();
    membersHeader.append(membersTitle, addTabBtn);
    const targetsContainer = document.createElement("div");
    targetsContainer.setAttribute("data-global-edit-targets", "");
    editWrap.append(membersHeader, targetsContainer);
    for (const t of g.targets) {
      appendGlobalEditExistingTargetRow(targetsContainer, t);
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
  function appendGlobalEditExistingTargetRow(container, t) {
    const row = document.createElement("div");
    row.setAttribute("data-global-edit-target-row", "");
    const mk = memberKeyFromTargetUrl(t.targetUrl) ?? "";
    row.setAttribute("data-global-edit-member-key", mk);
    row.style.cssText = "display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem; margin-top: 0.35rem";
    const lab = document.createElement("label");
    lab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; flex: 1 1 14rem";
    const cap = document.createElement("span");
    cap.textContent = t.label ? `${t.label} \xB7 target URL` : "Target URL";
    lab.appendChild(cap);
    const urlIn = document.createElement("input");
    urlIn.type = "text";
    urlIn.setAttribute("data-global-edit-target-url", "");
    urlIn.value = t.targetUrl;
    urlIn.autocomplete = "off";
    urlIn.style.cssText = inputStyle;
    lab.appendChild(urlIn);
    const rm = document.createElement("button");
    rm.type = "button";
    rm.setAttribute("data-global-edit-remove-target", "");
    rm.setAttribute("aria-label", "Remove tab from group");
    rm.textContent = "\xD7";
    rm.title = "Remove tab from group";
    rm.style.cssText = dangerBtnStyle();
    row.append(lab, rm);
    container.appendChild(row);
  }
  function appendGlobalEditNewTargetRow(container) {
    const row = document.createElement("div");
    row.setAttribute("data-global-edit-target-row", "");
    row.setAttribute("data-global-edit-new-target", "1");
    row.style.cssText = "display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem; margin-top: 0.35rem";
    const selLab = document.createElement("label");
    selLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; flex: 1 1 12rem";
    selLab.innerHTML = "<span>Pick open tab (optional)</span>";
    const select = document.createElement("select");
    select.setAttribute("data-global-edit-pick-tab", "");
    select.style.cssText = `${inputStyle}; max-width: 100%`;
    select.innerHTML = '<option value="">Select a tab\u2026</option>';
    selLab.appendChild(select);
    const urlLab = document.createElement("label");
    urlLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; flex: 2 1 14rem";
    urlLab.innerHTML = "<span>Target URL</span>";
    const urlIn = document.createElement("input");
    urlIn.type = "text";
    urlIn.setAttribute("data-global-edit-target-url", "");
    urlIn.placeholder = "https://\u2026";
    urlIn.autocomplete = "off";
    urlIn.style.cssText = inputStyle;
    urlLab.appendChild(urlIn);
    const rm = document.createElement("button");
    rm.type = "button";
    rm.setAttribute("data-global-edit-remove-target", "");
    rm.setAttribute("aria-label", "Remove tab from group");
    rm.textContent = "\xD7";
    rm.title = "Remove tab from group";
    rm.style.cssText = dangerBtnStyle();
    row.append(selLab, urlLab, rm);
    container.appendChild(row);
    return select;
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
          return { ...g, enabled: false, nextFireAt: void 0, memberNextFireAt: void 0 };
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
  function pinTabIdFirst(items, pinTabId) {
    if (pinTabId === void 0 || pinTabId < 1 || items.length < 2) {
      return [...items];
    }
    const idx = items.findIndex((t) => t.id === pinTabId);
    if (idx <= 0) {
      return [...items];
    }
    const next = [...items];
    const [pinned] = next.splice(idx, 1);
    next.unshift(pinned);
    return next;
  }
  function tabRowsFromWindowsSnapshot(windows, pinTabId) {
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
    if (pinTabId === void 0 || pinTabId < 1) {
      return rows;
    }
    const pinIdx = rows.findIndex((r) => r.tabId === pinTabId);
    if (pinIdx <= 0) {
      return rows;
    }
    const next = [...rows];
    const [pinned] = next.splice(pinIdx, 1);
    next.unshift(pinned);
    return next;
  }

  // src/lib/preferred-pin-tab.ts
  function isSchedulableWebUrl(url) {
    const u = (url ?? "").trim();
    return u.startsWith("http://") || u.startsWith("https://");
  }
  async function resolvePreferredPinTabId() {
    try {
      const win = await chrome.windows.getLastFocused({ populate: true });
      const tabs = win.tabs ?? [];
      const active = tabs.find((t) => t.active);
      if (active?.id !== void 0 && isSchedulableWebUrl(active.url)) {
        return active.id;
      }
      const sorted = [...tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      for (const t of sorted) {
        if (t.id !== void 0 && isSchedulableWebUrl(t.url)) {
          return t.id;
        }
      }
    } catch {
    }
    return void 0;
  }

  // src/lib/global-group-targets.ts
  function isHttpUrl(u) {
    if (!u) {
      return false;
    }
    return u.startsWith("http://") || u.startsWith("https://");
  }
  function tabsToCandidates(tabs) {
    return tabs.map((t) => ({
      id: t.id,
      windowId: t.windowId,
      url: t.url,
      active: t.active,
      index: t.index
    }));
  }
  async function resolveGlobalGroupTargets(group, queryTabs = () => chrome.tabs.query({})) {
    let tabs;
    try {
      tabs = await queryTabs();
    } catch {
      tabs = [];
    }
    const candidates = tabsToCandidates(tabs);
    let lastFocusedWindowId;
    try {
      const w = await chrome.windows.getLastFocused();
      lastFocusedWindowId = w.id;
    } catch {
      lastFocusedWindowId = void 0;
    }
    const byId = /* @__PURE__ */ new Map();
    for (const member of group.targets) {
      const pickedId = pickBestOpenTabForMemberTarget(candidates, member.targetUrl, {
        lastFocusedWindowId
      });
      if (pickedId === void 0) {
        continue;
      }
      const tab = tabs.find((x) => x.id === pickedId);
      const wid = tab?.windowId;
      const url = tab?.url;
      if (wid === void 0 || !isHttpUrl(url)) {
        continue;
      }
      byId.set(pickedId, {
        tabId: pickedId,
        windowId: wid,
        targetUrl: member.targetUrl
      });
    }
    const patterns = group.urlPatterns?.filter((p) => p.trim()) ?? [];
    if (patterns.length === 0) {
      return [...byId.values()];
    }
    for (const tab of tabs) {
      const id = tab.id;
      const wid = tab.windowId;
      const url = tab.url;
      if (id === void 0 || wid === void 0 || byId.has(id) || !isHttpUrl(url)) {
        continue;
      }
      for (const pattern of patterns) {
        const match = isTwitchFavsGroupName(group.name) ? tabUrlMatchesTwitchFavsFavorite(url, pattern) : urlMatchesGlob(url, pattern);
        if (match) {
          byId.set(id, { tabId: id, windowId: wid, targetUrl: url });
          break;
        }
      }
    }
    return [...byId.values()];
  }

  // src/lib/global-group-enrollment.ts
  function ok() {
    return { ok: true, value: void 0 };
  }
  function err(message) {
    return { ok: false, error: message };
  }
  function memberKeysFromResolved(resolved) {
    const keys = /* @__PURE__ */ new Set();
    for (const t of resolved) {
      const mk = memberKeyFromTargetUrl(t.targetUrl);
      if (mk) {
        keys.add(mk);
      }
    }
    return keys;
  }
  async function validateGlobalGroupResolvedEnrollment(state, candidate, excludeGroupId) {
    const resolved = await resolveGlobalGroupTargets(candidate);
    const candidateMemberKeys = memberKeysFromResolved(resolved);
    for (const j of state.individualJobs) {
      if (!j.enabled) {
        continue;
      }
      const jmk = memberKeyFromTargetUrl(j.target.targetUrl);
      if (!jmk) {
        continue;
      }
      for (const t of resolved) {
        const tmk = memberKeyFromTargetUrl(t.targetUrl);
        if (tmk === jmk) {
          return err(
            `This URL has an enabled individual job. Disable that job or remove it before this group can use the same URL.`
          );
        }
      }
    }
    for (const g of state.globalGroups) {
      if (!g.enabled || g.id === excludeGroupId) {
        continue;
      }
      const other = await resolveGlobalGroupTargets(g);
      for (const mk of memberKeysFromResolved(other)) {
        if (candidateMemberKeys.has(mk)) {
          return err(
            `This group shares a member URL with enabled global group "${g.name}". Disable that group or adjust targets and URL patterns.`
          );
        }
      }
    }
    return ok();
  }

  // src/lib/blip-match.ts
  var BLIP_MAX_PHRASES = 20;
  var BLIP_MAX_PHRASE_LEN = 200;
  var BLIP_MAX_REGEX_LEN = 240;
  function normalizeBlipPhrasesFromTextarea(raw) {
    if (!raw?.trim()) {
      return [];
    }
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim().slice(0, BLIP_MAX_PHRASE_LEN);
      if (!t) {
        continue;
      }
      const key = t.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(t);
      if (out.length >= BLIP_MAX_PHRASES) {
        break;
      }
    }
    return out;
  }
  function compileBlipRegex(pattern) {
    if (!pattern?.trim()) {
      return void 0;
    }
    const p = pattern.trim().slice(0, BLIP_MAX_REGEX_LEN);
    try {
      return new RegExp(p, "i");
    } catch {
      return void 0;
    }
  }

  // src/lib/state.ts
  var CURRENT_SCHEMA = 3;
  var DEFAULT_STATE = {
    schemaVersion: CURRENT_SCHEMA,
    globalGroups: [],
    individualJobs: []
  };
  function ok2(value) {
    return { ok: true, value };
  }
  function err2(error) {
    return { ok: false, error };
  }
  function mergeMemberFireAt(map, key, val) {
    const p = map[key];
    map[key] = p === void 0 ? val : Math.min(p, val);
  }
  function normalizeTargetRef(raw) {
    const url = typeof raw.targetUrl === "string" ? raw.targetUrl.trim() : "";
    const labelRaw = raw.label;
    const label = typeof labelRaw === "string" && labelRaw.trim().length > 0 ? labelRaw.trim() : void 0;
    return label !== void 0 ? { targetUrl: url, label } : { targetUrl: url };
  }
  function migrateIndividualJobRecord(raw) {
    const t = raw.target;
    const target = t && typeof t === "object" && t !== null && !Array.isArray(t) ? normalizeTargetRef(t) : { targetUrl: "" };
    return { ...raw, target };
  }
  function normalizeGlobalGroup(raw) {
    const g = raw;
    const rawTargetObjs = Array.isArray(raw.targets) ? raw.targets : [];
    const memberNextFireAt = { ...g.memberNextFireAt ?? {} };
    for (const [k, v] of Object.entries(g.tabNextFireAt ?? {})) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        continue;
      }
      if (/^\d+$/.test(k)) {
        const tid = Number(k);
        const legacy = rawTargetObjs.find((t) => Number(t.tabId) === tid);
        const url = typeof legacy?.targetUrl === "string" ? legacy.targetUrl : "";
        if (url) {
          const mk = memberKeyFromTargetUrl(url);
          if (mk) {
            mergeMemberFireAt(memberNextFireAt, mk, v);
          }
        }
      }
    }
    const pausedMemberKeys = /* @__PURE__ */ new Set();
    for (const s of g.pausedMemberKeys ?? []) {
      if (typeof s === "string" && s.length > 0 && s.length <= 2048) {
        pausedMemberKeys.add(s);
      }
    }
    for (const id of g.pausedTabIds ?? []) {
      if (!Number.isInteger(id) || id < 1) {
        continue;
      }
      const legacy = rawTargetObjs.find((t) => Number(t.tabId) === id);
      const url = typeof legacy?.targetUrl === "string" ? legacy.targetUrl : "";
      if (url) {
        const mk = memberKeyFromTargetUrl(url);
        if (mk) {
          pausedMemberKeys.add(mk);
        }
      }
    }
    const targets = rawTargetObjs.map((row) => normalizeTargetRef(row));
    const {
      pausedTabIds: _pt,
      tabNextFireAt: _tnf,
      memberNextFireAt: _mn0,
      pausedMemberKeys: _pm0,
      targets: _tg,
      ...rest
    } = g;
    return {
      ...rest,
      targets,
      ...Object.keys(memberNextFireAt).length > 0 ? { memberNextFireAt } : {},
      ...pausedMemberKeys.size > 0 ? { pausedMemberKeys: [...pausedMemberKeys].sort() } : {}
    };
  }
  function parseStoredPayload(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ...DEFAULT_STATE };
    }
    const o = value;
    const sv = o.schemaVersion;
    if (typeof sv !== "number" || sv !== 1 && sv !== 2 && sv !== CURRENT_SCHEMA) {
      return { ...DEFAULT_STATE };
    }
    if (!Array.isArray(o.globalGroups) || !Array.isArray(o.individualJobs)) {
      return { ...DEFAULT_STATE };
    }
    const globalGroups = o.globalGroups.map(
      (g) => normalizeGlobalGroup(g)
    );
    const individualJobs = o.individualJobs.map(
      (j) => migrateIndividualJobRecord(j)
    );
    return {
      schemaVersion: CURRENT_SCHEMA,
      globalGroups,
      individualJobs
    };
  }
  function validateUniqueIds(state) {
    const seen = /* @__PURE__ */ new Set();
    for (const g of state.globalGroups) {
      if (seen.has(g.id)) {
        return err2(`Duplicate id: ${g.id}`);
      }
      seen.add(g.id);
    }
    for (const j of state.individualJobs) {
      if (seen.has(j.id)) {
        return err2(`Duplicate id: ${j.id}`);
      }
      seen.add(j.id);
    }
    return ok2(void 0);
  }
  function validateGlobalGroupTargets(group) {
    const keys = /* @__PURE__ */ new Set();
    for (const t of group.targets) {
      const mk = memberKeyFromTargetUrl(t.targetUrl);
      if (!mk) {
        return err2(`Invalid member URL in global group ${group.id}`);
      }
      if (keys.has(mk)) {
        return err2(`Duplicate member URL in global group ${group.id}`);
      }
      keys.add(mk);
    }
    return ok2(void 0);
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
        const mk = memberKeyFromTargetUrl(t.targetUrl);
        if (!mk) {
          continue;
        }
        const prev = map.get(mk);
        if (prev) {
          return err2(
            `This URL is already used in ${prev}. Disable or remove the other group, or remove this URL from one of the groups.`
          );
        }
        map.set(mk, `global group "${g.id}"`);
      }
    }
    for (const j of state.individualJobs) {
      if (!j.enabled) {
        continue;
      }
      const mk = memberKeyFromTargetUrl(j.target.targetUrl);
      if (!mk) {
        continue;
      }
      const prev = map.get(mk);
      if (prev) {
        if (prev.startsWith("global")) {
          return err2(
            `This URL cannot be in an enabled global group and an enabled individual job at the same time. Stop or delete one of them, or turn off one schedule, before enabling the other.`
          );
        }
        return err2(
          `This URL already has another enabled individual refresh job. Stop or delete the other job first.`
        );
      }
      map.set(mk, `individual "${j.id}"`);
    }
    return ok2(void 0);
  }
  function validateStateFields(state) {
    for (const g of state.globalGroups) {
      const ji = validateIntervalSec(g.baseIntervalSec);
      if (!ji.ok) {
        return err2(ji.error);
      }
      const jj = validateJitterSec(g.jitterSec);
      if (!jj.ok) {
        return err2(jj.error);
      }
      for (const t of g.targets) {
        const ju = validateHttpUrl(t.targetUrl);
        if (!ju.ok) {
          return err2(ju.error);
        }
      }
      const pats = g.urlPatterns;
      if (pats !== void 0) {
        if (!Array.isArray(pats) || pats.length > 20) {
          return err2("Invalid global group URL patterns");
        }
        for (const p of pats) {
          if (typeof p !== "string" || p.length === 0 || p.length > 200) {
            return err2("Invalid global group URL pattern");
          }
        }
      }
      const paused = g.pausedMemberKeys;
      if (paused !== void 0) {
        if (!Array.isArray(paused)) {
          return err2("Invalid paused member key list");
        }
        for (const key of paused) {
          if (typeof key !== "string" || key.length === 0 || key.length > 2048) {
            return err2("Invalid paused member key");
          }
        }
      }
      const tnf = g.memberNextFireAt;
      if (tnf !== void 0) {
        if (typeof tnf !== "object" || tnf === null || Array.isArray(tnf)) {
          return err2("Invalid global group member schedule");
        }
        for (const [k, v] of Object.entries(tnf)) {
          if (typeof k !== "string" || k.length === 0 || k.length > 2048) {
            return err2("Invalid global group member schedule entry key");
          }
          if (typeof v !== "number" || !Number.isFinite(v)) {
            return err2("Invalid global group member schedule entry");
          }
        }
      }
    }
    for (const j of state.individualJobs) {
      const ji = validateIntervalSec(j.baseIntervalSec);
      if (!ji.ok) {
        return err2(ji.error);
      }
      const jj = validateJitterSec(j.jitterSec);
      if (!jj.ok) {
        return err2(jj.error);
      }
      const ju = validateHttpUrl(j.target.targetUrl);
      if (!ju.ok) {
        return err2(ju.error);
      }
      if (j.overlayPaused !== void 0 && typeof j.overlayPaused !== "boolean") {
        return err2("Invalid individual job overlay pause flag");
      }
      const phrases = j.blipWatchPhrases;
      if (phrases !== void 0) {
        if (!Array.isArray(phrases) || phrases.length > BLIP_MAX_PHRASES) {
          return err2("Invalid blip phrases");
        }
        for (const p of phrases) {
          if (typeof p !== "string" || p.length === 0 || p.length > BLIP_MAX_PHRASE_LEN) {
            return err2("Invalid blip phrase");
          }
        }
      }
      const br = j.blipWatchRegex;
      if (br !== void 0 && br.trim()) {
        if (typeof br !== "string" || br.length > BLIP_MAX_REGEX_LEN) {
          return err2("Invalid blip regex length");
        }
        if (!compileBlipRegex(br)) {
          return err2("Invalid blip regex");
        }
      }
      const bmp = j.blipMaxPerMinute;
      if (bmp !== void 0 && (!Number.isInteger(bmp) || bmp < 1 || bmp > 30)) {
        return err2("Blip max per minute must be 1\u201330");
      }
    }
    return ok2(void 0);
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

  // src/dashboard/dashboard-individual-tab-picker.ts
  function createIndividualTabPickerCache() {
    return { tabs: [] };
  }
  async function refreshIndividualTabPickerCache(cache) {
    const [tabs, pinId] = await Promise.all([chrome.tabs.query({}), resolvePreferredPinTabId()]);
    const withIds = tabs.filter(
      (t) => typeof t.id === "number" && typeof t.windowId === "number"
    );
    withIds.sort((a, b) => a.windowId - b.windowId || (a.index ?? 0) - (b.index ?? 0));
    cache.tabs = pinTabIdFirst(withIds, pinId);
  }
  function applyIndividualTabSelectFilter(ctx, cache) {
    const { tabSelect, jobTabSearch } = ctx.dom;
    if (!tabSelect) {
      return;
    }
    const q = (jobTabSearch?.value ?? "").trim().toLowerCase();
    const prev = tabSelect.value;
    tabSelect.innerHTML = '<option value="">Select a tab\u2026</option>';
    for (const t of cache.tabs) {
      const label = t.title?.trim() || t.url || `Tab ${t.id}`;
      const url = t.url ?? "";
      const hay = `${label} (${t.id}) ${url}`.toLowerCase();
      if (q !== "" && !hay.includes(q)) {
        continue;
      }
      const opt = document.createElement("option");
      opt.value = String(t.id);
      opt.textContent = `${label} (${t.id})`;
      tabSelect.appendChild(opt);
    }
    const stillValid = prev !== "" && [...tabSelect.options].some((o) => o.value === prev);
    tabSelect.value = stillValid ? prev : "";
  }
  async function populateIndividualTabSelect(ctx, cache) {
    await refreshIndividualTabPickerCache(cache);
    if (!ctx.dom.tabSelect) {
      return;
    }
    applyIndividualTabSelectFilter(ctx, cache);
  }
  function syncIndividualTargetUrlFromSelectedTab(ctx, cache) {
    const { tabSelect, urlInput } = ctx.dom;
    if (!tabSelect || !urlInput) {
      return;
    }
    const raw = tabSelect.value;
    if (raw === "") {
      return;
    }
    const tabId = Number(raw);
    if (!Number.isInteger(tabId) || tabId < 1) {
      return;
    }
    const tab = cache.tabs.find((t) => t.id === tabId);
    if (tab) {
      urlInput.value = defaultTargetUrlForTab(tab.url ?? "");
      return;
    }
    void chrome.tabs.get(tabId).then((t) => {
      if (tabSelect?.value !== String(tabId) || !urlInput) {
        return;
      }
      urlInput.value = defaultTargetUrlForTab(t.url ?? "");
    });
  }
  function bindIndividualTabPickerUi(ctx, cache, options) {
    const { jobTabSearch, jobTabRefresh, tabSelect } = ctx.dom;
    if (jobTabSearch && jobTabSearch.dataset.filterBound !== "1") {
      jobTabSearch.dataset.filterBound = "1";
      jobTabSearch.addEventListener("input", () => applyIndividualTabSelectFilter(ctx, cache));
    }
    if (jobTabRefresh) {
      jobTabRefresh.addEventListener(
        "click",
        () => void populateIndividualTabSelect(ctx, cache).then(() => options?.afterTabListRefresh?.())
      );
    }
    if (tabSelect && tabSelect.dataset.targetSyncBound !== "1") {
      tabSelect.dataset.targetSyncBound = "1";
      tabSelect.addEventListener("change", () => syncIndividualTargetUrlFromSelectedTab(ctx, cache));
    }
  }

  // src/dashboard/dashboard-global-groups.ts
  function globalGroupRowSelectorFragment(groupId) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(groupId);
    }
    return groupId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function tickGlobalGroupCountdowns(globalGroupsList, globalGroups, now) {
    if (!globalGroupsList) {
      return;
    }
    for (const g of globalGroups) {
      const row = globalGroupsList.querySelector(
        `[data-global-group-row="${globalGroupRowSelectorFragment(g.id)}"]`
      );
      const el = row?.querySelector("[data-global-group-countdown]");
      if (el) {
        el.textContent = formatGlobalGroupCountdown(now, g);
      }
    }
  }
  async function renderGlobalGroupsList(ctx) {
    const { globalSectionHeading, globalGroupsList } = ctx.dom;
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
  function applyGlobalTabSearchFilter(ctx) {
    const { globalTabBrowser, globalTabSearch } = ctx.dom;
    if (!globalTabBrowser) {
      return;
    }
    const q = (globalTabSearch?.value ?? "").trim().toLowerCase();
    for (const li of globalTabBrowser.querySelectorAll("[data-global-tab-row]")) {
      const title = li.querySelector("[data-global-tab-title]")?.textContent ?? "";
      const url = li.querySelector("[data-global-target-url]")?.value ?? "";
      const hay = `${title} ${url}`.toLowerCase();
      if (q === "" || hay.includes(q)) {
        li.style.display = "grid";
      } else {
        li.style.display = "none";
      }
    }
  }
  async function renderGlobalTabBrowser(ctx) {
    const { globalTabBrowser } = ctx.dom;
    if (!globalTabBrowser) {
      return;
    }
    const [windows, pinId] = await Promise.all([
      chrome.windows.getAll({ populate: true }),
      resolvePreferredPinTabId()
    ]);
    const rows = tabRowsFromWindowsSnapshot(windows, pinId);
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
      titleEl.textContent = tlabel;
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
    applyGlobalTabSearchFilter(ctx);
  }
  function populateGlobalEditNewTabSelect(selectEl, groupRow, cache) {
    const selfRow = selectEl.closest("[data-global-edit-target-row]");
    const taken = /* @__PURE__ */ new Set();
    for (const tr of groupRow.querySelectorAll("[data-global-edit-target-row]")) {
      if (tr === selfRow) {
        continue;
      }
      if (tr.hasAttribute("data-global-edit-new-target")) {
        const v = tr.querySelector("[data-global-edit-pick-tab]")?.value;
        if (v) {
          taken.add(Number(v));
        }
      }
    }
    const current = selectEl.value;
    selectEl.innerHTML = '<option value="">Select a tab\u2026</option>';
    for (const t of cache.tabs) {
      if (t.id !== Number(current) && taken.has(t.id)) {
        continue;
      }
      const opt = document.createElement("option");
      opt.value = String(t.id);
      opt.setAttribute("data-window-id", String(t.windowId));
      const label = t.title?.trim() || t.url || `Tab ${t.id}`;
      opt.textContent = `${label} (${t.id})`;
      selectEl.appendChild(opt);
    }
    const still = current !== "" && [...selectEl.options].some((o) => o.value === current);
    selectEl.value = still ? current : "";
  }
  function bindGlobalTwitchFavsHint(ctx) {
    const { globalGroupName, globalTwitchFavsHint } = ctx.dom;
    if (globalTwitchFavsHint) {
      globalTwitchFavsHint.textContent = TWITCH_FAVS_PATTERN_HINT;
    }
    if (globalGroupName && globalTwitchFavsHint) {
      const syncGlobalTwitchFavsHint = () => {
        globalTwitchFavsHint.style.display = isTwitchFavsGroupName(globalGroupName.value) ? "block" : "none";
      };
      globalGroupName.addEventListener("input", syncGlobalTwitchFavsHint);
      syncGlobalTwitchFavsHint();
    }
  }
  function bindGlobalGroupsListEvents(ctx, individualTabCache, refreshIndividualJobs) {
    const { globalGroupsList } = ctx.dom;
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
          } catch (err3) {
            console.error(err3);
          }
          await renderGlobalGroupsList(ctx);
          await refreshIndividualJobs(ctx);
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
          } catch (err3) {
            if (rowErr) {
              rowErr.textContent = err3 instanceof Error ? err3.message : String(err3);
            } else {
              console.error(err3);
            }
            return;
          }
          await renderGlobalGroupsList(ctx);
          await refreshIndividualJobs(ctx);
        })();
        return;
      }
      if (t.closest("[data-global-edit-add-target]")) {
        e.preventDefault();
        void (async () => {
          await refreshIndividualTabPickerCache(individualTabCache);
          const container = row.querySelector("[data-global-edit-targets]");
          if (!container || !(container instanceof HTMLElement)) {
            return;
          }
          const select = appendGlobalEditNewTargetRow(container);
          populateGlobalEditNewTabSelect(select, row, individualTabCache);
        })();
        return;
      }
      if (t.closest("[data-global-edit-remove-target]")) {
        e.preventDefault();
        const tr = t.closest("[data-global-edit-target-row]");
        tr?.remove();
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
          const interval = Number(
            row.querySelector("[data-global-edit-interval]")?.value
          );
          const jitter = Number(
            row.querySelector("[data-global-edit-jitter]")?.value
          );
          const targets = [];
          const extraPatternUrls = [];
          for (const tr of row.querySelectorAll("[data-global-edit-target-row]")) {
            if (tr.hasAttribute("data-global-edit-new-target")) {
              const sel = tr.querySelector("[data-global-edit-pick-tab]");
              const urlIn = tr.querySelector("[data-global-edit-target-url]");
              const raw = sel?.value?.trim() ?? "";
              const urlRaw = (urlIn?.value ?? "").trim();
              if (raw === "" && urlRaw === "") {
                continue;
              }
              if (raw === "") {
                const urlCheck = validateHttpUrl(urlRaw);
                if (!urlCheck.ok) {
                  if (errEl) {
                    errEl.textContent = urlCheck.error;
                  }
                  return;
                }
                extraPatternUrls.push(urlCheck.value);
                continue;
              }
              const tabId = Number(raw);
              if (!Number.isInteger(tabId) || tabId < 1) {
                if (errEl) {
                  errEl.textContent = "Invalid tab selection";
                }
                return;
              }
              const tabMeta = individualTabCache.tabs.find((x) => x.id === tabId);
              const label = tabMeta?.title?.trim();
              targets.push({
                targetUrl: urlIn?.value ?? "",
                ...label ? { label } : {}
              });
            } else {
              const mkAttr = tr.getAttribute("data-global-edit-member-key") ?? "";
              const urlIn = tr.querySelector("[data-global-edit-target-url]");
              const prev = mkAttr !== "" ? existing.targets.find((x) => memberKeyFromTargetUrl(x.targetUrl) === mkAttr) : void 0;
              targets.push({
                targetUrl: urlIn?.value ?? "",
                ...prev?.label ? { label: prev.label } : {}
              });
            }
          }
          const patternsField = row.querySelector("[data-global-edit-url-patterns]")?.value ?? "";
          const patternsRaw = mergeDistinctPatternLines(patternsField, extraPatternUrls);
          const built = buildGlobalGroupUpdateFromForm(
            {
              name,
              baseIntervalSec: interval,
              jitterSec: jitter,
              targets,
              urlPatternsRaw: patternsRaw
            },
            existing
          );
          if (!built.ok) {
            if (errEl) {
              errEl.textContent = built.error;
            }
            return;
          }
          const enroll = await validateGlobalGroupResolvedEnrollment(state, built.value, existing.id);
          if (!enroll.ok) {
            if (errEl) {
              errEl.textContent = enroll.error;
            }
            return;
          }
          const next = replaceGlobalGroup(state, built.value);
          try {
            await saveAppState(next);
          } catch (err3) {
            if (errEl) {
              errEl.textContent = err3 instanceof Error ? err3.message : String(err3);
            }
            return;
          }
          await renderGlobalGroupsList(ctx);
          await refreshIndividualJobs(ctx);
        })();
      }
    });
    if (globalGroupsList.dataset.globalEditTabPickBound !== "1") {
      globalGroupsList.dataset.globalEditTabPickBound = "1";
      globalGroupsList.addEventListener("change", (e) => {
        const sel = e.target;
        if (!(sel instanceof HTMLSelectElement) || !sel.matches("[data-global-edit-pick-tab]")) {
          return;
        }
        const tr = sel.closest("[data-global-edit-target-row]");
        const groupRow = sel.closest("[data-global-group-row]");
        if (!tr || !groupRow) {
          return;
        }
        const urlIn = tr.querySelector("[data-global-edit-target-url]");
        if (!urlIn) {
          return;
        }
        const tabId = Number(sel.value);
        if (!Number.isInteger(tabId) || tabId < 1) {
          urlIn.value = "";
          return;
        }
        const tab = individualTabCache.tabs.find((x) => x.id === tabId);
        if (tab) {
          urlIn.value = defaultTargetUrlForTab(tab.url ?? "");
        } else {
          void chrome.tabs.get(tabId).then((ct) => {
            if (sel.value !== String(tabId) || !urlIn) {
              return;
            }
            urlIn.value = defaultTargetUrlForTab(ct.url ?? "");
          });
        }
        for (const other of groupRow.querySelectorAll(
          "[data-global-edit-pick-tab]"
        )) {
          if (other !== sel) {
            populateGlobalEditNewTabSelect(other, groupRow, individualTabCache);
          }
        }
      });
    }
  }
  function bindGlobalTabBrowserUi(ctx) {
    const { globalRefreshTabs, globalTabSearch } = ctx.dom;
    if (globalRefreshTabs) {
      globalRefreshTabs.addEventListener("click", () => void renderGlobalTabBrowser(ctx));
    }
    if (globalTabSearch && globalTabSearch.dataset.filterBound !== "1") {
      globalTabSearch.dataset.filterBound = "1";
      globalTabSearch.addEventListener("input", () => applyGlobalTabSearchFilter(ctx));
    }
  }
  function bindGlobalGroupForm(ctx, refreshIndividualJobs) {
    const {
      globalGroupForm,
      globalGroupName,
      globalTabBrowser,
      globalIntervalInput,
      globalJitterInput,
      globalUrlPatterns,
      globalFormError
    } = ctx.dom;
    if (!globalGroupForm || !globalGroupName || !globalTabBrowser || !globalIntervalInput || !globalJitterInput) {
      return;
    }
    globalGroupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      void (async () => {
        if (globalFormError) {
          globalFormError.textContent = "";
        }
        const targets = [];
        for (const li of globalTabBrowser.querySelectorAll("[data-global-tab-row]")) {
          const checked = li.querySelector("[data-global-tab-include]")?.checked;
          if (!checked) {
            continue;
          }
          const targetUrl = li.querySelector("[data-global-target-url]")?.value ?? "";
          const label = li.querySelector("[data-global-tab-title]")?.textContent?.trim();
          targets.push({
            targetUrl,
            ...label ? { label } : {}
          });
        }
        const built = buildGlobalGroupFromForm({
          name: globalGroupName.value,
          baseIntervalSec: Number(globalIntervalInput.value),
          jitterSec: Number(globalJitterInput.value),
          targets,
          urlPatternsRaw: globalUrlPatterns?.value
        });
        if (!built.ok) {
          if (globalFormError) {
            globalFormError.textContent = built.error;
          }
          return;
        }
        const state = await loadAppState();
        const enroll = await validateGlobalGroupResolvedEnrollment(state, built.value);
        if (!enroll.ok) {
          if (globalFormError) {
            globalFormError.textContent = enroll.error;
          }
          return;
        }
        const next = { ...state, globalGroups: [...state.globalGroups, built.value] };
        try {
          await saveAppState(next);
        } catch (err3) {
          if (globalFormError) {
            globalFormError.textContent = err3 instanceof Error ? err3.message : String(err3);
          }
          return;
        }
        globalGroupName.value = "";
        if (globalUrlPatterns) {
          globalUrlPatterns.value = "";
        }
        await renderGlobalGroupsList(ctx);
        await refreshIndividualJobs(ctx);
      })();
    });
  }

  // src/lib/individual-job-form.ts
  function parseBlipFields(phrasesText, regexRaw) {
    const phrases = normalizeBlipPhrasesFromTextarea(phrasesText);
    const rx = regexRaw?.trim() ?? "";
    if (phrases.length === 0 && !rx) {
      return { ok: true, value: {} };
    }
    if (rx && !compileBlipRegex(rx)) {
      return { ok: false, error: "Invalid blip regex pattern" };
    }
    const out = {};
    if (phrases.length > 0) {
      out.blipWatchPhrases = phrases;
    }
    if (rx) {
      out.blipWatchRegex = rx.slice(0, BLIP_MAX_REGEX_LEN);
    }
    return { ok: true, value: out };
  }
  function buildIndividualJobFromForm(input, newId = () => crypto.randomUUID()) {
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
    const liveAware = Boolean(input.liveAwareRefresh);
    const blip = parseBlipFields(input.blipWatchPhrasesText, input.blipWatchRegex);
    if (!blip.ok) {
      return blip;
    }
    return {
      ok: true,
      value: {
        id: newId(),
        target: {
          targetUrl: url.value
        },
        baseIntervalSec: interval.value,
        jitterSec: jitter.value,
        enabled: true,
        ...liveAware ? { liveAwareRefresh: true } : {},
        ...blip.value
      }
    };
  }
  function buildIndividualJobUpdateFromForm(input, existing) {
    const base = buildIndividualJobFromForm(
      {
        targetUrl: input.targetUrl,
        baseIntervalSec: input.baseIntervalSec,
        jitterSec: input.jitterSec,
        liveAwareRefresh: input.liveAwareRefresh,
        blipWatchPhrasesText: input.blipWatchPhrasesText,
        blipWatchRegex: input.blipWatchRegex
      },
      () => existing.id
    );
    if (!base.ok) {
      return base;
    }
    const liveAware = Boolean(input.liveAwareRefresh);
    const value = {
      id: base.value.id,
      target: base.value.target,
      baseIntervalSec: base.value.baseIntervalSec,
      jitterSec: base.value.jitterSec,
      enabled: existing.enabled,
      nextFireAt: existing.nextFireAt
    };
    if (liveAware) {
      value.liveAwareRefresh = true;
      value.streamLive = existing.streamLive;
    }
    const ph = base.value.blipWatchPhrases;
    const rx = base.value.blipWatchRegex;
    if ((ph?.length ?? 0) > 0 || rx) {
      if (ph?.length) {
        value.blipWatchPhrases = ph;
      }
      if (rx) {
        value.blipWatchRegex = rx;
      }
      if (existing.blipMaxPerMinute !== void 0) {
        value.blipMaxPerMinute = existing.blipMaxPerMinute;
      }
    }
    return { ok: true, value };
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
    const liveHint = j.liveAwareRefresh ? " \xB7 Twitch live-aware" : "";
    const blipHint = (j.blipWatchPhrases?.length ?? 0) > 0 || j.blipWatchRegex?.trim() ? " \xB7 blip watch" : "";
    summaryLine.textContent = `${j.target.targetUrl} \xB7 every ${j.baseIntervalSec}s \xB1${j.jitterSec}s${liveHint}${blipHint}`;
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
    const liveLab = document.createElement("label");
    liveLab.style.cssText = "display: flex; align-items: flex-start; gap: 0.35rem; font-size: 0.85rem; cursor: pointer";
    const liveCb = document.createElement("input");
    liveCb.type = "checkbox";
    liveCb.setAttribute("data-job-edit-live-aware", "");
    liveCb.checked = j.liveAwareRefresh === true;
    liveLab.appendChild(liveCb);
    const liveSpan = document.createElement("span");
    liveSpan.innerHTML = "Pause refresh while this channel is <strong>live</strong> on Twitch (channel page only; best-effort detection).";
    liveLab.appendChild(liveSpan);
    const blipLab = document.createElement("label");
    blipLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    blipLab.innerHTML = "<span>Blip phrases (optional, one per line)</span>";
    const blipTa = document.createElement("textarea");
    blipTa.setAttribute("data-job-edit-blip-phrases", "");
    blipTa.rows = 3;
    blipTa.autocomplete = "off";
    blipTa.value = (j.blipWatchPhrases ?? []).join("\n");
    blipTa.style.cssText = "padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid #5f6368; background: #202124; color: #e8eaed; resize: vertical; min-height: 3.5rem";
    blipLab.appendChild(blipTa);
    const blipRxLab = document.createElement("label");
    blipRxLab.style.cssText = "display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem";
    blipRxLab.innerHTML = "<span>Blip regex (optional, case-insensitive)</span>";
    const blipRx = document.createElement("input");
    blipRx.type = "text";
    blipRx.setAttribute("data-job-edit-blip-regex", "");
    blipRx.value = j.blipWatchRegex ?? "";
    blipRx.autocomplete = "off";
    blipRx.style.cssText = urlEdit.style.cssText;
    blipRxLab.appendChild(blipRx);
    const editErr = document.createElement("p");
    editErr.setAttribute("data-job-edit-error", "");
    editErr.style.cssText = "color: #f28b82; margin: 0; min-height: 1rem; font-size: 0.8rem";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.setAttribute("data-job-edit-save", "");
    saveBtn.textContent = "Save changes";
    saveBtn.style.cssText = `${primaryBtnStyle2()} align-self: flex-start`;
    editWrap.append(urlLab, intLab, jitLab, liveLab, blipLab, blipRxLab, editErr, saveBtn);
    details.appendChild(editWrap);
    li.appendChild(details);
    return li;
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
          return {
            ...j,
            enabled: false,
            nextFireAt: void 0,
            streamLive: void 0,
            overlayPaused: void 0
          };
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

  // src/dashboard/dashboard-individual-jobs.ts
  function individualJobRowSelectorFragment(jobId) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(jobId);
    }
    return jobId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  async function renderIndividualJobs(ctx) {
    const { individualSectionHeading, jobsList } = ctx.dom;
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
  function tickIndividualJobCountdowns(jobsList, jobs, now) {
    if (!jobsList) {
      return;
    }
    for (const job of jobs) {
      const row = jobsList.querySelector(
        `[data-individual-job-row="${individualJobRowSelectorFragment(job.id)}"]`
      );
      const el = row?.querySelector("[data-job-countdown]");
      if (el) {
        el.textContent = formatIndividualJobCountdown(now, job);
      }
    }
  }
  function bindJobsListEvents(ctx) {
    const { jobsList } = ctx.dom;
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
          } catch (err3) {
            console.error(err3);
          }
          await renderIndividualJobs(ctx);
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
          } catch (err3) {
            if (rowErr) {
              rowErr.textContent = err3 instanceof Error ? err3.message : String(err3);
            } else {
              console.error(err3);
            }
            return;
          }
          await renderIndividualJobs(ctx);
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
          const interval = Number(
            row.querySelector("[data-job-edit-interval]")?.value
          );
          const jitter = Number(row.querySelector("[data-job-edit-jitter]")?.value);
          const liveAware = row.querySelector("[data-job-edit-live-aware]")?.checked === true;
          const blipPhrases = row.querySelector(
            "[data-job-edit-blip-phrases]"
          )?.value;
          const blipRegex = row.querySelector("[data-job-edit-blip-regex]")?.value;
          const built = buildIndividualJobUpdateFromForm(
            {
              targetUrl: url,
              baseIntervalSec: interval,
              jitterSec: jitter,
              liveAwareRefresh: liveAware,
              blipWatchPhrasesText: blipPhrases,
              blipWatchRegex: blipRegex
            },
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
          } catch (err3) {
            if (errEl) {
              errEl.textContent = err3 instanceof Error ? err3.message : String(err3);
            }
            return;
          }
          await renderIndividualJobs(ctx);
        })();
      }
    });
  }
  function bindAddIndividualJobForm(ctx) {
    const {
      addJobForm,
      tabSelect,
      urlInput,
      intervalInput,
      jitterInput,
      liveAwareInput,
      blipPhrasesAdd,
      blipRegexAdd,
      addJobError
    } = ctx.dom;
    if (!addJobForm || !tabSelect || !urlInput || !intervalInput || !jitterInput) {
      return;
    }
    addJobForm.addEventListener("submit", (e) => {
      e.preventDefault();
      void (async () => {
        if (addJobError) {
          addJobError.textContent = "";
        }
        const built = buildIndividualJobFromForm({
          targetUrl: urlInput.value,
          baseIntervalSec: Number(intervalInput.value),
          jitterSec: Number(jitterInput.value),
          liveAwareRefresh: liveAwareInput?.checked === true,
          blipWatchPhrasesText: blipPhrasesAdd?.value,
          blipWatchRegex: blipRegexAdd?.value
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
        } catch (err3) {
          if (addJobError) {
            addJobError.textContent = err3 instanceof Error ? err3.message : String(err3);
          }
          return;
        }
        await renderIndividualJobs(ctx);
      })();
    });
  }

  // src/lib/precision-volume-gain.ts
  var PV_MAX_GAIN_LINEAR = 16;
  var STEP_DB = 2;
  var STEP_RATIO = 10 ** (STEP_DB / 20);
  function clampSignedLinearGain(g) {
    if (!Number.isFinite(g)) {
      return 0;
    }
    if (g < -PV_MAX_GAIN_LINEAR) {
      return -PV_MAX_GAIN_LINEAR;
    }
    if (g > PV_MAX_GAIN_LINEAR) {
      return PV_MAX_GAIN_LINEAR;
    }
    return g;
  }

  // src/lib/precision-volume-fader.ts
  var PV_FADER_LOW_REGION_END_GAIN = 0.2;
  var HALF = 0.5;
  function clampUnit(p) {
    if (!Number.isFinite(p)) {
      return 0;
    }
    if (p <= 0) {
      return 0;
    }
    if (p >= 1) {
      return 1;
    }
    return p;
  }
  function linearGainFromFaderPosition(position) {
    const pos = clampUnit(position);
    if (pos <= HALF) {
      return pos / HALF * PV_FADER_LOW_REGION_END_GAIN;
    }
    const u = (pos - HALF) / HALF;
    return PV_FADER_LOW_REGION_END_GAIN + u * (PV_MAX_GAIN_LINEAR - PV_FADER_LOW_REGION_END_GAIN);
  }
  function faderPositionFromLinearGain(linearGain) {
    const g = Math.max(0, Number.isFinite(linearGain) ? linearGain : 0);
    if (g <= PV_FADER_LOW_REGION_END_GAIN) {
      return HALF * (g / PV_FADER_LOW_REGION_END_GAIN);
    }
    const span = PV_MAX_GAIN_LINEAR - PV_FADER_LOW_REGION_END_GAIN;
    if (span <= 0) {
      return 1;
    }
    return HALF + HALF * Math.min(1, (g - PV_FADER_LOW_REGION_END_GAIN) / span);
  }
  function faderValueToPosition(value) {
    return clampUnit(value / 1e4);
  }
  function linearGainToFaderValue(linearGain) {
    return Math.round(faderPositionFromLinearGain(linearGain) * 1e4);
  }
  function faderValueToLinearGain(value) {
    return linearGainFromFaderPosition(faderValueToPosition(value));
  }
  function applyShiftFineFaderPosition(previousPosition, rawPointerPosition, shiftHeld) {
    const raw = clampUnit(rawPointerPosition);
    const prev = clampUnit(previousPosition);
    if (!shiftHeld) {
      return raw;
    }
    return clampUnit(prev + (raw - prev) * 0.1);
  }
  function percentToLinearGain(percent) {
    if (!Number.isFinite(percent)) {
      return 0;
    }
    return percent / 100;
  }
  function linearGainToPercent(linearGain) {
    if (!Number.isFinite(linearGain)) {
      return 0;
    }
    return linearGain * 100;
  }
  function parsePercentInput(raw) {
    const s = raw.trim();
    if (s === "") {
      return null;
    }
    const n = Number(s);
    if (!Number.isFinite(n)) {
      return null;
    }
    return n;
  }
  function formatPercentInput(percent) {
    if (!Number.isFinite(percent)) {
      return "";
    }
    const rounded = Math.round(percent * 1e3) / 1e3;
    if (Object.is(rounded, -0)) {
      return "0";
    }
    return String(rounded);
  }

  // src/lib/extension-runtime-send.ts
  function extensionRuntimeContextLikelyAlive() {
    return typeof chrome !== "undefined" && typeof chrome.runtime !== "undefined" && !!chrome.runtime.id;
  }
  async function sendExtensionMessageAsync(message) {
    if (!extensionRuntimeContextLikelyAlive()) {
      return void 0;
    }
    try {
      return await chrome.runtime.sendMessage(message);
    } catch {
      return void 0;
    }
  }

  // src/lib/overlay-position.ts
  var DEFAULT_OVERLAY_POSITION = { anchor: "right" };
  function parseOverlayPosition(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ...DEFAULT_OVERLAY_POSITION };
    }
    const o = raw;
    const anchor = o.anchor === "left" ? "left" : "right";
    let dragTop;
    let dragLeft;
    if (typeof o.dragTop === "number" && Number.isFinite(o.dragTop)) {
      dragTop = o.dragTop;
    }
    if (typeof o.dragLeft === "number" && Number.isFinite(o.dragLeft)) {
      dragLeft = o.dragLeft;
    }
    if (dragTop !== void 0 && dragLeft !== void 0) {
      return { anchor, dragTop, dragLeft };
    }
    return { anchor };
  }

  // src/lib/prefs.ts
  var PREFS_STORAGE_KEY = "urlAutoRefresher_prefs_v1";
  var DEFAULT_PRECISION_VOLUME = {
    lastTabId: null,
    /** Unity gain when unset — no change to page audio until the user moves the fader. */
    lastLinearGain: 1
  };
  var DEFAULT_PREFS = {
    showPageOverlayTimer: true,
    showOverlaySnapBackDebug: true,
    twitchWatchLayoutEnabled: true,
    precisionVolume: { ...DEFAULT_PRECISION_VOLUME },
    overlayPosition: { ...DEFAULT_OVERLAY_POSITION }
  };
  function parsePrecisionVolumePrefs(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ...DEFAULT_PRECISION_VOLUME };
    }
    const o = raw;
    let lastTabId = DEFAULT_PRECISION_VOLUME.lastTabId;
    const tid = o.lastTabId;
    if (tid === null) {
      lastTabId = null;
    } else if (typeof tid === "number" && Number.isInteger(tid) && tid >= 0) {
      lastTabId = tid;
    }
    let lastLinearGain = DEFAULT_PRECISION_VOLUME.lastLinearGain;
    if (typeof o.lastLinearGain === "number" && Number.isFinite(o.lastLinearGain)) {
      lastLinearGain = o.lastLinearGain;
    }
    return { lastTabId, lastLinearGain };
  }
  function parsePrefs(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ...DEFAULT_PREFS, precisionVolume: { ...DEFAULT_PRECISION_VOLUME } };
    }
    const o = raw;
    const show = typeof o.showPageOverlayTimer === "boolean" ? o.showPageOverlayTimer : DEFAULT_PREFS.showPageOverlayTimer;
    const showDebug = typeof o.showOverlaySnapBackDebug === "boolean" ? o.showOverlaySnapBackDebug : DEFAULT_PREFS.showOverlaySnapBackDebug;
    const watchLayout = typeof o.twitchWatchLayoutEnabled === "boolean" ? o.twitchWatchLayoutEnabled : DEFAULT_PREFS.twitchWatchLayoutEnabled;
    return {
      showPageOverlayTimer: show,
      showOverlaySnapBackDebug: showDebug,
      twitchWatchLayoutEnabled: watchLayout,
      precisionVolume: parsePrecisionVolumePrefs(o.precisionVolume),
      overlayPosition: parseOverlayPosition(o.overlayPosition)
    };
  }
  async function loadExtensionPrefs() {
    const data = await chrome.storage.local.get(PREFS_STORAGE_KEY);
    const raw = data[PREFS_STORAGE_KEY];
    return parsePrefs(raw);
  }
  async function saveExtensionPrefs(partial) {
    const existing = await loadExtensionPrefs();
    const next = {
      showPageOverlayTimer: partial.showPageOverlayTimer ?? existing.showPageOverlayTimer,
      showOverlaySnapBackDebug: partial.showOverlaySnapBackDebug ?? existing.showOverlaySnapBackDebug,
      twitchWatchLayoutEnabled: partial.twitchWatchLayoutEnabled ?? existing.twitchWatchLayoutEnabled,
      precisionVolume: {
        ...existing.precisionVolume,
        ...partial.precisionVolume ?? {}
      },
      overlayPosition: partial.overlayPosition ?? existing.overlayPosition
    };
    await chrome.storage.local.set({ [PREFS_STORAGE_KEY]: next });
  }

  // src/lib/messages.ts
  var PRECISION_VOLUME_TAB_REQUEST = "urlAutoRefresher:precisionVolumeTabRequest";

  // src/lib/precision-volume-tab-client.ts
  async function sendPrecisionVolumeTabRequest(tabId, apply) {
    const msg = {
      type: PRECISION_VOLUME_TAB_REQUEST,
      tabId,
      ...apply
    };
    return sendExtensionMessageAsync(msg);
  }

  // src/lib/precision-volume-target-tab.ts
  async function resolvePrecisionVolumeTargetTabId(explicitTabId) {
    if (explicitTabId !== null) {
      return explicitTabId;
    }
    return resolvePreferredPinTabId();
  }

  // src/dashboard/dashboard-precision-volume.ts
  var precisionVolumeController = null;
  var ACTIVE_TAB_OPTION = '<option value="">Active tab (focused window)</option>';
  function readExplicitTabIdFromSelect(select) {
    const raw = select.value;
    if (raw === "") {
      return null;
    }
    const id = Number(raw);
    return Number.isInteger(id) && id >= 0 ? id : null;
  }
  async function updatePrecisionVolumeApplyHint(ctx) {
    const hint = ctx.dom.precisionVolumeApplyHint;
    if (!hint || !precisionVolumeController) {
      return;
    }
    const explicit = precisionVolumeController.readExplicitTabId();
    const target = await resolvePrecisionVolumeTargetTabId(explicit);
    hint.style.display = target === void 0 ? "block" : "none";
  }
  async function restorePrecisionVolumeAfterTabListReady(ctx) {
    const ctrl = precisionVolumeController;
    const { precisionVolumeTabSelect } = ctx.dom;
    if (!ctrl || !precisionVolumeTabSelect) {
      return;
    }
    const p = await loadExtensionPrefs();
    const pv = p.precisionVolume;
    ctrl.syncControlsFromLinearGain(pv.lastLinearGain);
    if (pv.lastTabId !== null) {
      const idStr = String(pv.lastTabId);
      if ([...precisionVolumeTabSelect.options].some((o) => o.value === idStr)) {
        precisionVolumeTabSelect.value = idStr;
      }
    }
    await ctrl.refreshApplyHint();
    ctrl.applyToTargetTab(pv.lastLinearGain);
  }
  function applyPrecisionVolumeTabSelectFilter(ctx, cache) {
    const { precisionVolumeTabSelect, precisionVolumeTabSearch } = ctx.dom;
    if (!precisionVolumeTabSelect) {
      return;
    }
    const q = (precisionVolumeTabSearch?.value ?? "").trim().toLowerCase();
    const prev = precisionVolumeTabSelect.value;
    precisionVolumeTabSelect.innerHTML = ACTIVE_TAB_OPTION;
    for (const t of cache.tabs) {
      const label = t.title?.trim() || t.url || `Tab ${t.id}`;
      const url = t.url ?? "";
      const hay = `${label} (${t.id}) ${url}`.toLowerCase();
      if (q !== "" && !hay.includes(q)) {
        continue;
      }
      const opt = document.createElement("option");
      opt.value = String(t.id);
      opt.textContent = `${label} (${t.id})`;
      precisionVolumeTabSelect.appendChild(opt);
    }
    const stillValid = prev !== "" && [...precisionVolumeTabSelect.options].some((o) => o.value === prev);
    precisionVolumeTabSelect.value = stillValid ? prev : "";
  }
  async function populatePrecisionVolumeTabSelect(ctx, cache) {
    await refreshIndividualTabPickerCache(cache);
    applyIndividualTabSelectFilter(ctx, cache);
    applyPrecisionVolumeTabSelectFilter(ctx, cache);
    await restorePrecisionVolumeAfterTabListReady(ctx);
  }
  function updatePhaseLabel(ctx, linearGain) {
    const el = ctx.dom.precisionVolumePhaseLabel;
    if (!el) {
      return;
    }
    el.style.display = linearGain < 0 ? "block" : "none";
  }
  function bindPrecisionVolumeUi(ctx, cache) {
    const {
      precisionVolumeTabSelect,
      precisionVolumeTabSearch,
      precisionVolumeTabRefresh,
      precisionVolumeFader,
      precisionVolumeNumeric
    } = ctx.dom;
    if (!precisionVolumeFader || !precisionVolumeNumeric || !precisionVolumeTabSelect) {
      return;
    }
    let lastFaderPosition = faderValueToPosition(precisionVolumeFader.valueAsNumber);
    let currentLinearGain = clampSignedLinearGain(
      faderValueToLinearGain(precisionVolumeFader.valueAsNumber)
    );
    let applyTimer;
    let saveTimer;
    const readExplicitTabId = () => readExplicitTabIdFromSelect(precisionVolumeTabSelect);
    const scheduleApply = (linearGain) => {
      const g = clampSignedLinearGain(linearGain);
      window.clearTimeout(applyTimer);
      applyTimer = window.setTimeout(() => {
        void (async () => {
          const tabId = await resolvePrecisionVolumeTargetTabId(readExplicitTabId());
          if (tabId === void 0) {
            return;
          }
          await sendPrecisionVolumeTabRequest(tabId, { kind: "set-linear-gain", linearGain: g });
        })();
      }, 70);
    };
    const scheduleSave = (linearGain) => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        void saveExtensionPrefs({
          precisionVolume: {
            lastTabId: readExplicitTabId(),
            lastLinearGain: clampSignedLinearGain(linearGain)
          }
        });
      }, 450);
    };
    const syncControlsFromLinearGain = (linearGain) => {
      const g = clampSignedLinearGain(linearGain);
      currentLinearGain = g;
      precisionVolumeNumeric.value = formatPercentInput(linearGainToPercent(g));
      if (g >= 0) {
        const fv = linearGainToFaderValue(g);
        precisionVolumeFader.valueAsNumber = fv;
        lastFaderPosition = faderValueToPosition(fv);
      } else {
        precisionVolumeFader.valueAsNumber = 0;
        lastFaderPosition = 0;
      }
      updatePhaseLabel(ctx, g);
    };
    const refreshApplyHint = () => updatePrecisionVolumeApplyHint(ctx);
    precisionVolumeController = {
      readExplicitTabId,
      syncControlsFromLinearGain,
      applyToTargetTab: (linearGain) => {
        scheduleApply(linearGain);
      },
      refreshApplyHint
    };
    void refreshApplyHint();
    if (precisionVolumeTabSearch && precisionVolumeTabSearch.dataset.pvFilterBound !== "1") {
      precisionVolumeTabSearch.dataset.pvFilterBound = "1";
      precisionVolumeTabSearch.addEventListener(
        "input",
        () => applyPrecisionVolumeTabSelectFilter(ctx, cache)
      );
    }
    if (precisionVolumeTabRefresh) {
      precisionVolumeTabRefresh.addEventListener("click", () => {
        void populatePrecisionVolumeTabSelect(ctx, cache);
      });
    }
    precisionVolumeFader.addEventListener("pointerdown", () => {
      lastFaderPosition = faderValueToPosition(precisionVolumeFader.valueAsNumber);
    });
    precisionVolumeFader.addEventListener("input", (ev) => {
      const rawPos = faderValueToPosition(precisionVolumeFader.valueAsNumber);
      const shift = ev.shiftKey === true;
      const effectivePos = applyShiftFineFaderPosition(lastFaderPosition, rawPos, shift);
      lastFaderPosition = effectivePos;
      precisionVolumeFader.valueAsNumber = Math.round(effectivePos * 1e4);
      const g = linearGainFromFaderPosition(effectivePos);
      currentLinearGain = g;
      precisionVolumeNumeric.value = formatPercentInput(linearGainToPercent(g));
      updatePhaseLabel(ctx, g);
      scheduleApply(g);
      scheduleSave(g);
    });
    const applyNumeric = () => {
      const parsed = parsePercentInput(precisionVolumeNumeric.value);
      if (parsed === null) {
        precisionVolumeNumeric.value = formatPercentInput(linearGainToPercent(currentLinearGain));
        return;
      }
      const g = clampSignedLinearGain(percentToLinearGain(parsed));
      syncControlsFromLinearGain(g);
      scheduleApply(g);
      scheduleSave(g);
    };
    precisionVolumeNumeric.addEventListener("change", applyNumeric);
    precisionVolumeNumeric.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        applyNumeric();
      }
    });
    precisionVolumeTabSelect.addEventListener("change", () => {
      void (async () => {
        await refreshApplyHint();
        scheduleApply(currentLinearGain);
        scheduleSave(currentLinearGain);
      })();
    });
  }

  // src/dashboard/dashboard-shell.ts
  function createDashboardContext() {
    return {
      dom: {
        openSidePanel: document.querySelector("[data-open-side-panel]"),
        openDashboardInTab: document.querySelector("[data-open-in-tab]"),
        overlayPreference: document.querySelector("[data-pref-overlay]"),
        overlaySnapBackDebugPreference: document.querySelector(
          "[data-pref-overlay-debug]"
        ),
        twitchWatchLayoutPreference: document.querySelector(
          "[data-pref-twitch-watch-layout]"
        ),
        individualSectionHeading: document.querySelector(
          "[data-individual-section-heading]"
        ),
        jobsList: document.querySelector("[data-individual-jobs-list]"),
        addJobForm: document.querySelector("[data-add-individual-form]"),
        addJobError: document.querySelector("[data-add-job-error]"),
        tabSelect: document.querySelector("[data-job-tab]"),
        urlInput: document.querySelector("[data-job-target-url]"),
        intervalInput: document.querySelector("[data-job-interval]"),
        jitterInput: document.querySelector("[data-job-jitter]"),
        liveAwareInput: document.querySelector("[data-job-live-aware]"),
        blipPhrasesAdd: document.querySelector("[data-job-blip-phrases]"),
        blipRegexAdd: document.querySelector("[data-job-blip-regex]"),
        jobTabSearch: document.querySelector("[data-job-tab-search]"),
        jobTabRefresh: document.querySelector("[data-job-tab-refresh]"),
        globalSectionHeading: document.querySelector("[data-global-section-heading]"),
        globalGroupsList: document.querySelector("[data-global-groups-list]"),
        globalGroupForm: document.querySelector("[data-global-group-form]"),
        globalGroupName: document.querySelector("[data-global-group-name]"),
        globalTabBrowser: document.querySelector("[data-global-tab-browser]"),
        globalRefreshTabs: document.querySelector("[data-global-refresh-tabs]"),
        globalTabSearch: document.querySelector("[data-global-tab-search]"),
        globalIntervalInput: document.querySelector("[data-global-interval]"),
        globalJitterInput: document.querySelector("[data-global-jitter]"),
        globalUrlPatterns: document.querySelector("[data-global-url-patterns]"),
        globalTwitchFavsHint: document.querySelector("[data-global-twitch-favs-hint]"),
        globalFormError: document.querySelector("[data-global-form-error]"),
        precisionVolumeSection: document.querySelector(
          "[data-precision-volume-section]"
        ),
        precisionVolumeTabSelect: document.querySelector(
          "[data-precision-volume-tab]"
        ),
        precisionVolumeTabSearch: document.querySelector(
          "[data-precision-volume-tab-search]"
        ),
        precisionVolumeTabRefresh: document.querySelector(
          "[data-precision-volume-tab-refresh]"
        ),
        precisionVolumeFader: document.querySelector(
          "[data-precision-volume-fader]"
        ),
        precisionVolumeNumeric: document.querySelector(
          "[data-precision-volume-numeric]"
        ),
        precisionVolumePhaseLabel: document.querySelector(
          "[data-precision-volume-phase-label]"
        ),
        precisionVolumeApplyHint: document.querySelector(
          "[data-precision-volume-apply-hint]"
        )
      }
    };
  }
  function bindExtensionPreferences(ctx) {
    const overlayPref = ctx.dom.overlayPreference;
    const debugPref = ctx.dom.overlaySnapBackDebugPreference;
    const watchLayoutPref = ctx.dom.twitchWatchLayoutPreference;
    if (!overlayPref && !debugPref && !watchLayoutPref) {
      return;
    }
    void loadExtensionPrefs().then((p) => {
      if (overlayPref) {
        overlayPref.checked = p.showPageOverlayTimer;
      }
      if (debugPref) {
        debugPref.checked = p.showOverlaySnapBackDebug;
      }
      if (watchLayoutPref) {
        watchLayoutPref.checked = p.twitchWatchLayoutEnabled;
      }
    });
    overlayPref?.addEventListener("change", () => {
      void saveExtensionPrefs({ showPageOverlayTimer: overlayPref.checked });
    });
    debugPref?.addEventListener("change", () => {
      void saveExtensionPrefs({ showOverlaySnapBackDebug: debugPref.checked });
    });
    watchLayoutPref?.addEventListener("change", () => {
      void saveExtensionPrefs({ twitchWatchLayoutEnabled: watchLayoutPref.checked });
    });
  }
  function wireCrossSurfaceLinks(ctx) {
    const { openSidePanel, openDashboardInTab } = ctx.dom;
    if (openSidePanel) {
      openSidePanel.addEventListener("click", () => {
        void chrome.windows.getCurrent().then((w) => {
          if (w.id !== void 0) {
            void chrome.sidePanel.open({ windowId: w.id });
          }
        });
      });
    }
    if (openDashboardInTab) {
      openDashboardInTab.addEventListener("click", () => {
        void chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
      });
    }
  }

  // src/lib/app-state-list-layout.ts
  function individualJobsLayoutSignature(s) {
    return JSON.stringify(
      s.individualJobs.map((j) => ({
        id: j.id,
        target: j.target,
        baseIntervalSec: j.baseIntervalSec,
        jitterSec: j.jitterSec,
        enabled: j.enabled,
        liveAwareRefresh: j.liveAwareRefresh === true,
        blip: JSON.stringify({
          p: j.blipWatchPhrases ?? [],
          r: j.blipWatchRegex ?? "",
          m: j.blipMaxPerMinute ?? null
        })
      }))
    );
  }
  function globalGroupsLayoutSignature(s) {
    return JSON.stringify(
      s.globalGroups.map((g) => ({
        id: g.id,
        name: g.name,
        targets: g.targets,
        urlPatterns: g.urlPatterns ?? [],
        baseIntervalSec: g.baseIntervalSec,
        jitterSec: g.jitterSec,
        enabled: g.enabled
      }))
    );
  }
  function appStateListLayoutEqual(a, b) {
    if (a.schemaVersion !== b.schemaVersion) {
      return false;
    }
    return individualJobsLayoutSignature(a) === individualJobsLayoutSignature(b) && globalGroupsLayoutSignature(a) === globalGroupsLayoutSignature(b);
  }
  function onlyNonLayoutAppStateDiff(oldVal, newVal) {
    if (oldVal === void 0 || newVal === void 0) {
      return false;
    }
    const a = oldVal;
    const b = newVal;
    if (typeof a !== "object" || typeof b !== "object" || !Array.isArray(a.individualJobs) || !Array.isArray(b.individualJobs) || !Array.isArray(a.globalGroups) || !Array.isArray(b.globalGroups)) {
      return false;
    }
    return appStateListLayoutEqual(a, b);
  }

  // src/dashboard/dashboard-storage-sync.ts
  async function tickDashboardCountdowns(ctx) {
    const state = await loadAppState();
    const now = Date.now();
    tickIndividualJobCountdowns(ctx.dom.jobsList, state.individualJobs, now);
    tickGlobalGroupCountdowns(ctx.dom.globalGroupsList, state.globalGroups, now);
  }
  function wireDashboardStorageSync(ctx) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !(STORAGE_KEY in changes)) {
        return;
      }
      const ch = changes[STORAGE_KEY];
      if (onlyNonLayoutAppStateDiff(ch.oldValue, ch.newValue)) {
        void tickDashboardCountdowns(ctx);
        return;
      }
      void renderIndividualJobs(ctx);
      void renderGlobalGroupsList(ctx);
    });
    window.setInterval(() => void tickDashboardCountdowns(ctx), 1e3);
  }

  // src/dashboard/dashboard-app.ts
  function initDashboardApp() {
    const dashboardContext = createDashboardContext();
    const individualTabCache = createIndividualTabPickerCache();
    const title = document.querySelector("[data-app-title]");
    if (title) {
      title.textContent = chrome.runtime.getManifest().name;
    }
    bindExtensionPreferences(dashboardContext);
    wireDashboardStorageSync(dashboardContext);
    bindGlobalTwitchFavsHint(dashboardContext);
    bindJobsListEvents(dashboardContext);
    bindAddIndividualJobForm(dashboardContext);
    bindIndividualTabPickerUi(dashboardContext, individualTabCache, {
      afterTabListRefresh: () => applyPrecisionVolumeTabSelectFilter(dashboardContext, individualTabCache)
    });
    bindPrecisionVolumeUi(dashboardContext, individualTabCache);
    bindGlobalGroupsListEvents(dashboardContext, individualTabCache, renderIndividualJobs);
    bindGlobalTabBrowserUi(dashboardContext);
    bindGlobalGroupForm(dashboardContext, renderIndividualJobs);
    wireCrossSurfaceLinks(dashboardContext);
    void Promise.all([
      populateIndividualTabSelect(dashboardContext, individualTabCache),
      populatePrecisionVolumeTabSelect(dashboardContext, individualTabCache),
      renderGlobalTabBrowser(dashboardContext),
      renderGlobalGroupsList(dashboardContext)
    ]).then(() => renderIndividualJobs(dashboardContext));
  }

  // src/dashboard/dashboard.ts
  initDashboardApp();
})();
