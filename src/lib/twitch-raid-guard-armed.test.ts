import { describe, expect, it } from 'vitest';
import { pageMatchesExplicitTarget } from './member-url';
import { isTwitchRaidGuardArmedForTab } from './twitch-raid-guard-armed';
import type { MemberSchedHint } from './sched-member-tab-hint';

const HOME_URL = 'https://www.twitch.tv/e2e_home';

function hint(overrides: Partial<MemberSchedHint> = {}): MemberSchedHint {
  return {
    groupId: 'g-tw',
    memberKey: 'twitch.tv/e2e_home',
    targetUrl: HOME_URL,
    tabId: 42,
    ...overrides,
  };
}

describe('isTwitchRaidGuardArmedForTab', () => {
  it('arms when tab is on TwitchFavs home channel with sched hint', () => {
    expect(
      isTwitchRaidGuardArmedForTab({
        tabUrl: HOME_URL,
        hint: hint(),
        groupEnabled: true,
        isTwitchFavsGroup: true,
      })
    ).toBe(true);
  });

  it('disarms when tab URL no longer matches home (detour)', () => {
    expect(
      isTwitchRaidGuardArmedForTab({
        tabUrl: 'https://www.twitch.tv/other?referrer=raid',
        hint: hint(),
        groupEnabled: true,
        isTwitchFavsGroup: true,
      })
    ).toBe(false);
  });

  it('disarms without sched hint', () => {
    expect(
      isTwitchRaidGuardArmedForTab({
        tabUrl: HOME_URL,
        hint: undefined,
        groupEnabled: true,
        isTwitchFavsGroup: true,
      })
    ).toBe(false);
  });

  it('disarms when group disabled or not TwitchFavs', () => {
    expect(
      isTwitchRaidGuardArmedForTab({
        tabUrl: HOME_URL,
        hint: hint(),
        groupEnabled: false,
        isTwitchFavsGroup: true,
      })
    ).toBe(false);
    expect(
      isTwitchRaidGuardArmedForTab({
        tabUrl: HOME_URL,
        hint: hint(),
        groupEnabled: true,
        isTwitchFavsGroup: false,
      })
    ).toBe(false);
  });

  it('matches home with trailing slash via pageMatchesExplicitTarget', () => {
    const h = hint();
    expect(pageMatchesExplicitTarget(`${HOME_URL}/`, h.targetUrl)).toBe(true);
    expect(
      isTwitchRaidGuardArmedForTab({
        tabUrl: `${HOME_URL}/`,
        hint: h,
        groupEnabled: true,
        isTwitchFavsGroup: true,
      })
    ).toBe(true);
  });
});
