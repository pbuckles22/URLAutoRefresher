import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as prefsMod from './prefs';
import { clearSchedulerDebugCache, isSchedulerDebugEnabled, schedLog } from './scheduler-debug';

describe('scheduler-debug', () => {
  beforeEach(() => {
    clearSchedulerDebugCache();
    vi.restoreAllMocks();
  });

  it('schedLog is silent when overlay snap-back debug pref is off', async () => {
    vi.spyOn(prefsMod, 'loadExtensionPrefs').mockResolvedValue({
      showPageOverlayTimer: true,
      showOverlaySnapBackDebug: false,
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await schedLog('test message', { x: 1 });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('schedLog writes when overlay snap-back debug pref is on', async () => {
    vi.spyOn(prefsMod, 'loadExtensionPrefs').mockResolvedValue({
      showPageOverlayTimer: true,
      showOverlaySnapBackDebug: true,
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await schedLog('alarm fired', { tabId: 9 });
    expect(logSpy).toHaveBeenCalled();
    expect(await isSchedulerDebugEnabled()).toBe(true);
  });
});
