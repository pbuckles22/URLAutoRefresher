/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { installTwitchRaidGuardRunner } from './twitch-raid-guard-runner';

describe('installTwitchRaidGuardRunner', () => {
  it('clicks decline when armed and raid banner appears', () => {
    vi.useFakeTimers();
    const runner = installTwitchRaidGuardRunner(document);
    runner.setArmed(false);

    document.body.innerHTML = `
      <div class="chat-room__notifications">
        <div class="chat-notification">
          <span>host_channel is raiding other with 5 raiders.</span>
          <button type="button" id="decline">Leave</button>
        </div>
      </div>
    `;
    const btn = document.getElementById('decline')!;
    const click = vi.fn();
    btn.addEventListener('click', click);

    runner.setArmed(true);
    expect(click).toHaveBeenCalledTimes(1);

    runner.dispose();
    vi.useRealTimers();
  });
});
