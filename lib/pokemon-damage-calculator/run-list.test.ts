import { describe, expect, it } from 'vitest';
import { filterRunsByScope, getDefaultRunListScope } from './run-list';

describe('pokemon damage calculator run list helpers', () => {
  it('defaults authenticated users to own runs view', () => {
    expect(getDefaultRunListScope('google-user-1')).toBe('owned');
    expect(getDefaultRunListScope(null)).toBe('all');
  });

  it('filters runs for the selected scope', () => {
    const runs = [
      {
        id: 'run-1',
        ownerUserId: 'google-user-1',
        ruleSetId: 'rule-1',
        name: 'My Run',
        status: 'Draft',
        ownership: 'owner' as const,
      },
      {
        id: 'run-2',
        ownerUserId: 'google-user-2',
        ruleSetId: 'rule-1',
        name: 'Shared Run',
        status: 'Published',
        ownership: 'viewer' as const,
      },
    ];

    expect(filterRunsByScope(runs, 'owned').map((run) => run.id)).toEqual(['run-1']);
    expect(filterRunsByScope(runs, 'all').map((run) => run.id)).toEqual(['run-1', 'run-2']);
  });
});
