import { describe, expect, it } from 'vitest';
import { createDefinitionCreateRequest, createDefinitionUpdateRequestFromForm, parseDefinitionFieldType, parseDefinitionSharedChoiceSetId, type DefinitionPayloadInput } from './definition-payloads';

const baseInput: DefinitionPayloadInput = {
  fieldKey: ' trainerName ',
  label: ' トレーナー名 ',
  description: '  ',
  fieldType: '6',
  isRequired: true,
  sharedChoiceSetId: '42',
};

describe('createDefinitionCreateRequest', () => {
  it('builds create payload and omits displayOrder when not provided', () => {
    expect(createDefinitionCreateRequest(baseInput, null)).toEqual({
      fieldKey: 'trainerName',
      label: 'トレーナー名',
      description: null,
      fieldType: 'SingleSelect',
      isRequired: true,
      sharedChoiceSetId: 42,
    });
  });
});

describe('createDefinitionUpdateRequestFromForm', () => {
  it('builds update payload with required displayOrder', () => {
    expect(createDefinitionUpdateRequestFromForm(baseInput, 7)).toEqual({
      fieldKey: 'trainerName',
      label: 'トレーナー名',
      description: null,
      fieldType: 'SingleSelect',
      displayOrder: 7,
      isRequired: true,
      sharedChoiceSetId: 42,
    });
  });

  it('clears sharedChoiceSetId when type is not single select', () => {
    expect(createDefinitionUpdateRequestFromForm({ ...baseInput, fieldType: '2', sharedChoiceSetId: '42' }, 3)).toEqual({
      fieldKey: 'trainerName',
      label: 'トレーナー名',
      description: null,
      fieldType: 'Integer',
      displayOrder: 3,
      isRequired: true,
      sharedChoiceSetId: null,
    });
  });

  it('throws for invalid field type', () => {
    expect(() => parseDefinitionFieldType('999')).toThrow('型が不正です。');
  });

  it('throws for invalid shared choice set id', () => {
    expect(() => createDefinitionUpdateRequestFromForm({ ...baseInput, sharedChoiceSetId: 'abc' }, 3)).toThrow('共有選択肢セットが不正です。');
  });

  it('parses empty shared choice set id as null', () => {
    expect(parseDefinitionSharedChoiceSetId('')).toBeNull();
  });
});