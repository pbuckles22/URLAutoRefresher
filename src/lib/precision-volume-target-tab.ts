/**
 * Backlog #9 — dashboard/side panel precision volume targets active tab by default.
 */
import { resolvePreferredPinTabId } from './preferred-pin-tab';

/** Explicit tab override from the picker, else active http(s) tab in last-focused window. */
export async function resolvePrecisionVolumeTargetTabId(
  explicitTabId: number | null
): Promise<number | undefined> {
  if (explicitTabId !== null) {
    return explicitTabId;
  }
  return resolvePreferredPinTabId();
}
