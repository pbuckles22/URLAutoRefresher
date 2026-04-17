import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  extensionRuntimeContextLikelyAlive,
  sendExtensionMessageAsync,
  sendExtensionMessageFireAndForget,
} from './extension-runtime-send';

describe('extension-runtime-send', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('extensionRuntimeContextLikelyAlive is false without runtime id', () => {
    vi.stubGlobal('chrome', { runtime: { id: undefined as unknown as string, sendMessage: vi.fn() } });
    expect(extensionRuntimeContextLikelyAlive()).toBe(false);
  });

  it('sendExtensionMessageFireAndForget returns false without calling sendMessage when id missing', () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { id: '', sendMessage } });
    expect(sendExtensionMessageFireAndForget({ type: 'x' })).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sendExtensionMessageFireAndForget returns false when sendMessage throws synchronously', () => {
    const sendMessage = vi.fn(() => {
      throw new Error('Extension context invalidated.');
    });
    vi.stubGlobal('chrome', { runtime: { id: 'extid', sendMessage } });
    expect(sendExtensionMessageFireAndForget({ type: 'x' })).toBe(false);
  });

  it('sendExtensionMessageFireAndForget returns true when sendMessage returns a promise', () => {
    const sendMessage = vi.fn(() => Promise.resolve(undefined));
    vi.stubGlobal('chrome', { runtime: { id: 'extid', sendMessage } });
    expect(sendExtensionMessageFireAndForget({ type: 'x' })).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'x' });
  });

  it('sendExtensionMessageAsync resolves undefined on synchronous throw', async () => {
    const sendMessage = vi.fn(() => {
      throw new Error('Extension context invalidated.');
    });
    vi.stubGlobal('chrome', { runtime: { id: 'extid', sendMessage } });
    await expect(sendExtensionMessageAsync<{ ok: boolean }>({ type: 'x' })).resolves.toBeUndefined();
  });

  it('sendExtensionMessageAsync returns payload when send resolves', async () => {
    const sendMessage = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('chrome', { runtime: { id: 'extid', sendMessage } });
    await expect(sendExtensionMessageAsync<{ ok: boolean }>({ type: 'x' })).resolves.toEqual({ ok: true });
  });
});
