import { describe, expect, it } from 'vitest';
import {
  inferTwitchLiveFromScriptText,
  isTwitchChannelRootUrl,
} from './twitch-live-detect';

describe('isTwitchChannelRootUrl', () => {
  it('accepts single-segment twitch channel URLs', () => {
    expect(isTwitchChannelRootUrl('https://www.twitch.tv/ninja')).toBe(true);
    expect(isTwitchChannelRootUrl('https://twitch.tv/XyZ_9')).toBe(true);
  });

  it('rejects non-twitch, directory paths, and multi-segment channel paths', () => {
    expect(isTwitchChannelRootUrl('https://example.com/')).toBe(false);
    expect(isTwitchChannelRootUrl('https://www.twitch.tv/directory/game/Art')).toBe(false);
    expect(isTwitchChannelRootUrl('https://www.twitch.tv/ninja/videos')).toBe(false);
  });
});

describe('inferTwitchLiveFromScriptText', () => {
  it('detects live from embedded JSON marker', () => {
    const text = '{"foo":"bar","isLiveBroadcast":true,"x":1}';
    expect(inferTwitchLiveFromScriptText(text)).toBe(true);
  });

  it('detects offline when only false marker appears', () => {
    const text = '"isLiveBroadcast":false';
    expect(inferTwitchLiveFromScriptText(text)).toBe(false);
  });

  it('returns null when marker is absent', () => {
    expect(inferTwitchLiveFromScriptText('no markers here')).toBe(null);
  });

  it('prefers live when true appears', () => {
    const text = '"isLiveBroadcast":false blah "isLiveBroadcast":true';
    expect(inferTwitchLiveFromScriptText(text)).toBe(true);
  });
});
