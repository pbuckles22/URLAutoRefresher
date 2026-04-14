/**
 * DOM factory for one individual-job row (dashboard + future surfaces, Epic 3.3).
 */
import { formatIndividualJobCountdown } from './dashboard-countdown';
import type { IndividualJob } from './types';

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

/** Builds the <li> for one job; callers attach list-level event delegation. */
export function createIndividualJobListRow(j: IndividualJob, nowMs: number): HTMLLIElement {
  const li = document.createElement('li');
  li.setAttribute('data-individual-job-row', j.id);
  li.style.cssText = rowStyle();

  const top = document.createElement('div');
  top.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;';

  const summaryLine = document.createElement('span');
  summaryLine.textContent = `Tab ${j.target.tabId} → ${j.target.targetUrl} · every ${j.baseIntervalSec}s ±${j.jitterSec}s`;
  summaryLine.style.flex = '1 1 12rem';

  const countdown = document.createElement('span');
  countdown.setAttribute('data-job-countdown', '');
  countdown.textContent = formatIndividualJobCountdown(nowMs, j);
  countdown.style.cssText = 'font-variant-numeric: tabular-nums; min-width: 3.5rem; color: #9aa0a6';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.setAttribute('data-job-toggle', '');
  toggle.textContent = j.enabled ? 'Stop' : 'Start';
  toggle.style.cssText = btnStyle();

  const del = document.createElement('button');
  del.type = 'button';
  del.setAttribute('data-job-delete', '');
  del.textContent = 'Delete';
  del.style.cssText = dangerBtnStyle();

  top.append(summaryLine, countdown, toggle, del);
  li.appendChild(top);

  const details = document.createElement('details');
  details.style.marginTop = '0.5rem';

  const sum = document.createElement('summary');
  sum.textContent = 'Edit';
  sum.style.cursor = 'pointer';
  sum.style.color = '#8ab4f8';
  details.appendChild(sum);

  const editWrap = document.createElement('div');
  editWrap.style.cssText = 'display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.35rem; max-width: 28rem';

  const urlLab = document.createElement('label');
  urlLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  urlLab.innerHTML = '<span>Target URL</span>';
  const urlEdit = document.createElement('input');
  urlEdit.type = 'text';
  urlEdit.setAttribute('data-job-edit-url', '');
  urlEdit.value = j.target.targetUrl;
  urlEdit.autocomplete = 'off';
  urlEdit.style.cssText =
    'padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid #5f6368; background: #202124; color: #e8eaed';
  urlLab.appendChild(urlEdit);

  const intLab = document.createElement('label');
  intLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  intLab.innerHTML = '<span>Interval (seconds)</span>';
  const intEdit = document.createElement('input');
  intEdit.type = 'number';
  intEdit.min = '1';
  intEdit.step = '1';
  intEdit.setAttribute('data-job-edit-interval', '');
  intEdit.value = String(j.baseIntervalSec);
  intEdit.style.cssText = urlEdit.style.cssText;
  intLab.appendChild(intEdit);

  const jitLab = document.createElement('label');
  jitLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  jitLab.innerHTML = '<span>Jitter (seconds)</span>';
  const jitEdit = document.createElement('input');
  jitEdit.type = 'number';
  jitEdit.min = '0';
  jitEdit.step = '1';
  jitEdit.setAttribute('data-job-edit-jitter', '');
  jitEdit.value = String(j.jitterSec);
  jitEdit.style.cssText = urlEdit.style.cssText;
  jitLab.appendChild(jitEdit);

  const editErr = document.createElement('p');
  editErr.setAttribute('data-job-edit-error', '');
  editErr.style.cssText = 'color: #f28b82; margin: 0; min-height: 1rem; font-size: 0.8rem';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.setAttribute('data-job-edit-save', '');
  saveBtn.textContent = 'Save changes';
  saveBtn.style.cssText = `${primaryBtnStyle()} align-self: flex-start`;

  editWrap.append(urlLab, intLab, jitLab, editErr, saveBtn);
  details.appendChild(editWrap);
  li.appendChild(details);

  return li;
}
