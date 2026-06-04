import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSchedTabHints,
  getSchedHintForTab,
  rememberSchedTabId,
  rehydrateSchedHintsFromSession,
  SCHED_MEMBER_HINTS_SESSION_KEY,
} from './sched-member-tab-hint';

describe('sched-member-tab-hint session rehydrate', () => {
  beforeEach(() => {
    clearSchedTabHints();
    global.chrome = global.chrome ?? {};
    global.chrome.storage = global.chrome.storage ?? {};
    global.chrome.storage.session = {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('rehydrates hints after service worker wake', async () => {
    const stored = {
      hints: [
        {
          groupId: 'g1',
          memberKey: 'twitch.tv/djsonnyd',
          targetUrl: 'https://www.twitch.tv/djsonnyd',
          tabId: 99,
        },
      ],
    };
    vi.mocked(chrome.storage.session.get).mockResolvedValue({
      [SCHED_MEMBER_HINTS_SESSION_KEY]: stored,
    });

    expect(getSchedHintForTab(99)).toBeUndefined();
    await rehydrateSchedHintsFromSession();
    expect(getSchedHintForTab(99)).toEqual(stored.hints[0]);
  });

  it('persists hints when remembered', async () => {
    rememberSchedTabId('g1', 'twitch.tv/a', 5, 'https://www.twitch.tv/a');
    await new Promise((r) => setTimeout(r, 120));
    expect(chrome.storage.session.set).toHaveBeenCalled();
  });
});
