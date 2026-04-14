import { describe, expect, it } from 'vitest';
import { buildBulkDefinitionTypeUpdateItems, createDefinitionUpdateRequest } from './bulk-definition-type';
import type { SaveDataFieldDefinitionDto } from '../../../lib/game-management/types';

function createDefinition(overrides: Partial<SaveDataFieldDefinitionDto>): SaveDataFieldDefinitionDto {
  return {
    id: 1,
    fieldKey: 'field_key',
    label: 'Field Label',
    description: null,
    fieldType: 0,
    sharedChoiceSetId: null,
    isDeleted: false,
    ...overrides,
  };
}

describe('createDefinitionUpdateRequest', () => {
  it('clears sharedChoiceSetId when moving away from single select', () => {
    const definition = createDefinition({ fieldType: 6, sharedChoiceSetId: 25 });

    expect(createDefinitionUpdateRequest(definition, { fieldType: 2 })).toEqual({
      fieldKey: 'field_key',
      label: 'Field Label',
      description: null,
      fieldType: 'Integer',
      sharedChoiceSetId: null,
    });
  });
});

describe('buildBulkDefinitionTypeUpdateItems', () => {
  it('builds update items for all selected non-deleted definitions', () => {
    const definitions = [
      createDefinition({ id: 1, fieldKey: 'field_a', label: 'A', fieldType: 0 }),
      createDefinition({ id: 2, fieldKey: 'field_b', label: 'B', fieldType: 1 }),
      createDefinition({ id: 3, fieldKey: 'field_c', label: 'C', fieldType: 6, sharedChoiceSetId: 99, isDeleted: true }),
    ];

    expect(buildBulkDefinitionTypeUpdateItems(definitions, 6, 42)).toEqual([
      {
        id: 1,
        updatePayload: {
          fieldKey: 'field_a',
          label: 'A',
          description: null,
          fieldType: 'SingleSelect',
          sharedChoiceSetId: 42,
        },
        rollbackPayload: {
          fieldKey: 'field_a',
          label: 'A',
          description: null,
          fieldType: 'Text',
          sharedChoiceSetId: null,
        },
      },
      {
        id: 2,
        updatePayload: {
          fieldKey: 'field_b',
          label: 'B',
          description: null,
          fieldType: 'SingleSelect',
          sharedChoiceSetId: 42,
        },
        rollbackPayload: {
          fieldKey: 'field_b',
          label: 'B',
          description: null,
          fieldType: 'MultilineText',
          sharedChoiceSetId: null,
        },
      },
    ]);
  });

  it('returns all selected items so the caller can update every record in one request', () => {
    const definitions = [
      createDefinition({ id: 11 }),
      createDefinition({ id: 12 }),
      createDefinition({ id: 13 }),
    ];

    const items = buildBulkDefinitionTypeUpdateItems(definitions, 3, null);

    expect(items.map((item) => item.id)).toEqual([11, 12, 13]);
  });
});