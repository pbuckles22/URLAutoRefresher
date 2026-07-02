/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import {
  findTwitchChannelPointsBonusControl,
  isTwitchChannelPointsBonusClaimLabel,
  isTwitchChannelPointsBonusControlVisible,
  tryClaimTwitchChannelPointsBonusInDocument,
} from './twitch-channel-points-bonus';

function claimBonusHtml(opts?: { hidden?: boolean; disabled?: boolean }): string {
  const hiddenStyle = opts?.hidden ? ' style="display:none"' : '';
  const disabled = opts?.disabled ? ' disabled' : '';
  return `
    <div class="community-points-summary">
      <button type="button" aria-label="Claim Bonus" id="bonus-btn"${hiddenStyle}${disabled}>Bonus</button>
    </div>
  `;
}

describe('isTwitchChannelPointsBonusClaimLabel', () => {
  it('matches common claim labels', () => {
    expect(isTwitchChannelPointsBonusClaimLabel('Claim Bonus')).toBe(true);
    expect(isTwitchChannelPointsBonusClaimLabel('Claim channel points bonus')).toBe(true);
    expect(isTwitchChannelPointsBonusClaimLabel('Collect Bonus')).toBe(true);
  });

  it('rejects unrelated labels', () => {
    expect(isTwitchChannelPointsBonusClaimLabel('Follow')).toBe(false);
    expect(isTwitchChannelPointsBonusClaimLabel('')).toBe(false);
  });
});

describe('findTwitchChannelPointsBonusControl', () => {
  it('finds Claim Bonus by aria-label', () => {
    document.body.innerHTML = claimBonusHtml();
    const btn = findTwitchChannelPointsBonusControl(document);
    expect(btn?.getAttribute('aria-label')).toBe('Claim Bonus');
  });

  it('finds data-test-selector community-points-claim', () => {
    document.body.innerHTML = `
      <button type="button" data-test-selector="community-points-claim" aria-label="Claim Bonus"></button>
    `;
    expect(findTwitchChannelPointsBonusControl(document)).not.toBeNull();
  });

  it('ignores hidden controls', () => {
    document.body.innerHTML = claimBonusHtml({ hidden: true });
    expect(findTwitchChannelPointsBonusControl(document)).toBeNull();
  });

  it('ignores disabled controls', () => {
    document.body.innerHTML = claimBonusHtml({ disabled: true });
    expect(findTwitchChannelPointsBonusControl(document)).toBeNull();
  });
});

describe('tryClaimTwitchChannelPointsBonusInDocument', () => {
  it('clicks visible claim control', () => {
    document.body.innerHTML = claimBonusHtml();
    const btn = document.getElementById('bonus-btn')!;
    const click = vi.fn();
    btn.addEventListener('click', click);
    expect(tryClaimTwitchChannelPointsBonusInDocument(document)).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('returns false when no control', () => {
    document.body.innerHTML = '';
    expect(tryClaimTwitchChannelPointsBonusInDocument(document)).toBe(false);
  });
});

describe('isTwitchChannelPointsBonusControlVisible', () => {
  it('respects offsetParent for visibility', () => {
    document.body.innerHTML = claimBonusHtml();
    const btn = document.getElementById('bonus-btn') as HTMLElement;
    expect(isTwitchChannelPointsBonusControlVisible(btn)).toBe(true);
  });
});
