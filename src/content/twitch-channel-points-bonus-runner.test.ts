/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { installTwitchChannelPointsBonusRunner } from './twitch-channel-points-bonus-runner';

function bonusHtml(): string {
  return `
    <div class="community-points-summary">
      <button type="button" aria-label="Claim Bonus" id="bonus">Claim</button>
    </div>
  `;
}

describe('installTwitchChannelPointsBonusRunner', () => {
  it('clicks claim when armed and bonus appears', () => {
    vi.useFakeTimers();
    const runner = installTwitchChannelPointsBonusRunner(document);
    runner.setArmed(false);

    document.body.innerHTML = bonusHtml();
    const btn = document.getElementById('bonus')!;
    const click = vi.fn();
    btn.addEventListener('click', click);

    runner.setArmed(true);
    expect(click).toHaveBeenCalledTimes(1);

    runner.dispose();
    vi.useRealTimers();
  });

  it('does not click when disarmed', () => {
    vi.useFakeTimers();
    document.body.innerHTML = bonusHtml();
    const btn = document.getElementById('bonus')!;
    const click = vi.fn();
    btn.addEventListener('click', click);

    const runner = installTwitchChannelPointsBonusRunner(document);
    runner.setArmed(false);
    vi.advanceTimersByTime(5_000);
    expect(click).not.toHaveBeenCalled();

    runner.dispose();
    vi.useRealTimers();
  });

  it('reports at most once while the same bonus stays visible', () => {
    vi.useFakeTimers();
    document.body.innerHTML = bonusHtml();
    const onClaimed = vi.fn();
    const runner = installTwitchChannelPointsBonusRunner(document, onClaimed);

    runner.setArmed(true);
    expect(onClaimed).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_000);
    expect(onClaimed).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '';
    vi.advanceTimersByTime(3_000);

    document.body.innerHTML = bonusHtml();
    vi.advanceTimersByTime(3_000);
    expect(onClaimed).toHaveBeenCalledTimes(2);

    runner.dispose();
    vi.useRealTimers();
  });
});
