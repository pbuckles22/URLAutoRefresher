import type { IndividualJob } from './types';

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
    return '0:00';
  }
  const totalSec = Math.ceil(remain / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
