import { describe, it, expect } from 'vitest';
import {
  alarmNameGlobal,
  alarmNameGlobalMember,
  alarmNameGlobalTab,
  alarmNameIndividual,
  parseAlarmName,
} from './alarm-names';

describe('alarm names', () => {
  it('roundtrips individual', () => {
    const name = alarmNameIndividual('abc-123');
    expect(parseAlarmName(name)).toEqual({ kind: 'individual', id: 'abc-123' });
  });

  it('roundtrips global (legacy)', () => {
    const name = alarmNameGlobal('g1');
    expect(parseAlarmName(name)).toEqual({ kind: 'global', id: 'g1' });
  });

  it('roundtrips global per-tab', () => {
    const name = alarmNameGlobalTab('g1', 42);
    expect(parseAlarmName(name)).toEqual({ kind: 'globalTab', groupId: 'g1', tabId: 42 });
  });

  it('roundtrips global per-member key (Epic 10.3)', () => {
    const name = alarmNameGlobalMember('g1', 'twitch.tv/channel/videos');
    expect(parseAlarmName(name)).toEqual({
      kind: 'globalMember',
      groupId: 'g1',
      memberKey: 'twitch.tv/channel/videos',
    });
  });

  it('returns null for unknown prefix', () => {
    expect(parseAlarmName('other:x')).toBeNull();
  });
});
