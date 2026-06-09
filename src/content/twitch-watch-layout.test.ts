import { describe, expect, it } from 'vitest';
import {
  createTwitchWatchLayoutState,
  resetTwitchWatchLayoutSession,
} from '../content/twitch-watch-layout';

describe('twitch-watch-layout offline channel', () => {
  it('resets session flags when stream ends', () => {
    const state = createTwitchWatchLayoutState();
    state.sessionActive = true;
    state.userOverrodeTheater = true;
    resetTwitchWatchLayoutSession(state);
    expect(state.sessionActive).toBe(false);
    expect(state.userOverrodeTheater).toBe(false);
  });
});
