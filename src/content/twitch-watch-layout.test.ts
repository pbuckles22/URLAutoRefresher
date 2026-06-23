/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  createTwitchWatchLayoutState,
  resetTwitchWatchLayoutSession,
  runTwitchChannelWatchLayout,
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

describe('runTwitchChannelWatchLayout pref gate', () => {
  function watchSurfaceDoc(): Document {
    const doc = document.implementation.createHTMLDocument('twitch');
    const theater = doc.createElement('button');
    theater.setAttribute('data-a-target', 'player-theater-mode-button');
    doc.body.append(theater);
    const chatCollapse = doc.createElement('button');
    chatCollapse.setAttribute('aria-label', 'Collapse Chat');
    doc.body.append(chatCollapse);
    return doc;
  }

  it('skips theater and chat when layout disabled', () => {
    const doc = watchSurfaceDoc();
    const theater = doc.querySelector('button')!;
    const chatCollapse = doc.querySelectorAll('button')[1]!;
    let theaterClicked = false;
    let chatClicked = false;
    theater.addEventListener('click', () => {
      theaterClicked = true;
    });
    chatCollapse.addEventListener('click', () => {
      chatClicked = true;
    });

    const state = createTwitchWatchLayoutState();
    runTwitchChannelWatchLayout(doc, state, true, false);

    expect(theaterClicked).toBe(false);
    expect(chatClicked).toBe(false);
    expect(state.watchLayoutEngaged).toBe(false);
  });

  it('live: applies theater only — chat stays open', () => {
    const doc = watchSurfaceDoc();
    const theater = doc.querySelector('button')!;
    const chatCollapse = doc.querySelectorAll('button')[1]!;
    let theaterClicked = false;
    let chatClicked = false;
    theater.addEventListener('click', () => {
      theaterClicked = true;
    });
    chatCollapse.addEventListener('click', () => {
      chatClicked = true;
    });

    const state = createTwitchWatchLayoutState();
    runTwitchChannelWatchLayout(doc, state, true, true);

    expect(theaterClicked).toBe(true);
    expect(chatClicked).toBe(false);
    expect(state.watchLayoutEngaged).toBe(true);
  });

  it('offline: applies theater and collapses chat', () => {
    const doc = watchSurfaceDoc();
    const theater = doc.querySelector('button')!;
    const chatCollapse = doc.querySelectorAll('button')[1]!;
    let theaterClicked = false;
    let chatClicked = false;
    theater.addEventListener('click', () => {
      theaterClicked = true;
    });
    chatCollapse.addEventListener('click', () => {
      chatClicked = true;
    });

    const state = createTwitchWatchLayoutState();
    state.offlineNavDone = true;
    runTwitchChannelWatchLayout(doc, state, false, true);

    expect(theaterClicked).toBe(true);
    expect(chatClicked).toBe(true);
    expect(state.watchLayoutEngaged).toBe(true);
  });

  it('live after offline: expands chat when expand control is present', () => {
    const doc = document.implementation.createHTMLDocument('twitch');
    const theater = doc.createElement('button');
    theater.setAttribute('data-a-target', 'player-theater-mode-button');
    doc.body.append(theater);
    const chatExpand = doc.createElement('button');
    chatExpand.setAttribute('aria-label', 'Expand Chat');
    let expandClicked = false;
    chatExpand.addEventListener('click', () => {
      expandClicked = true;
    });
    doc.body.append(chatExpand);

    const state = createTwitchWatchLayoutState();
    state.chatCollapseDone = true;
    runTwitchChannelWatchLayout(doc, state, true, true);

    expect(expandClicked).toBe(true);
    expect(state.ensureChatOpenForLive).toBe(false);
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
