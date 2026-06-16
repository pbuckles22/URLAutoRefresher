/**
 * Session-scoped proactive raid-block counts (Epic 14 overlay UAT).
 */
export type RaidBlockEvent = {
  atMs: number;
  tabId: number;
  pageUrl: string;
};

export type RaidBlockMemberStats = {
  count: number;
  lastAtMs?: number;
};

const RAID_BLOCK_STATS_SESSION_KEY = 'urlAutoRefresher_raidBlockStats_v1';

let statsByMemberKey: Record<string, RaidBlockMemberStats> = {};
let hydrated = false;
let hydratePromise: Promise<void> | undefined;

function getSessionStorage(): chrome.storage.StorageArea | undefined {
  try {
    return chrome?.storage?.session;
  } catch {
    return undefined;
  }
}

function toSafeStatsRecord(raw: unknown): Record<string, RaidBlockMemberStats> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: Record<string, RaidBlockMemberStats> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') {
      continue;
    }
    const row = v as Partial<RaidBlockMemberStats>;
    if (typeof row.count !== 'number' || !Number.isFinite(row.count) || row.count < 0) {
      continue;
    }
    out[k] = {
      count: Math.floor(row.count),
      ...(typeof row.lastAtMs === 'number' && Number.isFinite(row.lastAtMs)
        ? { lastAtMs: row.lastAtMs }
        : {}),
    };
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
      const raw = (await session.get(RAID_BLOCK_STATS_SESSION_KEY))[RAID_BLOCK_STATS_SESSION_KEY];
      statsByMemberKey = toSafeStatsRecord(raw);
    } catch {
      statsByMemberKey = {};
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
      [RAID_BLOCK_STATS_SESSION_KEY]: statsByMemberKey,
    });
  } catch {
    /* best effort */
  }
}

export async function noteRaidBlockEvent(memberKey: string, event: RaidBlockEvent): Promise<void> {
  await ensureHydrated();
  const prev = statsByMemberKey[memberKey]?.count ?? 0;
  statsByMemberKey[memberKey] = {
    count: prev + 1,
    lastAtMs: event.atMs,
  };
  await persist();
}

export async function getRaidBlockCountForMember(memberKey: string): Promise<number> {
  await ensureHydrated();
  return statsByMemberKey[memberKey]?.count ?? 0;
}

export function clearRaidBlockStatsForTests(): void {
  statsByMemberKey = {};
  hydrated = true;
  hydratePromise = undefined;
}
