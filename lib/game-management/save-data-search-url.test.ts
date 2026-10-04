import { describe, expect, it } from 'vitest';
import {
  buildSaveDataSearchUrl,
  restoreSaveDataSearchCriteria,
} from './save-data-search-url';

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
