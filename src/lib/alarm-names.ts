/** Namespaced alarm names for chrome.alarms (per extension). */

export const PREFIX_INDIVIDUAL = 'urlar:i:' as const;
export const PREFIX_GLOBAL = 'urlar:g:' as const;

export type ParsedAlarm =
  | { kind: 'individual'; id: string }
  | { kind: 'global'; id: string };

export function alarmNameIndividual(jobId: string): string {
  return `${PREFIX_INDIVIDUAL}${jobId}`;
}

export function alarmNameGlobal(groupId: string): string {
  return `${PREFIX_GLOBAL}${groupId}`;
}

export function parseAlarmName(name: string): ParsedAlarm | null {
  if (name.startsWith(PREFIX_INDIVIDUAL)) {
    const id = name.slice(PREFIX_INDIVIDUAL.length);
    return id ? { kind: 'individual', id } : null;
  }
  if (name.startsWith(PREFIX_GLOBAL)) {
    const id = name.slice(PREFIX_GLOBAL.length);
    return id ? { kind: 'global', id } : null;
  }
  return null;
}
