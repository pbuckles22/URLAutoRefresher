/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { installTwitchRaidGuardRunner } from './twitch-raid-guard-runner';

function raidNoticeHtml(): string {
  return `
    <div class="chat-room__notifications">
      <div class="chat-notification">
        <span>host_channel is raiding other with 5 raiders.</span>
        <button type="button" id="decline">Leave</button>
      </div>
    </div>
  `;
}

describe('installTwitchRaidGuardRunner', () => {
  it('clicks decline when armed and raid banner appears', () => {
    vi.useFakeTimers();
    const runner = installTwitchRaidGuardRunner(document);
    runner.setArmed(false);

    document.body.innerHTML = raidNoticeHtml();
    const btn = document.getElementById('decline')!;
    const click = vi.fn();
    btn.addEventListener('click', click);

    runner.setArmed(true);
    expect(click).toHaveBeenCalledTimes(1);

    runner.dispose();
    vi.useRealTimers();
  });

  it('does not click when disarmed even if raid banner is present', () => {
    vi.useFakeTimers();
    document.body.innerHTML = raidNoticeHtml();
    const btn = document.getElementById('decline')!;
    const click = vi.fn();
    btn.addEventListener('click', click);

    const runner = installTwitchRaidGuardRunner(document);
    runner.setArmed(false);
    vi.advanceTimersByTime(5_000);
    expect(click).not.toHaveBeenCalled();

    runner.dispose();
    vi.useRealTimers();
  });

  it('rate-limits repeat clicks within MIN_CLICK_INTERVAL_MS', () => {
    vi.useFakeTimers();
    document.body.innerHTML = raidNoticeHtml();
    const btn = document.getElementById('decline')!;
    const click = vi.fn();
    btn.addEventListener('click', click);

    const runner = installTwitchRaidGuardRunner(document);
    runner.setArmed(true);
    expect(click).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_000);
    expect(click).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2_500);
    expect(click).toHaveBeenCalledTimes(1);

    runner.dispose();
    vi.useRealTimers();
  });

  it('reports at most once while the same raid banner stays visible', () => {
    vi.useFakeTimers();
    document.body.innerHTML = raidNoticeHtml();
    const onDeclined = vi.fn();
    const runner = installTwitchRaidGuardRunner(document, onDeclined);

    runner.setArmed(true);
    expect(onDeclined).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_000);
    expect(onDeclined).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '';
    vi.advanceTimersByTime(3_000);

    document.body.innerHTML = raidNoticeHtml();
    vi.advanceTimersByTime(3_000);
    expect(onDeclined).toHaveBeenCalledTimes(2);

    runner.dispose();
    vi.useRealTimers();
  });
});
