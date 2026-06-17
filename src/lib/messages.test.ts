import { describe, expect, it } from 'vitest';
import {
  BLIP_REFRESH_REQUEST,
  GLOBAL_GROUP_TAB_PAUSE,
  INDIVIDUAL_JOB_OVERLAY_PAUSE,
  PAGE_OVERLAY_GET_STATE,
  PRECISION_VOLUME_APPLY,
  PRECISION_VOLUME_TAB_REQUEST,
  TWITCH_LIVE_REPORT,
  TWITCH_RAID_GUARD_SYNC_REQUEST,
} from './messages';

/**
 * Contract tests: message string literals must stay stable for MV3 routing.
 */
describe('message type constants', () => {
  it('exports stable urlAutoRefresher-prefixed channels', () => {
    expect(PAGE_OVERLAY_GET_STATE).toBe('urlAutoRefresher:pageOverlayGetState');
    expect(BLIP_REFRESH_REQUEST).toBe('urlAutoRefresher:blipRefreshRequest');
    expect(GLOBAL_GROUP_TAB_PAUSE).toBe('urlAutoRefresher:globalGroupTabPause');
    expect(INDIVIDUAL_JOB_OVERLAY_PAUSE).toBe('urlAutoRefresher:individualJobOverlayPause');
    expect(TWITCH_LIVE_REPORT).toBe('urlAutoRefresher:twitchLiveReport');
    expect(TWITCH_RAID_GUARD_SYNC_REQUEST).toBe('urlAutoRefresher:twitchRaidGuardSyncRequest');
    expect(PRECISION_VOLUME_APPLY).toBe('urlAutoRefresher:precisionVolumeApply');
    expect(PRECISION_VOLUME_TAB_REQUEST).toBe('urlAutoRefresher:precisionVolumeTabRequest');
  });
});
