import type { GlobalGroup, IndividualJob } from './types';

/** Compact MM:SS-style label for the dashboard job list (Epic 3.2). */
export function formatIndividualJobCountdown(nowMs: number, job: IndividualJob): string {
  if (!job.enabled) {
    return '—';
  }
  if (job.nextFireAt === undefined) {
    return '…';
  }
  const remain = job.nextFireAt - nowMs;
  if (remain <= 0) {
    return job.liveAwareRefresh && job.streamLive === true ? 'live 0:00' : '0:00';
  }
  const totalSec = Math.ceil(remain / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const core = `${m}:${String(s).padStart(2, '0')}`;
  if (job.liveAwareRefresh && job.streamLive === true) {
    return `live ${core}`;
  }
  return core;
}

function formatRemainSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Shared countdown for one global group (Epic 4.2). Per-tab schedules → show range when they differ. */
export function formatGlobalGroupCountdown(nowMs: number, group: GlobalGroup): string {
  if (!group.enabled) {
    return '—';
  }
  const map = group.tabNextFireAt;
  if (map && Object.keys(map).length > 0) {
    const secList = Object.values(map).map((nf) => Math.ceil((nf - nowMs) / 1000));
    const minS = Math.min(...secList);
    const maxS = Math.max(...secList);
    if (minS <= 0 && maxS <= 0) {
      return '0:00';
    }
    const a = Math.max(0, minS);
    const b = Math.max(0, maxS);
    if (a === b) {
      return formatRemainSec(a);
    }
    return `${formatRemainSec(a)}–${formatRemainSec(b)}`;
  }
  if (group.nextFireAt === undefined) {
    return '…';
  }
  const remain = group.nextFireAt - nowMs;
  if (remain <= 0) {
    return '0:00';
  }
  const totalSec = Math.ceil(remain / 1000);
  return formatRemainSec(totalSec);
}
