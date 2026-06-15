/**
 * In-memory + session sched tab hints (MV3 worker rehydration after sleep).
 */

export type MemberSchedHint = {
  groupId: string;
  memberKey: string;
  targetUrl: string;
  tabId: number;
};

export const SCHED_MEMBER_HINTS_SESSION_KEY = 'urlAutoRefresher_schedMemberHints_v1';

const hintByMember = new Map<string, MemberSchedHint>();
const memberKeyByTabId = new Map<number, string>();

let rehydratedFromSession = false;
let rehydrateInFlight: Promise<void> | null = null;
let persistDebounce: ReturnType<typeof setTimeout> | undefined;

function hintKey(groupId: string, memberKey: string): string {
  return `${groupId}\t${memberKey}`;
}

function applyHintToMemory(h: MemberSchedHint): void {
  const key = hintKey(h.groupId, h.memberKey);
  const prev = hintByMember.get(key);
  if (prev !== undefined && prev.tabId !== h.tabId) {
    memberKeyByTabId.delete(prev.tabId);
  }
  hintByMember.set(key, h);
  memberKeyByTabId.set(h.tabId, key);
}

function schedulePersistSession(): void {
  clearTimeout(persistDebounce);
  persistDebounce = setTimeout(() => {
    persistDebounce = undefined;
    if (typeof chrome === 'undefined' || !chrome.storage?.session) {
      return;
    }
    void chrome.storage.session
      .set({
        [SCHED_MEMBER_HINTS_SESSION_KEY]: { hints: [...hintByMember.values()] },
      })
      .catch(() => {
        /* session storage may be unavailable in tests */
      });
  }, 80);
}

/** Load hints after service worker wake (no-op after first successful load). */
export async function rehydrateSchedHintsFromSession(): Promise<void> {
  if (rehydratedFromSession) {
    return;
  }
  if (rehydrateInFlight) {
    return rehydrateInFlight;
  }

  rehydrateInFlight = (async () => {
    try {
      const data = await chrome.storage.session.get(SCHED_MEMBER_HINTS_SESSION_KEY);
      const raw = data[SCHED_MEMBER_HINTS_SESSION_KEY as keyof typeof data] as
        | { hints?: MemberSchedHint[] }
        | undefined;
      for (const h of raw?.hints ?? []) {
        if (h.groupId && h.memberKey && h.targetUrl && h.tabId >= 1) {
          applyHintToMemory(h);
        }
      }
      rehydratedFromSession = true;
    } catch {
      rehydratedFromSession = false;
    } finally {
      rehydrateInFlight = null;
    }
  })();

  return rehydrateInFlight;
}

export function rememberSchedTabId(
  groupId: string,
  memberKey: string,
  tabId: number,
  targetUrl: string
): void {
  if (!groupId || !memberKey || tabId < 1 || !targetUrl.trim()) {
    return;
  }
  applyHintToMemory({
    groupId,
    memberKey,
    targetUrl: targetUrl.trim(),
    tabId,
  });
  schedulePersistSession();
}

export function getLastSchedTabId(groupId: string, memberKey: string): number | undefined {
  return hintByMember.get(hintKey(groupId, memberKey))?.tabId;
}

export function getSchedHintForTab(tabId: number): MemberSchedHint | undefined {
  const key = memberKeyByTabId.get(tabId);
  if (!key) {
    return undefined;
  }
  return hintByMember.get(key);
}

export function forgetSchedTabId(tabId: number): void {
  const key = memberKeyByTabId.get(tabId);
  if (!key) {
    return;
  }
  memberKeyByTabId.delete(tabId);
  const hint = hintByMember.get(key);
  if (hint?.tabId === tabId) {
    hintByMember.delete(key);
    schedulePersistSession();
  }
}

/** @internal test helper */
export function clearSchedTabHints(): void {
  hintByMember.clear();
  memberKeyByTabId.clear();
  rehydratedFromSession = false;
  rehydrateInFlight = null;
  clearTimeout(persistDebounce);
  persistDebounce = undefined;
}
