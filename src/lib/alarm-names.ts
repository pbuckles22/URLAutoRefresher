/** Namespaced alarm names for chrome.alarms (per extension). */

export const PREFIX_INDIVIDUAL = 'urlar:i:' as const;
/** Legacy: one alarm per global group (all tabs fired together). */
export const PREFIX_GLOBAL = 'urlar:g:' as const;
/** Per-tab alarm within a global group (independent jitter) — pre–Epic 10.3 tab-id keys. */
export const PREFIX_GLOBAL_TAB = 'urlar:gt:' as const;
/** Per-member alarm — Epic 10.3 (`memberKey` payload, stable across tab id drift). */
export const PREFIX_GLOBAL_MEMBER = 'urlar:gm:' as const;

export type ParsedAlarm =
  | { kind: 'individual'; id: string }
  /** @deprecated */
  | { kind: 'global'; id: string }
  /** @deprecated Pre–10.3 */
  | { kind: 'globalTab'; groupId: string; tabId: number }
  | { kind: 'globalMember'; groupId: string; memberKey: string };

function base64UrlEncodeUtf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  /* globalThis supports MV3 SW + Vitest */
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeUtf8(seg: string): string | null {
  try {
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function alarmNameIndividual(jobId: string): string {
  return `${PREFIX_INDIVIDUAL}${jobId}`;
}

/** @deprecated */
export function alarmNameGlobal(groupId: string): string {
  return `${PREFIX_GLOBAL}${groupId}`;
}

/** @deprecated Prefer alarmNameGlobalMember (Epic 10.3). */
export function alarmNameGlobalTab(groupId: string, tabId: number): string {
  return `${PREFIX_GLOBAL_TAB}${groupId}:${tabId}`;
}

/** Alarm for one global-group member row (`memberKey` from `memberKeyFromTargetUrl`). */
export function alarmNameGlobalMember(groupId: string, memberKey: string): string {
  const payload = JSON.stringify({ g: groupId, m: memberKey });
  return `${PREFIX_GLOBAL_MEMBER}${base64UrlEncodeUtf8(payload)}`;
}

export function parseAlarmName(name: string): ParsedAlarm | null {
  if (name.startsWith(PREFIX_INDIVIDUAL)) {
    const id = name.slice(PREFIX_INDIVIDUAL.length);
    return id ? { kind: 'individual', id } : null;
  }
  if (name.startsWith(PREFIX_GLOBAL_MEMBER)) {
    const enc = name.slice(PREFIX_GLOBAL_MEMBER.length);
    const json = base64UrlDecodeUtf8(enc);
    if (!json) {
      return null;
    }
    try {
      const o = JSON.parse(json) as { g?: unknown; m?: unknown };
      if (typeof o.g === 'string' && typeof o.m === 'string' && o.g.length > 0 && o.m.length > 0) {
        return { kind: 'globalMember', groupId: o.g, memberKey: o.m };
      }
    } catch {
      return null;
    }
    return null;
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
