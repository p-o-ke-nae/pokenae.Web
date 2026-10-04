import { describe, expect, it } from 'vitest';
import {
  buildSaveDataSearchUrl,
  partitionRestoredSaveDataSearchCriteria,
  restoreSaveDataSearchCriteria,
  shouldRunInitialSaveDataSearch,
  type InitialSaveDataSearchState,
} from './save-data-search-url';
import type { SaveDataSearchFieldOption } from './save-data-search';

const criteria = [
  { fieldId: 'custom:trainer-name', operator: 'contains' as const, value: 'A&B=#主人公' },
  { fieldId: 'master:story-progress', operator: 'not-equals' as const, value: '' },
];

describe('save-data search URL helpers', () => {
  it('round-trips encoded criteria and preserves unrelated query parameters', () => {
    const searchUrl = buildSaveDataSearchUrl(
      'https://example.test/game-library/save-data-search?source=dashboard#results',
      criteria,
    );
    const url = new URL(searchUrl, 'https://example.test');

    expect(url.searchParams.get('source')).toBe('dashboard');
    expect(restoreSaveDataSearchCriteria(url.search)).toEqual(criteria);
    expect(url.hash).toBe('#results');
  });

  it('restores criteria that were percent-encoded before being added to the query string', () => {
    const doubleEncodedCriteria = encodeURIComponent(JSON.stringify(criteria));
    const search = new URLSearchParams({ criteria: doubleEncodedCriteria }).toString();

    expect(restoreSaveDataSearchCriteria(search)).toEqual(criteria);
  });

  it('restores links created with the repeated legacy parameters', () => {
    const legacySearch = new URLSearchParams();
    criteria.forEach((criterion) => {
      legacySearch.append('field', criterion.fieldId);
      legacySearch.append('operator', criterion.operator);
      legacySearch.append('value', criterion.value);
    });

    expect(restoreSaveDataSearchCriteria(legacySearch.toString())).toEqual(criteria);
  });

  it('returns no criteria for malformed or mismatched URL parameters', () => {
    expect(restoreSaveDataSearchCriteria('?criteria=%7Bbad-json')).toEqual([]);
    expect(restoreSaveDataSearchCriteria('?field=custom%3Atrainer-name&operator=equals')).toEqual([]);
    expect(restoreSaveDataSearchCriteria('?criteria=%5B%7B%22fieldId%22%3A%22x%22%7D%5D')).toEqual([]);
  });

  it('replaces search criteria and clears them without dropping other parameters', () => {
    const currentUrl = 'https://example.test/game-library/save-data-search?field=old&operator=equals&value=old&tab=all';

    const populatedUrl = new URL(buildSaveDataSearchUrl(currentUrl, criteria), 'https://example.test');
    expect(populatedUrl.searchParams.get('field')).toBeNull();
    expect(populatedUrl.searchParams.get('criteria')).toBe(JSON.stringify(criteria));
    expect(populatedUrl.searchParams.get('tab')).toBe('all');

    const clearedUrl = new URL(buildSaveDataSearchUrl(populatedUrl.href, []), 'https://example.test');
    expect(clearedUrl.searchParams.has('criteria')).toBe(false);
    expect(clearedUrl.searchParams.get('tab')).toBe('all');
  });
});

describe('initial save-data search gating', () => {
  const readyState: InitialSaveDataSearchState = {
    pending: true,
    sessionReady: true,
    loading: false,
    hasLookups: true,
    lookupsSource: 'authenticated',
    expectedSource: 'authenticated',
    schemasReady: true,
    hasSchemaErrors: false,
  };

  it('runs once the session, lookups, and schemas are ready', () => {
    expect(shouldRunInitialSaveDataSearch(readyState)).toBe(true);
  });

  it('waits while the session is still loading', () => {
    expect(shouldRunInitialSaveDataSearch({ ...readyState, sessionReady: false })).toBe(false);
  });

  it('waits when lookups were loaded for a different auth state', () => {
    expect(shouldRunInitialSaveDataSearch({ ...readyState, lookupsSource: 'trial' })).toBe(false);
    expect(shouldRunInitialSaveDataSearch({ ...readyState, lookupsSource: null })).toBe(false);
  });

  it('waits for schemas and skips when nothing is pending', () => {
    expect(shouldRunInitialSaveDataSearch({ ...readyState, schemasReady: false })).toBe(false);
    expect(shouldRunInitialSaveDataSearch({ ...readyState, hasSchemaErrors: true })).toBe(false);
    expect(shouldRunInitialSaveDataSearch({ ...readyState, loading: true })).toBe(false);
    expect(shouldRunInitialSaveDataSearch({ ...readyState, pending: false })).toBe(false);
  });

  it('separates criteria whose fields or operators are unavailable', () => {
    const fieldMap = new Map<string, SaveDataSearchFieldOption>([
      ['custom:trainer-name', { fieldId: 'custom:trainer-name', label: '主人公名', fieldType: 1, options: [] }],
      ['master:story-progress', { fieldId: 'master:story-progress', label: 'ストーリー進捗', fieldType: 'master', options: [] }],
    ]);
    const { valid, invalid } = partitionRestoredSaveDataSearchCriteria([
      ...criteria,
      { fieldId: 'custom:unknown', operator: 'equals', value: 'x' },
      { fieldId: 'master:story-progress', operator: 'greater-than', value: '1' },
    ], fieldMap);
    expect(valid).toEqual(criteria);
    expect(invalid.map((criterion) => criterion.fieldId)).toEqual(['custom:unknown', 'master:story-progress']);
  });
});