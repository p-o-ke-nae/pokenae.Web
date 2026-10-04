import type { SaveDataSearchCriteria, SaveDataSearchOperator } from './save-data-search';

const SEARCH_QUERY_KEY = 'criteria';
const LEGACY_QUERY_KEYS = {
  field: 'field',
  operator: 'operator',
  value: 'value',
} as const;

const OPERATORS = new Set<SaveDataSearchOperator>([
  'equals',
  'not-equals',
  'contains',
  'not-contains',
  'greater-than',
  'less-than',
  'greater-or-equal',
  'less-or-equal',
]);

function isSearchOperator(value: unknown): value is SaveDataSearchOperator {
  return typeof value === 'string' && OPERATORS.has(value as SaveDataSearchOperator);
}

function parseCriteria(value: unknown): SaveDataSearchCriteria[] {
  if (!Array.isArray(value)) return [];

  const usedFields = new Set<string>();
  return value.flatMap((item): SaveDataSearchCriteria[] => {
    if (
      typeof item !== 'object'
      || item === null
      || !('fieldId' in item)
      || !('operator' in item)
      || !('value' in item)
    ) return [];

    const criterion = item as Record<string, unknown>;
    if (
      typeof criterion.fieldId !== 'string'
      || !criterion.fieldId
      || usedFields.has(criterion.fieldId)
      || !isSearchOperator(criterion.operator)
      || typeof criterion.value !== 'string'
    ) return [];

    usedFields.add(criterion.fieldId);
    return [{
      fieldId: criterion.fieldId,
      operator: criterion.operator,
      value: criterion.value,
    }];
  });
}

function parseSerializedCriteria(value: string): SaveDataSearchCriteria[] {
  let serialized = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed: unknown = JSON.parse(serialized);
      if (typeof parsed !== 'string') return parseCriteria(parsed);
      serialized = parsed;
    } catch {
      try {
        const decoded = decodeURIComponent(serialized);
        if (decoded === serialized) return [];
        serialized = decoded;
      } catch {
        return [];
      }
    }
  }
  return [];
}

export function restoreSaveDataSearchCriteria(search: string): SaveDataSearchCriteria[] {
  const params = new URLSearchParams(search);
  const serializedCriteria = params.get(SEARCH_QUERY_KEY);
  if (serializedCriteria !== null) {
    return parseSerializedCriteria(serializedCriteria);
  }

  const fieldIds = params.getAll(LEGACY_QUERY_KEYS.field);
  const operators = params.getAll(LEGACY_QUERY_KEYS.operator);
  const values = params.getAll(LEGACY_QUERY_KEYS.value);
  if (fieldIds.length === 0 || fieldIds.length !== operators.length || fieldIds.length !== values.length) return [];

  return parseCriteria(fieldIds.map((fieldId, index) => ({
    fieldId,
    operator: operators[index],
    value: values[index],
  })));
}

export function buildSaveDataSearchUrl(currentUrl: string, criteria: SaveDataSearchCriteria[]): string {
  const url = new URL(currentUrl);
  url.searchParams.delete(LEGACY_QUERY_KEYS.field);
  url.searchParams.delete(LEGACY_QUERY_KEYS.operator);
  url.searchParams.delete(LEGACY_QUERY_KEYS.value);
  if (criteria.length > 0) {
    url.searchParams.set(SEARCH_QUERY_KEY, JSON.stringify(criteria));
  } else {
    url.searchParams.delete(SEARCH_QUERY_KEY);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
