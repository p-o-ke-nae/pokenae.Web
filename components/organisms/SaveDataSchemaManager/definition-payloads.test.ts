import { describe, expect, it } from 'vitest';
import { createDefinitionCreateRequest, createDefinitionUpdateRequestFromForm, parseDefinitionFieldType, parseDefinitionSharedChoiceSetId, type DefinitionPayloadInput } from './definition-payloads';

const baseInput: DefinitionPayloadInput = {
  fieldKey: ' trainerName ',
  label: ' トレーナー名 ',
  description: '  ',
  fieldType: '6',
  sharedChoiceSetId: '42',
};

describe('createDefinitionCreateRequest', () => {
  it('builds create payload without assignment-only fields', () => {
    expect(createDefinitionCreateRequest(baseInput)).toEqual({
      fieldKey: 'trainerName',
      label: 'トレーナー名',
      description: null,
      fieldType: 'SingleSelect',
      sharedChoiceSetId: 42,
    });
  });
});

describe('createDefinitionUpdateRequestFromForm', () => {
  it('builds update payload without assignment-only fields', () => {
    expect(createDefinitionUpdateRequestFromForm(baseInput)).toEqual({
      fieldKey: 'trainerName',
      label: 'トレーナー名',
      description: null,
      fieldType: 'SingleSelect',
      sharedChoiceSetId: 42,
    });
  });

  it('clears sharedChoiceSetId when type is not single select', () => {
    expect(createDefinitionUpdateRequestFromForm({ ...baseInput, fieldType: '2', sharedChoiceSetId: '42' })).toEqual({
      fieldKey: 'trainerName',
      label: 'トレーナー名',
      description: null,
      fieldType: 'Integer',
      sharedChoiceSetId: null,
    });
  });

  it('throws for invalid field type', () => {
    expect(() => parseDefinitionFieldType('999')).toThrow('型が不正です。');
  });

  it('throws for invalid shared choice set id', () => {
    expect(() => createDefinitionUpdateRequestFromForm({ ...baseInput, sharedChoiceSetId: 'abc' })).toThrow('共有選択肢セットが不正です。');
  });

  it('parses empty shared choice set id as null', () => {
    expect(parseDefinitionSharedChoiceSetId('')).toBeNull();
  });
});