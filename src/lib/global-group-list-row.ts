/**
 * DOM factory for one global-group row (dashboard — Epic 4.2).
 */
import { formatGlobalGroupCountdown } from './dashboard-countdown';
import type { GlobalGroup } from './types';

function rowStyle(): string {
  return 'list-style: none; margin: 0.75rem 0; padding: 0.75rem; border: 1px solid #5f6368; border-radius: 8px; background: #303134;';
}

function btnStyle(): string {
  return 'padding: 0.3rem 0.65rem; border-radius: 6px; border: 1px solid #5f6368; background: #3c4043; color: #e8eaed; cursor: pointer; font-size: 0.85rem';
}

function dangerBtnStyle(): string {
  return `${btnStyle()} border-color: #c5221f; color: #f28b82`;
}

function primaryBtnStyle(): string {
  return 'padding: 0.35rem 0.75rem; border-radius: 6px; border: none; background: #8ab4f8; color: #202124; font-weight: 600; cursor: pointer; font-size: 0.85rem';
}

function addMemberBtnStyle(): string {
  return `${btnStyle()} border-color: #137333; color: #81c995; background: #1e3a2f; font-weight: 600`;
}

const inputStyle =
  'padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid #5f6368; background: #202124; color: #e8eaed';

/** Builds the <li> for one global group; callers attach list-level event delegation. */
export function createGlobalGroupListRow(g: GlobalGroup, nowMs: number): HTMLLIElement {
  const li = document.createElement('li');
  li.setAttribute('data-global-group-row', g.id);
  li.style.cssText = rowStyle();

  const top = document.createElement('div');
  top.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;';

  const patCount = g.urlPatterns?.filter((p) => p.trim()).length ?? 0;
  const autoHint = patCount > 0 ? ` + ${patCount} URL pattern${patCount === 1 ? '' : 's'}` : '';

  const summaryLine = document.createElement('span');
  summaryLine.textContent = `${g.name} · ${g.targets.length} explicit${autoHint} · every ${g.baseIntervalSec}s ±${g.jitterSec}s`;
  summaryLine.style.flex = '1 1 12rem';

  const countdown = document.createElement('span');
  countdown.setAttribute('data-global-group-countdown', '');
  countdown.textContent = formatGlobalGroupCountdown(nowMs, g);
  countdown.style.cssText = 'font-variant-numeric: tabular-nums; min-width: 3.5rem; color: #9aa0a6';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.setAttribute('data-global-group-toggle', '');
  toggle.textContent = g.enabled ? 'Stop' : 'Start';
  toggle.style.cssText = btnStyle();

  const del = document.createElement('button');
  del.type = 'button';
  del.setAttribute('data-global-group-delete', '');
  del.textContent = 'Delete';
  del.style.cssText = dangerBtnStyle();

  top.append(summaryLine, countdown, toggle, del);
  li.appendChild(top);

  const rowErr = document.createElement('p');
  rowErr.setAttribute('data-global-group-row-error', '');
  rowErr.setAttribute('role', 'alert');
  rowErr.style.cssText = 'color: #f28b82; margin: 0.35rem 0 0; min-height: 0; font-size: 0.8rem';
  li.appendChild(rowErr);

  const details = document.createElement('details');
  details.style.marginTop = '0.5rem';

  const sum = document.createElement('summary');
  sum.textContent = 'Edit';
  sum.style.cursor = 'pointer';
  sum.style.color = '#8ab4f8';
  details.appendChild(sum);

  const editWrap = document.createElement('div');
  editWrap.style.cssText =
    'display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.35rem; max-width: 28rem';

  const nameLab = document.createElement('label');
  nameLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  nameLab.innerHTML = '<span>Group name</span>';
  const nameIn = document.createElement('input');
  nameIn.type = 'text';
  nameIn.setAttribute('data-global-edit-name', '');
  nameIn.value = g.name;
  nameIn.autocomplete = 'off';
  nameIn.style.cssText = inputStyle;
  nameLab.appendChild(nameIn);

  const intLab = document.createElement('label');
  intLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  intLab.innerHTML = '<span>Interval (seconds)</span>';
  const intEdit = document.createElement('input');
  intEdit.type = 'number';
  intEdit.min = '1';
  intEdit.step = '1';
  intEdit.setAttribute('data-global-edit-interval', '');
  intEdit.value = String(g.baseIntervalSec);
  intEdit.style.cssText = inputStyle;
  intLab.appendChild(intEdit);

  const jitLab = document.createElement('label');
  jitLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  jitLab.innerHTML = '<span>Jitter (seconds)</span>';
  const jitEdit = document.createElement('input');
  jitEdit.type = 'number';
  jitEdit.min = '0';
  jitEdit.step = '1';
  jitEdit.setAttribute('data-global-edit-jitter', '');
  jitEdit.value = String(g.jitterSec);
  jitEdit.style.cssText = inputStyle;
  jitLab.appendChild(jitEdit);

  const patLab = document.createElement('label');
  patLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  patLab.innerHTML = '<span>Auto-include URL patterns (optional)</span>';
  const patTa = document.createElement('textarea');
  patTa.rows = 3;
  patTa.setAttribute('data-global-edit-url-patterns', '');
  patTa.value = g.urlPatterns?.join('\n') ?? '';
  patTa.autocomplete = 'off';
  patTa.style.cssText = `${inputStyle}; resize: vertical; min-height: 3rem`;
  patLab.appendChild(patTa);

  editWrap.append(nameLab, intLab, jitLab, patLab);

  const membersHeader = document.createElement('div');
  membersHeader.style.cssText =
    'display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.35rem';
  const membersTitle = document.createElement('span');
  membersTitle.textContent = 'Member tabs';
  membersTitle.style.fontSize = '0.85rem';
  membersTitle.style.color = '#e8eaed';
  const addTabBtn = document.createElement('button');
  addTabBtn.type = 'button';
  addTabBtn.setAttribute('data-global-edit-add-target', '');
  addTabBtn.setAttribute('aria-label', 'Add tab to group');
  addTabBtn.textContent = '+';
  addTabBtn.title = 'Add tab to group';
  addTabBtn.style.cssText = addMemberBtnStyle();
  membersHeader.append(membersTitle, addTabBtn);

  const targetsContainer = document.createElement('div');
  targetsContainer.setAttribute('data-global-edit-targets', '');

  editWrap.append(membersHeader, targetsContainer);

  for (const t of g.targets) {
    appendGlobalEditExistingTargetRow(targetsContainer, t);
  }

  const editErr = document.createElement('p');
  editErr.setAttribute('data-global-edit-error', '');
  editErr.style.cssText = 'color: #f28b82; margin: 0; min-height: 1rem; font-size: 0.8rem';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.setAttribute('data-global-edit-save', '');
  saveBtn.textContent = 'Save changes';
  saveBtn.style.cssText = `${primaryBtnStyle()} align-self: flex-start`;

  editWrap.append(editErr, saveBtn);
  details.appendChild(editWrap);
  li.appendChild(details);

  return li;
}

