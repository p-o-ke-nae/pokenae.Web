import { describe, expect, it } from 'vitest';
import {
  buildCopyPlan,
  buildCopySummaryMessage,
  buildCreateRequestFromSource,
  buildOptionCreatePayloads,
  computeNextDisplayOrder,
  normalizeFieldKeyForComparison,
  shouldCopyOptions,
  summarizeCopyResults,
} from './copy-definitions';
import type { SaveDataFieldDefinitionDto, SaveDataFieldOptionDto } from '../../../lib/game-management/types';

function createDefinition(overrides: Partial<SaveDataFieldDefinitionDto>): SaveDataFieldDefinitionDto {
  return {
    id: 1,
    contentGroupId: 10,
    fieldKey: 'field_key',
    label: 'Field Label',
    description: null,
    fieldType: 0,
    displayOrder: 1,
    isRequired: false,
    sharedChoiceSetId: null,
    isDeleted: false,
    ...overrides,
  };
}

function createOption(overrides: Partial<SaveDataFieldOptionDto>): SaveDataFieldOptionDto {
  return {
    id: 1,
    fieldDefinitionId: 100,
    optionKey: 'opt_key',
    label: 'Option',
    description: null,
    displayOrder: 1,
    isDeleted: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildCopyPlan
// ---------------------------------------------------------------------------
describe('buildCopyPlan', () => {
  it('marks all definitions as copy when target is empty', () => {
    const source = [
      createDefinition({ id: 1, fieldKey: 'a', displayOrder: 2 }),
      createDefinition({ id: 2, fieldKey: 'b', displayOrder: 1 }),
    ];
    const plan = buildCopyPlan(source, []);
    expect(plan).toHaveLength(2);
    // sorted by displayOrder
    expect(plan[0].definition.fieldKey).toBe('b');
    expect(plan[0].action).toBe('copy');
    expect(plan[1].definition.fieldKey).toBe('a');
    expect(plan[1].action).toBe('copy');
  });

  it('skips definitions whose fieldKey exists in target', () => {
    const source = [
      createDefinition({ id: 1, fieldKey: 'shared_key', displayOrder: 1 }),
      createDefinition({ id: 2, fieldKey: 'unique_key', displayOrder: 2 }),
    ];
    const target = [
      createDefinition({ id: 99, fieldKey: 'shared_key', displayOrder: 1, contentGroupId: 20 }),
    ];
    const plan = buildCopyPlan(source, target);
    expect(plan[0].action).toBe('skip');
    expect(plan[0].skipReason).toContain('shared_key');
    expect(plan[1].action).toBe('copy');
  });

  it('treats fieldKey as duplicate ignoring case', () => {
    const source = [
      createDefinition({ id: 1, fieldKey: 'SaveSlot', displayOrder: 1 }),
    ];
    const target = [
      createDefinition({ id: 99, fieldKey: 'saveslot', displayOrder: 1, contentGroupId: 20 }),
    ];

    const plan = buildCopyPlan(source, target);

    expect(plan[0].action).toBe('skip');
    expect(plan[0].skipReason).toContain('SaveSlot');
  });

  it('returns empty array for empty source', () => {
    expect(buildCopyPlan([], [])).toEqual([]);
  });
});

describe('normalizeFieldKeyForComparison', () => {
  it('normalizes case and trims whitespace', () => {
    expect(normalizeFieldKeyForComparison('  SaveSlot  ')).toBe('saveslot');
  });
});

// ---------------------------------------------------------------------------
// computeNextDisplayOrder
// ---------------------------------------------------------------------------
describe('computeNextDisplayOrder', () => {
  it('returns 1 when target is empty', () => {
    expect(computeNextDisplayOrder([])).toBe(1);
  });

  it('returns max + 1 of existing definitions', () => {
    const target = [
      createDefinition({ displayOrder: 3 }),
      createDefinition({ displayOrder: 7 }),
      createDefinition({ displayOrder: 5 }),
    ];
    expect(computeNextDisplayOrder(target)).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// buildCreateRequestFromSource
// ---------------------------------------------------------------------------
describe('buildCreateRequestFromSource', () => {
  it('converts fieldType to API string name', () => {
    const source = createDefinition({ fieldType: 6, sharedChoiceSetId: 42 });
    const request = buildCreateRequestFromSource(source, 10);
    expect(request.fieldType).toBe('SingleSelect');
    expect(request.displayOrder).toBe(10);
    expect(request.sharedChoiceSetId).toBe(42);
  });

  it('preserves description as null', () => {
    const source = createDefinition({ description: null });
    expect(buildCreateRequestFromSource(source, 1).description).toBeNull();
  });

  it('preserves description value', () => {
    const source = createDefinition({ description: 'some text' });
    expect(buildCreateRequestFromSource(source, 1).description).toBe('some text');
  });
});

// ---------------------------------------------------------------------------
// shouldCopyOptions
// ---------------------------------------------------------------------------
describe('shouldCopyOptions', () => {
  it('returns true for SingleSelect without shared choice set', () => {
    expect(shouldCopyOptions(createDefinition({ fieldType: 6, sharedChoiceSetId: null }))).toBe(true);
  });

  it('returns false for SingleSelect with shared choice set', () => {
    expect(shouldCopyOptions(createDefinition({ fieldType: 6, sharedChoiceSetId: 5 }))).toBe(false);
  });

  it('returns false for non-SingleSelect', () => {
    expect(shouldCopyOptions(createDefinition({ fieldType: 0 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildOptionCreatePayloads
// ---------------------------------------------------------------------------
describe('buildOptionCreatePayloads', () => {
  it('sorts by displayOrder and strips id/fieldDefinitionId', () => {
    const options = [
      createOption({ id: 2, optionKey: 'b', label: 'B', displayOrder: 3, description: 'desc' }),
      createOption({ id: 1, optionKey: 'a', label: 'A', displayOrder: 1, description: null }),
    ];
    const payloads = buildOptionCreatePayloads(options);
    expect(payloads).toEqual([
      { optionKey: 'a', label: 'A', description: null },
      { optionKey: 'b', label: 'B', description: 'desc' },
    ]);
  });

  it('returns empty array for no options', () => {
    expect(buildOptionCreatePayloads([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// summarizeCopyResults / buildCopySummaryMessage
// ---------------------------------------------------------------------------
describe('summarizeCopyResults', () => {
  it('counts outcomes correctly', () => {
    const results = [
      { definition: createDefinition({}), outcome: 'created' as const },
      { definition: createDefinition({}), outcome: 'skipped' as const },
      { definition: createDefinition({}), outcome: 'failed' as const },
      { definition: createDefinition({}), outcome: 'created' as const },
    ];
    const summary = summarizeCopyResults(results);
    expect(summary.created).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.failed).toBe(1);
  });
});

describe('buildCopySummaryMessage', () => {
  it('formats combined message', () => {
    const msg = buildCopySummaryMessage({ created: 3, skipped: 1, failed: 0, results: [] });
    expect(msg).toBe('3 件を複写しました、1 件をスキップしました。');
  });

  it('handles all-skipped case', () => {
    const msg = buildCopySummaryMessage({ created: 0, skipped: 2, failed: 0, results: [] });
    expect(msg).toBe('2 件をスキップしました。');
  });

  it('handles empty results', () => {
    const msg = buildCopySummaryMessage({ created: 0, skipped: 0, failed: 0, results: [] });
    expect(msg).toBe('複写対象がありませんでした。');
  });
});
