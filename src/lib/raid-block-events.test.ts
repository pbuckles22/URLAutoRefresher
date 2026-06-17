import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRaidBlockStatsForTests,
  getRaidBlockCountForMember,
  noteRaidBlockEvent,
} from './raid-block-events';

describe('raid-block-events', () => {
  beforeEach(() => {
    clearRaidBlockStatsForTests();
  });

  it('increments count per member key', async () => {
    const event = { atMs: 1_000, tabId: 7, pageUrl: 'https://www.twitch.tv/home' };
    await noteRaidBlockEvent('twitch.tv/home', event);
    await noteRaidBlockEvent('twitch.tv/home', { ...event, atMs: 60_000 });
    await expect(getRaidBlockCountForMember('twitch.tv/home')).resolves.toBe(2);
    await expect(getRaidBlockCountForMember('twitch.tv/other')).resolves.toBe(0);
  });

  it('dedupes rapid duplicate reports for the same member', async () => {
    const event = { atMs: 1_000, tabId: 7, pageUrl: 'https://www.twitch.tv/home' };
    await noteRaidBlockEvent('twitch.tv/home', event);
    await noteRaidBlockEvent('twitch.tv/home', { ...event, atMs: 1_500 });
    await noteRaidBlockEvent('twitch.tv/home', { ...event, atMs: 2_000 });
    await expect(getRaidBlockCountForMember('twitch.tv/home')).resolves.toBe(1);
  });
});