/** One explicit member row in global group Edit (existing tab). */
export function appendGlobalEditExistingTargetRow(
  container: HTMLElement,
  t: { tabId: number; windowId: number; targetUrl: string; label?: string }
): void {
  const row = document.createElement('div');
  row.setAttribute('data-global-edit-target-row', '');
  row.setAttribute('data-global-edit-target-tab', String(t.tabId));
  row.setAttribute('data-window-id', String(t.windowId));
  row.style.cssText =
    'display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem; margin-top: 0.35rem';

  const lab = document.createElement('label');
  lab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; flex: 1 1 14rem';
  const cap = document.createElement('span');
  cap.textContent = t.label
    ? `Tab ${t.tabId} — ${t.label} · target URL`
    : `Tab ${t.tabId} — target URL`;
  lab.appendChild(cap);
  const urlIn = document.createElement('input');
  urlIn.type = 'text';
  urlIn.setAttribute('data-global-edit-target-url', '');
  urlIn.setAttribute('data-global-edit-target-tab', String(t.tabId));
  urlIn.value = t.targetUrl;
  urlIn.autocomplete = 'off';
  urlIn.style.cssText = inputStyle;
  lab.appendChild(urlIn);

  const rm = document.createElement('button');
  rm.type = 'button';
  rm.setAttribute('data-global-edit-remove-target', '');
  rm.setAttribute('aria-label', 'Remove tab from group');
  rm.textContent = '×';
  rm.title = 'Remove tab from group';
  rm.style.cssText = dangerBtnStyle();

  row.append(lab, rm);
  container.appendChild(row);
}

/** Appends a row to pick an open tab + target URL; returns the tab `<select>` to populate. */
export function appendGlobalEditNewTargetRow(container: HTMLElement): HTMLSelectElement {
  const row = document.createElement('div');
  row.setAttribute('data-global-edit-target-row', '');
  row.setAttribute('data-global-edit-new-target', '1');
  row.style.cssText =
    'display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem; margin-top: 0.35rem';

  const selLab = document.createElement('label');
  selLab.style.cssText =
    'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; flex: 1 1 12rem';
  selLab.innerHTML = '<span>Pick open tab</span>';
  const select = document.createElement('select');
  select.setAttribute('data-global-edit-pick-tab', '');
  select.style.cssText = `${inputStyle}; max-width: 100%`;
  select.innerHTML = '<option value="">Select a tab…</option>';
  selLab.appendChild(select);

  const urlLab = document.createElement('label');
  urlLab.style.cssText =
    'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; flex: 2 1 14rem';
  urlLab.innerHTML = '<span>Target URL</span>';
  const urlIn = document.createElement('input');
  urlIn.type = 'text';
  urlIn.setAttribute('data-global-edit-target-url', '');
  urlIn.placeholder = 'https://…';
  urlIn.autocomplete = 'off';
  urlIn.style.cssText = inputStyle;
  urlLab.appendChild(urlIn);

  const rm = document.createElement('button');
  rm.type = 'button';
  rm.setAttribute('data-global-edit-remove-target', '');
  rm.setAttribute('aria-label', 'Remove tab from group');
  rm.textContent = '×';
  rm.title = 'Remove tab from group';
  rm.style.cssText = dangerBtnStyle();

  row.append(selLab, urlLab, rm);
  container.appendChild(row);
  return select;
}
