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

let snapBackEventsByMemberKey: Record<string, SnapBackEvent> = {};
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
      const raw = (await session.get(SNAP_BACK_EVENTS_SESSION_KEY))[SNAP_BACK_EVENTS_SESSION_KEY];
      snapBackEventsByMemberKey = toSafeEventRecord(raw);
    } catch {
      snapBackEventsByMemberKey = {};
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
    });
  } catch {
    /* session storage can fail transiently; debug evidence is best effort */
  }
}

export async function noteSnapBackEvent(memberKey: string, event: SnapBackEvent): Promise<void> {
  await ensureHydrated();
  snapBackEventsByMemberKey[memberKey] = event;
  await persist();
}

export async function getLatestSnapBackEventForMember(
  memberKey: string
): Promise<SnapBackEvent | undefined> {
  await ensureHydrated();
  return snapBackEventsByMemberKey[memberKey];
}

export function clearSnapBackEventsForTests(): void {
  snapBackEventsByMemberKey = {};
  hydrated = true;
  hydratePromise = undefined;
}
