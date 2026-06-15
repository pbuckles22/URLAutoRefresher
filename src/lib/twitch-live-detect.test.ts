/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  coalesceTwitchLiveSignal,
  inferTwitchLiveFromChannelPage,
  inferTwitchLiveFromDom,
  inferTwitchLiveFromScriptText,
  isTwitchBrowseUrl,
  isTwitchChannelRootUrl,
  isTwitchPopoutChatUrl,
  mergeTwitchLiveSignals,
  twitchChannelSlugFromPopoutChatUrl,
  twitchChannelSlugFromUrl,
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

describe('isTwitchBrowseUrl', () => {
  it('is true for twitch homepage and false for channel roots', () => {
    expect(isTwitchBrowseUrl('https://www.twitch.tv/')).toBe(true);
    expect(isTwitchBrowseUrl('https://www.twitch.tv/directory/all')).toBe(true);
    expect(isTwitchBrowseUrl('https://www.twitch.tv/nyybeats')).toBe(false);
  });
});

describe('isTwitchPopoutChatUrl', () => {
  it('detects popout chat URLs', () => {
    expect(isTwitchPopoutChatUrl('https://www.twitch.tv/popout/whistleface/chat')).toBe(true);
    expect(isTwitchPopoutChatUrl('https://www.twitch.tv/whistleface')).toBe(false);
  });
});

describe('twitchChannelSlugFromUrl', () => {
  it('extracts slug from channel home only', () => {
    expect(twitchChannelSlugFromUrl('https://www.twitch.tv/djaj_music')).toBe('djaj_music');
    expect(twitchChannelSlugFromUrl('https://www.twitch.tv/djaj_music/chat')).toBe(undefined);
  });
});

describe('twitchChannelSlugFromPopoutChatUrl', () => {
  it('extracts slug from popout chat URLs', () => {
    expect(
      twitchChannelSlugFromPopoutChatUrl('https://www.twitch.tv/popout/whistleface/chat')
    ).toBe('whistleface');
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

  it('coalesceTwitchLiveSignal treats unknown as offline', () => {
    expect(coalesceTwitchLiveSignal(null)).toBe(false);
    expect(coalesceTwitchLiveSignal(false)).toBe(false);
    expect(coalesceTwitchLiveSignal(true)).toBe(true);
  });

  it('returns null when both markers appear (stale boot JSON)', () => {
    const text = '"isLiveBroadcast":false blah "isLiveBroadcast":true';
    expect(inferTwitchLiveFromScriptText(text)).toBe(null);
  });
});

describe('inferTwitchLiveFromDom', () => {
  it('returns false for offline channel home banner', () => {
    const doc = document.implementation.createHTMLDocument('');
    const offline = doc.createElement('div');
    offline.setAttribute('data-a-target', 'channel-home-header-offline');
    doc.body.append(offline);
    expect(inferTwitchLiveFromDom(doc)).toBe(false);
  });

  it('returns true when live indicator is present', () => {
    const doc = document.implementation.createHTMLDocument('');
    const live = doc.createElement('span');
    live.setAttribute('data-a-target', 'player-live-indicator');
    doc.body.append(live);
    expect(inferTwitchLiveFromDom(doc)).toBe(true);
  });

  it('returns null when layout is ambiguous', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.append(doc.createElement('div'));
    expect(inferTwitchLiveFromDom(doc)).toBe(null);
  });
});

describe('mergeTwitchLiveSignals', () => {
  it('prefers DOM offline over stale script live', () => {
    expect(mergeTwitchLiveSignals(false, true)).toBe(false);
  });

  it('prefers DOM live over script offline', () => {
    expect(mergeTwitchLiveSignals(true, false)).toBe(true);
  });

  it('falls back to script when DOM is ambiguous', () => {
    expect(mergeTwitchLiveSignals(null, true)).toBe(true);
    expect(mergeTwitchLiveSignals(null, false)).toBe(false);
  });
});

describe('inferTwitchLiveFromChannelPage', () => {
  it('uses DOM offline when boot script still says live (djaj-style false LIVE)', () => {
    const doc = document.implementation.createHTMLDocument('');
    const offline = doc.createElement('div');
    offline.setAttribute('data-a-target', 'channel-home-header-offline');
    doc.body.append(offline);
    const script = doc.createElement('script');
    script.textContent = '{"isLiveBroadcast":true}';
    doc.body.append(script);
    expect(inferTwitchLiveFromChannelPage(doc)).toBe(false);
  });

  it('uses script live when DOM has no offline or live markers', () => {
    const doc = document.implementation.createHTMLDocument('');
    const script = doc.createElement('script');
    script.textContent = '{"twilight":"x","isLiveBroadcast":true}';
    doc.body.append(script);
    expect(inferTwitchLiveFromChannelPage(doc)).toBe(true);
  });
});
