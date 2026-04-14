import { describe, it, expect } from 'vitest';
import {
  alarmNameIndividual,
  alarmNameGlobal,
  parseAlarmName,
} from './alarm-names';

describe('alarm names', () => {
  it('roundtrips individual', () => {
    const name = alarmNameIndividual('abc-123');
    expect(parseAlarmName(name)).toEqual({ kind: 'individual', id: 'abc-123' });
  });

  it('roundtrips global', () => {
    const name = alarmNameGlobal('g1');
    expect(parseAlarmName(name)).toEqual({ kind: 'global', id: 'g1' });
  });

  it('returns null for unknown prefix', () => {
    expect(parseAlarmName('other:x')).toBeNull();
  });
});
