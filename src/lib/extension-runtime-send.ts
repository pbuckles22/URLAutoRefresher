/**
 * MV3: after an extension reload/update, an old content script may still run.
 * `chrome.runtime.sendMessage` can throw synchronously ("Extension context invalidated");
 * a `.catch()` on the returned promise does not catch that.
 */
export function extensionRuntimeContextLikelyAlive(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && !!chrome.runtime.id;
}

/** Fire-and-forget background message; swallow async rejections. */
export function sendExtensionMessageFireAndForget(message: object): boolean {
  if (!extensionRuntimeContextLikelyAlive()) {
    return false;
  }
  try {
    void chrome.runtime.sendMessage(message).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function sendExtensionMessageAsync<T>(message: object): Promise<T | undefined> {
  if (!extensionRuntimeContextLikelyAlive()) {
    return undefined;
  }
  try {
    return (await chrome.runtime.sendMessage(message)) as T;
  } catch {
    return undefined;
  }
}
