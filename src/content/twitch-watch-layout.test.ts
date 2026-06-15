/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  createTwitchWatchLayoutState,
  resetTwitchWatchLayoutSession,
  tryEnterOfflineWatchSurface,
  tryNavigateOfflineViaChatControl,
} from '../content/twitch-watch-layout';

describe('twitch-watch-layout offline channel', () => {
  it('clears session flags when stream ends but keeps user layout overrides', () => {
    const state = createTwitchWatchLayoutState();
    state.sessionActive = true;
    state.userOverrodeTheater = true;
    state.watchLayoutEngaged = true;
    resetTwitchWatchLayoutSession(state);
    expect(state.sessionActive).toBe(false);
    expect(state.userOverrodeTheater).toBe(true);
    expect(state.watchLayoutEngaged).toBe(true);
  });
});

describe('tryNavigateOfflineViaChatControl', () => {
  it('clicks the Home / About / … / Chat sub-nav row (Whistleface-style offline home)', () => {
    const doc = document.implementation.createHTMLDocument('twitch');
    const nav = doc.createElement('div');
    for (const label of ['Home', 'About', 'Clips', 'Videos', 'Schedule']) {
      const tab = doc.createElement('a');
      tab.href = `#${label.toLowerCase()}`;
      tab.textContent = label;
      nav.append(tab);
    }
    const chat = doc.createElement('a');
    chat.href = '/whistleface/chat';
    chat.textContent = 'Chat';
    let clicked = false;
    chat.addEventListener('click', (e) => {
      e.preventDefault();
      clicked = true;
    });
    nav.append(chat);
    doc.body.append(nav);

    expect(tryNavigateOfflineViaChatControl(doc)).toBe(true);
    expect(clicked).toBe(true);
  });

  it('clicks sub-nav Chat link labeled ↗ Chat', () => {
    const doc = document.implementation.createHTMLDocument('twitch');
    const nav = doc.createElement('nav');
    const home = doc.createElement('a');
    home.href = '/whistleface';
    home.textContent = 'Home';
    nav.append(home);
    const chat = doc.createElement('a');
    chat.href = '/whistleface/chat';
    chat.textContent = '↗ Chat';
    let clicked = false;
    chat.addEventListener('click', (e) => {
      e.preventDefault();
      clicked = true;
    });
    nav.append(chat);
    doc.body.append(nav);

    expect(tryNavigateOfflineViaChatControl(doc)).toBe(true);
    expect(clicked).toBe(true);
  });

  it('skips popout chat links', () => {
    const doc = document.implementation.createHTMLDocument('twitch');
    const nav = doc.createElement('nav');
    const home = doc.createElement('a');
    home.href = '/whistleface';
    home.textContent = 'Home';
    nav.append(home);
    const chat = doc.createElement('a');
    chat.href = '/popout/whistleface/chat';
    chat.textContent = 'Chat';
    nav.append(chat);
    doc.body.append(nav);

    expect(tryNavigateOfflineViaChatControl(doc)).toBe(false);
  });

  it('skips target=_blank chat links', () => {
    const doc = document.implementation.createHTMLDocument('twitch');
    const nav = doc.createElement('nav');
    const home = doc.createElement('a');
    home.href = '/whistleface';
    home.textContent = 'Home';
    nav.append(home);
    const chat = doc.createElement('a');
    chat.href = '/whistleface/chat';
    chat.target = '_blank';
    chat.textContent = 'Chat';
    nav.append(chat);
    doc.body.append(nav);

    expect(tryNavigateOfflineViaChatControl(doc)).toBe(false);
  });
});

describe('tryEnterOfflineWatchSurface', () => {
  it('clicks offline header preview on banner-style channel home', () => {
    const doc = document.implementation.createHTMLDocument('twitch');
    const preview = doc.createElement('button');
    preview.setAttribute('data-a-target', 'channel-home-header-offline');
    let clicked = false;
    preview.addEventListener('click', () => {
      clicked = true;
    });
    doc.body.append(preview);

    expect(tryEnterOfflineWatchSurface(doc)).toBe(true);
    expect(clicked).toBe(true);
  });
});
