/**
 * Lightweight session-scoped telemetry for confirmed snap-back events.
 * Used only for overlay debug evidence during manual UAT.
 */
export type SnapBackReason = 'raid-detour' | 'channel-detour';

export type SnapBackEvent = {
  atMs: number;
  tabId: number;
  fromUrl: string;
  toUrl: string;
  reason: SnapBackReason;
};

const SNAP_BACK_EVENTS_SESSION_KEY = 'urlAutoRefresher_snapBackEvents_v1';
const SNAP_BACK_COUNTS_SESSION_KEY = 'urlAutoRefresher_snapBackCounts_v1';

let snapBackEventsByMemberKey: Record<string, SnapBackEvent> = {};
let snapBackCountByMemberKey: Record<string, number> = {};
let hydrated = false;
let hydratePromise: Promise<void> | undefined;

function getSessionStorage(): chrome.storage.StorageArea | undefined {
  try {
    return chrome?.storage?.session;
  } catch {
    return undefined;
  }
}

function toSafeEventRecord(raw: unknown): Record<string, SnapBackEvent> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: Record<string, SnapBackEvent> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') {
      continue;
    }
    const event = v as Partial<SnapBackEvent>;
    if (
      typeof event.atMs === 'number' &&
      Number.isFinite(event.atMs) &&
      typeof event.tabId === 'number' &&
      Number.isFinite(event.tabId) &&
      typeof event.fromUrl === 'string' &&
      typeof event.toUrl === 'string' &&
      (event.reason === 'raid-detour' || event.reason === 'channel-detour')
    ) {
      out[k] = {
        atMs: event.atMs,
        tabId: event.tabId,
        fromUrl: event.fromUrl,
        toUrl: event.toUrl,
        reason: event.reason,
      };
    }
  }
  return out;
}

function toSafeCountRecord(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      out[k] = Math.floor(v);
    }
  }
  return out;
}

async function ensureHydrated(): Promise<void> {
  if (hydrated) {
    return;
  }
  if (hydratePromise) {
    return hydratePromise;
  }
  hydratePromise = (async () => {
    const session = getSessionStorage();
    if (!session) {
      hydrated = true;
      return;
    }
    try {
      const data = await session.get([SNAP_BACK_EVENTS_SESSION_KEY, SNAP_BACK_COUNTS_SESSION_KEY]);
      snapBackEventsByMemberKey = toSafeEventRecord(data[SNAP_BACK_EVENTS_SESSION_KEY]);
      snapBackCountByMemberKey = toSafeCountRecord(data[SNAP_BACK_COUNTS_SESSION_KEY]);
    } catch {
      snapBackEventsByMemberKey = {};
      snapBackCountByMemberKey = {};
    } finally {
      hydrated = true;
      hydratePromise = undefined;
    }
  })();
  return hydratePromise;
}

async function persist(): Promise<void> {
  const session = getSessionStorage();
  if (!session) {
    return;
  }
  try {
    await session.set({
      [SNAP_BACK_EVENTS_SESSION_KEY]: snapBackEventsByMemberKey,
      [SNAP_BACK_COUNTS_SESSION_KEY]: snapBackCountByMemberKey,
    });
  } catch {
    /* session storage can fail transiently; debug evidence is best effort */
  }
}

export async function noteSnapBackEvent(memberKey: string, event: SnapBackEvent): Promise<void> {
  await ensureHydrated();
  snapBackEventsByMemberKey[memberKey] = event;
  snapBackCountByMemberKey[memberKey] = (snapBackCountByMemberKey[memberKey] ?? 0) + 1;
  await persist();
}

export async function getSnapBackCountForMember(memberKey: string): Promise<number> {
  await ensureHydrated();
  return snapBackCountByMemberKey[memberKey] ?? 0;
}

export async function getLatestSnapBackEventForMember(
  memberKey: string
): Promise<SnapBackEvent | undefined> {
  await ensureHydrated();
  return snapBackEventsByMemberKey[memberKey];
}

export function clearSnapBackEventsForTests(): void {
  snapBackEventsByMemberKey = {};
  snapBackCountByMemberKey = {};
  hydrated = true;
  hydratePromise = undefined;
}
