/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import {
  findTwitchRaidDeclineControl,
  isTwitchRaidDeclineLabel,
  isTwitchRaidNoticeText,
  tryDeclineTwitchRaidInDocument,
} from './twitch-raid-guard';

function legacyRaidBannerHtml(buttonLabel: string): string {
  return `
    <div class="chat-room__notifications">
      <div data-test-selector="raid-banner">
        <p>Channel is raiding AnotherStreamer</p>
        <button type="button" class="tw-button">${buttonLabel}</button>
      </div>
    </div>
  `;
}

/** DOM shape from real Twitch UAT (2026-06-16): no data-test-selector, button "Leave". */
function realTwitchRaidNoticeHtml(): string {
  return `
    <div class="chat-room__container">
      <div class="chat-room__notifications">
        <div class="chat-notification">
          <div class="chat-notification__message">
            <span>sandmansoundfactory is raiding OGRodGee with 18 raiders.</span>
          </div>
          <button type="button" class="ScCoreButton-sc-ocjdkq-0">Leave</button>
        </div>
      </div>
    </div>
  `;
}

describe('isTwitchRaidDeclineLabel', () => {
  it('matches common English decline labels including Twitch Leave', () => {
    expect(isTwitchRaidDeclineLabel('Leave Raid')).toBe(true);
    expect(isTwitchRaidDeclineLabel('Leave')).toBe(true);
    expect(isTwitchRaidDeclineLabel('Cancel')).toBe(true);
    expect(isTwitchRaidDeclineLabel('Exit')).toBe(true);
    expect(isTwitchRaidDeclineLabel('Decline')).toBe(true);
  });

  it('rejects unrelated labels', () => {
    expect(isTwitchRaidDeclineLabel('Follow')).toBe(false);
    expect(isTwitchRaidDeclineLabel('Raid Now')).toBe(false);
    expect(isTwitchRaidDeclineLabel('')).toBe(false);
  });
});

describe('isTwitchRaidNoticeText', () => {
  it('matches live raid notice copy', () => {
    expect(isTwitchRaidNoticeText('sandmansoundfactory is raiding OGRodGee with 18 raiders.')).toBe(
      true
    );
  });

  it('rejects unrelated chat', () => {
    expect(isTwitchRaidNoticeText('thanks for the follow')).toBe(false);
  });
});

describe('findTwitchRaidDeclineControl', () => {
  it('finds Leave Raid inside legacy raid banner container', () => {
    document.body.innerHTML = legacyRaidBannerHtml('Leave Raid');
    const btn = findTwitchRaidDeclineControl(document);
    expect(btn?.textContent?.trim()).toBe('Leave Raid');
  });

  it('finds Leave on real Twitch chat raid notice (no data-test-selector)', () => {
    document.body.innerHTML = realTwitchRaidNoticeHtml();
    const btn = findTwitchRaidDeclineControl(document);
    expect(btn?.textContent?.trim()).toBe('Leave');
  });

  it('finds decline via aria-label when visible text is empty', () => {
    document.body.innerHTML = `
      <div data-test-selector="raid-banner">
        <button type="button" aria-label="Leave Raid"></button>
      </div>
    `;
    const btn = findTwitchRaidDeclineControl(document);
    expect(btn?.getAttribute('aria-label')).toBe('Leave Raid');
  });

  it('returns null when Leave is not paired with raid notice text', () => {
    document.body.innerHTML = `
      <div class="chat-room__notifications">
        <button type="button">Leave</button>
      </div>
    `;
    expect(findTwitchRaidDeclineControl(document)).toBeNull();
  });

  it('returns null when no raid UI is present', () => {
    document.body.innerHTML = '<button>Leave Raid</button>';
    expect(findTwitchRaidDeclineControl(document)).toBeNull();
  });

  it('returns null for Leave in a non-raid modal', () => {
    document.body.innerHTML = `
      <div role="dialog" aria-label="Confirm">
        <p>Are you sure you want to leave this channel?</p>
        <button type="button">Leave</button>
      </div>
    `;
    expect(findTwitchRaidDeclineControl(document)).toBeNull();
  });

  it('returns null when chat mentions leave but not an active raid notice', () => {
    document.body.innerHTML = `
      <div class="chat-room__notifications">
        <div class="chat-notification">
          <span>Please leave a follow before you go!</span>
          <button type="button">Leave</button>
        </div>
      </div>
    `;
    expect(findTwitchRaidDeclineControl(document)).toBeNull();
  });

  it('returns null for legacy raid banner without decline control', () => {
    document.body.innerHTML = `
      <div data-test-selector="raid-banner">
        <p>Channel is raiding AnotherStreamer</p>
        <button type="button">Follow</button>
      </div>
    `;
    expect(findTwitchRaidDeclineControl(document)).toBeNull();
  });
});

describe('tryDeclineTwitchRaidInDocument', () => {
  it('clicks Leave on real Twitch raid notice', () => {
    document.body.innerHTML = realTwitchRaidNoticeHtml();
    const btn = document.querySelector('button')!;
    const click = vi.fn();
    btn.addEventListener('click', click);

    expect(tryDeclineTwitchRaidInDocument(document)).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('clicks the decline control in legacy banner markup', () => {
    document.body.innerHTML = legacyRaidBannerHtml('Leave Raid');
    const btn = document.querySelector('button')!;
    const click = vi.fn();
    btn.addEventListener('click', click);

    expect(tryDeclineTwitchRaidInDocument(document)).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('does not click when no raid UI', () => {
    document.body.innerHTML = '<div></div>';
    expect(tryDeclineTwitchRaidInDocument(document)).toBe(false);
  });
});
