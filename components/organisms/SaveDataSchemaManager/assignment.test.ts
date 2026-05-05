import { describe, expect, it } from 'vitest';

import {
  buildCatalogAssignmentPlan,
  buildAssignmentRequest,
  createAssignmentFormStateFromAssignments,
  createEmptyAssignmentFormState,
  getEffectiveAssignmentContentGroupIds,
  isAssignmentUnassignMode,
  resolveAssignmentRequiredValue,
} from './assignment';

describe('SaveData schema assignment helpers', () => {
  it('creates an empty assignment form state', () => {
    expect(createEmptyAssignmentFormState()).toEqual({
      isRequired: false,
      preserveExistingIsRequired: false,
    });
  });

  it('creates a bulk update form state that preserves required when selected assignments differ', () => {
    expect(createAssignmentFormStateFromAssignments([
      { isRequired: true },
      { isRequired: false },
    ])).toEqual({
      isRequired: false,
      preserveExistingIsRequired: true,
    });
  });

  it('creates a bulk update form state with the shared required flag when selected assignments match', () => {
    expect(createAssignmentFormStateFromAssignments([
      { isRequired: true },
      { isRequired: true },
    ])).toEqual({
      isRequired: true,
      preserveExistingIsRequired: false,
    });
  });

  it('builds an assignment request with only isRequired', () => {
    expect(buildAssignmentRequest({ isRequired: true, preserveExistingIsRequired: false })).toEqual({
      isRequired: true,
    });
  });

  it('builds a catalog assignment plan that skips already assigned definitions', () => {
    const plan = buildCatalogAssignmentPlan(
      [10, 20],
      [1, 2, 3],
      new Map<number, readonly number[]>([
        [10, [1, 3]],
        [20, [2]],
      ]),
    );

    expect(plan).toEqual({
      groups: [
        { contentGroupId: 10, definitionIdsToAssign: [2], skippedDefinitionIds: [1, 3] },
        { contentGroupId: 20, definitionIdsToAssign: [1, 3], skippedDefinitionIds: [2] },
      ],
      addedAssignmentCount: 3,
      skippedAssignmentCount: 3,
    });
  });

  it('treats settings mode with zero selected content groups as unassign mode', () => {
    expect(isAssignmentUnassignMode('settings', 0)).toBe(true);
    expect(isAssignmentUnassignMode('settings', 1)).toBe(false);
    expect(isAssignmentUnassignMode('catalog', 0)).toBe(false);
  });

  it('restricts settings mode content groups to the initially assigned category', () => {
    expect(getEffectiveAssignmentContentGroupIds('settings', ['10', '20'], ['10'])).toEqual(['10']);
    expect(getEffectiveAssignmentContentGroupIds('catalog', ['10', '20'], ['10'])).toEqual(['10', '20']);
  });

  it('uses the existing required flag when bulk update keeps current values', () => {
    expect(resolveAssignmentRequiredValue({
      isRequired: false,
      preserveExistingIsRequired: true,
    }, true)).toBe(true);

    expect(resolveAssignmentRequiredValue({
      isRequired: false,
      preserveExistingIsRequired: false,
    }, true)).toBe(false);
  });
});