import { resolveGlobalGroupTargets } from './global-group-targets';
import type { AppState, GlobalGroup } from './types';
import type { Result } from './validation';

function ok(): Result<void> {
  return { ok: true, value: undefined };
}

function err(message: string): Result<void> {
  return { ok: false, error: message };
}

/**
 * Ensures no resolved tab in `candidate` conflicts with enabled individual jobs
 * or another enabled global group (explicit + pattern-resolved).
 */
export async function validateGlobalGroupResolvedEnrollment(
  state: AppState,
  candidate: GlobalGroup,
  excludeGroupId?: string
): Promise<Result<void>> {
  const resolved = await resolveGlobalGroupTargets(candidate);
  const tabIds = new Set(resolved.map((t) => t.tabId));

  for (const j of state.individualJobs) {
    if (j.enabled && tabIds.has(j.target.tabId)) {
      return err(
        `Tab ${j.target.tabId} has an enabled individual job. Disable that job or remove it before this group can use that tab.`
      );
    }
  }

  for (const g of state.globalGroups) {
    if (!g.enabled || g.id === excludeGroupId) {
      continue;
    }
    const other = await resolveGlobalGroupTargets(g);
    for (const t of other) {
      if (tabIds.has(t.tabId)) {
        return err(
          `Tab ${t.tabId} already belongs to enabled global group "${g.name}". Disable that group or adjust patterns.`
        );
      }
    }
  }

  return ok();
}
