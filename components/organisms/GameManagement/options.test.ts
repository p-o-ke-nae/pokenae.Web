import { describe, expect, it } from 'vitest';

import { shouldRenderSelectPlaceholder } from './select-utils';

describe('shouldRenderSelectPlaceholder', () => {
  it('renders a placeholder when the options do not include an empty value', () => {
    expect(shouldRenderSelectPlaceholder([{ value: '1', label: 'Nintendo Switch' }], '選択してください')).toBe(true);
  });

  it('suppresses the placeholder when an empty option already exists', () => {
    const options = [{ value: '', label: '未選択' }, { value: '1', label: 'Nintendo Switch' }];

    expect(shouldRenderSelectPlaceholder(options, '選択してください')).toBe(false);
  });

  it('does not render a placeholder when none is specified', () => {
    expect(shouldRenderSelectPlaceholder([{ value: '1', label: 'Nintendo Switch' }])).toBe(false);
  });
});