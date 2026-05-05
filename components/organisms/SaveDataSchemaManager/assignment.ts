import type {
  UpsertSaveDataFieldDefinitionAssignmentRequest,
} from '@/lib/game-management/types';

export type AssignmentFormState = {
  isRequired: boolean;
  preserveExistingIsRequired: boolean;
};

export type CatalogAssignmentPlanGroup = {
  contentGroupId: number;
  definitionIdsToAssign: number[];
  skippedDefinitionIds: number[];
};

export type CatalogAssignmentPlan = {
  groups: CatalogAssignmentPlanGroup[];
  addedAssignmentCount: number;
  skippedAssignmentCount: number;
};

export function createEmptyAssignmentFormState(): AssignmentFormState {
  return {
    isRequired: false,
    preserveExistingIsRequired: false,
  };
}

export function createAssignmentFormStateFromAssignments(
  assignments: ReadonlyArray<{ isRequired: boolean }>,
): AssignmentFormState {
  if (assignments.length === 0) {
    return createEmptyAssignmentFormState();
  }

  const firstRequired = assignments[0].isRequired;
  const hasMixedRequired = assignments.some((assignment) => assignment.isRequired !== firstRequired);

  return {
    isRequired: hasMixedRequired ? false : firstRequired,
    preserveExistingIsRequired: hasMixedRequired,
  };
}

export function isAssignmentUnassignMode(source: 'catalog' | 'settings', contentGroupSelectionCount: number): boolean {
  return source === 'settings' && contentGroupSelectionCount === 0;
}

export function getEffectiveAssignmentContentGroupIds(
  source: 'catalog' | 'settings',
  selectedContentGroupIds: readonly string[],
  initialContentGroupIds: readonly string[],
): string[] {
  const allowedContentGroupIds = source === 'settings'
    ? new Set(initialContentGroupIds)
    : null;

  return [...new Set(selectedContentGroupIds)].filter((contentGroupId) => (
    allowedContentGroupIds == null || allowedContentGroupIds.has(contentGroupId)
  ));
}

export function resolveAssignmentRequiredValue(
  formState: AssignmentFormState,
  fallbackIsRequired: boolean,
): boolean {
  return formState.preserveExistingIsRequired ? fallbackIsRequired : formState.isRequired;
}

export function buildCatalogAssignmentPlan(
  targetContentGroupIds: number[],
  targetDefinitionIds: number[],
  assignedDefinitionIdsByContentGroup: ReadonlyMap<number, readonly number[]>,
): CatalogAssignmentPlan {
  const groups = targetContentGroupIds.map((contentGroupId) => {
    const assignedDefinitionIds = new Set(assignedDefinitionIdsByContentGroup.get(contentGroupId) ?? []);
    const definitionIdsToAssign: number[] = [];
    const skippedDefinitionIds: number[] = [];

    for (const definitionId of targetDefinitionIds) {
      if (assignedDefinitionIds.has(definitionId)) {
        skippedDefinitionIds.push(definitionId);
      } else {
        definitionIdsToAssign.push(definitionId);
      }
    }

    return {
      contentGroupId,
      definitionIdsToAssign,
      skippedDefinitionIds,
    };
  });

  return {
    groups,
    addedAssignmentCount: groups.reduce((count, group) => count + group.definitionIdsToAssign.length, 0),
    skippedAssignmentCount: groups.reduce((count, group) => count + group.skippedDefinitionIds.length, 0),
  };
}

export function buildAssignmentRequest(
  formState: AssignmentFormState,
): UpsertSaveDataFieldDefinitionAssignmentRequest {
  return {
    isRequired: formState.isRequired,
  };
}