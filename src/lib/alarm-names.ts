/** Namespaced alarm names for chrome.alarms (per extension). */

export const PREFIX_INDIVIDUAL = 'urlar:i:' as const;
/** Legacy: one alarm per global group (all tabs fired together). */
export const PREFIX_GLOBAL = 'urlar:g:' as const;
/** Per-tab alarm within a global group (independent jitter). */
export const PREFIX_GLOBAL_TAB = 'urlar:gt:' as const;

export type ParsedAlarm =
  | { kind: 'individual'; id: string }
  /** @deprecated */
  | { kind: 'global'; id: string }
  | { kind: 'globalTab'; groupId: string; tabId: number };

export function alarmNameIndividual(jobId: string): string {
  return `${PREFIX_INDIVIDUAL}${jobId}`;
}

/** @deprecated */
export function alarmNameGlobal(groupId: string): string {
  return `${PREFIX_GLOBAL}${groupId}`;
}

export function alarmNameGlobalTab(groupId: string, tabId: number): string {
  return `${PREFIX_GLOBAL_TAB}${groupId}:${tabId}`;
}

export function parseAlarmName(name: string): ParsedAlarm | null {
  if (name.startsWith(PREFIX_INDIVIDUAL)) {
    const id = name.slice(PREFIX_INDIVIDUAL.length);
    return id ? { kind: 'individual', id } : null;
  }
  if (name.startsWith(PREFIX_GLOBAL_TAB)) {
    const rest = name.slice(PREFIX_GLOBAL_TAB.length);
    const idx = rest.lastIndexOf(':');
    if (idx <= 0) {
      return null;
    }
    const groupId = rest.slice(0, idx);
    const tabId = Number(rest.slice(idx + 1));
    if (!groupId || !Number.isInteger(tabId) || tabId < 1) {
      return null;
    }
    return { kind: 'globalTab', groupId, tabId };
  }
  if (name.startsWith(PREFIX_GLOBAL)) {
    const id = name.slice(PREFIX_GLOBAL.length);
    return id ? { kind: 'global', id } : null;
  }
  return null;
}
