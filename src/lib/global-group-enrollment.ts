import { resolveGlobalGroupTargets } from './global-group-targets';
import { memberKeyFromTargetUrl } from './member-url';
import type { AppState, GlobalGroup, ResolvedMemberTab } from './types';
import type { Result } from './validation';

function ok(): Result<void> {
  return { ok: true, value: undefined };
}

function err(message: string): Result<void> {
  return { ok: false, error: message };
}

function memberKeysFromResolved(resolved: ResolvedMemberTab[]): Set<string> {
  const keys = new Set<string>();
  for (const t of resolved) {
    const mk = memberKeyFromTargetUrl(t.targetUrl);
    if (mk) {
      keys.add(mk);
    }
  }
  return keys;
}

/**
 * Ensures no resolved member URL in `candidate` conflicts with enabled individual jobs
 * or another enabled global group (overlap by `memberKeyFromTargetUrl`, not only the same live `tabId`).
 */
export async function validateGlobalGroupResolvedEnrollment(
  state: AppState,
  candidate: GlobalGroup,
  excludeGroupId?: string
): Promise<Result<void>> {
  const resolved = await resolveGlobalGroupTargets(candidate);
  const candidateMemberKeys = memberKeysFromResolved(resolved);

  for (const j of state.individualJobs) {
    if (!j.enabled) {
      continue;
    }
    const jmk = memberKeyFromTargetUrl(j.target.targetUrl);
    if (!jmk) {
      continue;
    }
    for (const t of resolved) {
      const tmk = memberKeyFromTargetUrl(t.targetUrl);
      if (tmk === jmk) {
        return err(
          `This URL has an enabled individual job. Disable that job or remove it before this group can use the same URL.`
        );
      }
    }
  }

  for (const g of state.globalGroups) {
    if (!g.enabled || g.id === excludeGroupId) {
      continue;
    }
    const other = await resolveGlobalGroupTargets(g);
    for (const mk of memberKeysFromResolved(other)) {
      if (candidateMemberKeys.has(mk)) {
        return err(
          `This group shares a member URL with enabled global group "${g.name}". Disable that group or adjust targets and URL patterns.`
        );
      }
    }
  }

  return ok();
}
