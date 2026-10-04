import { describe, expect, it } from 'vitest';

import { planFooterRows, resolveLastItemSpan, resolveMobileColumns, type FooterToken } from './footer-layout';

const action = (item: string): FooterToken<string> => ({ type: 'action', item });
const group = (...items: string[]): FooterToken<string> => ({ type: 'group', items });
const block = (item: string): FooterToken<string> => ({ type: 'block', item });

describe('resolveMobileColumns', () => {
  it('places up to three buttons on a single evenly divided row', () => {
    expect(resolveMobileColumns(0)).toBe(1);
    expect(resolveMobileColumns(1)).toBe(1);
    expect(resolveMobileColumns(2)).toBe(2);
    expect(resolveMobileColumns(3)).toBe(3);
  });

  it('wraps four or more buttons into two columns', () => {
    expect(resolveMobileColumns(4)).toBe(2);
    expect(resolveMobileColumns(5)).toBe(2);
    expect(resolveMobileColumns(6)).toBe(2);
  });

  it('respects a smaller max column count', () => {
    expect(resolveMobileColumns(3, 2)).toBe(2);
    expect(resolveMobileColumns(3, 1)).toBe(1);
    expect(resolveMobileColumns(2, 10)).toBe(2);
  });
});

describe('resolveLastItemSpan', () => {
  it('fills the incomplete last row with the last button', () => {
    expect(resolveLastItemSpan(3, 2)).toBe(2);
    expect(resolveLastItemSpan(5, 2)).toBe(2);
    expect(resolveLastItemSpan(4, 3)).toBe(3);
    expect(resolveLastItemSpan(5, 3)).toBe(2);
  });

  it('does not span when the last row is complete', () => {
    expect(resolveLastItemSpan(4, 2)).toBe(1);
    expect(resolveLastItemSpan(3, 3)).toBe(1);
    expect(resolveLastItemSpan(1, 1)).toBe(1);
    expect(resolveLastItemSpan(0, 2)).toBe(1);
  });
});

describe('planFooterRows', () => {
  it('merges consecutive loose buttons into one row', () => {
    expect(planFooterRows([action('上へ'), action('下へ'), action('削除')])).toEqual([
      { kind: 'actions', items: ['上へ', '下へ', '削除'], columns: 3, lastItemSpan: 1 },
    ]);
  });

  it('keeps explicit groups and blocks on their own rows', () => {
    expect(planFooterRows([group('前へ', '次へ'), block('1 / 3'), action('削除')])).toEqual([
      { kind: 'actions', items: ['前へ', '次へ'], columns: 2, lastItemSpan: 1 },
      { kind: 'block', item: '1 / 3' },
      { kind: 'actions', items: ['削除'], columns: 1, lastItemSpan: 1 },
    ]);
  });

  it('separates the primary action into a full-width last row', () => {
    expect(planFooterRows([action('キャンセル'), action('作成して続ける'), action('作成して閉じる')], { separatePrimary: true })).toEqual([
      { kind: 'actions', items: ['キャンセル', '作成して続ける'], columns: 2, lastItemSpan: 1 },
      { kind: 'actions', items: ['作成して閉じる'], columns: 1, lastItemSpan: 1 },
    ]);
  });

  it('keeps the primary action inline when requested', () => {
    expect(planFooterRows([action('削除'), action('キャンセル'), action('保存')], { separatePrimary: false })).toEqual([
      { kind: 'actions', items: ['削除', 'キャンセル', '保存'], columns: 3, lastItemSpan: 1 },
    ]);
  });

  it('separates the primary action from the last group only', () => {
    expect(planFooterRows([group('削除', '読み取り専用に戻す'), group('キャンセル', '保存')], { separatePrimary: true })).toEqual([
      { kind: 'actions', items: ['削除', '読み取り専用に戻す'], columns: 2, lastItemSpan: 1 },
      { kind: 'actions', items: ['キャンセル'], columns: 1, lastItemSpan: 1 },
      { kind: 'actions', items: ['保存'], columns: 1, lastItemSpan: 1 },
    ]);
  });

  it('leaves a single primary action and trailing blocks untouched', () => {
    expect(planFooterRows([action('完了')], { separatePrimary: true })).toEqual([
      { kind: 'actions', items: ['完了'], columns: 1, lastItemSpan: 1 },
    ]);
    expect(planFooterRows([action('閉じる'), block('note')], { separatePrimary: true })).toEqual([
      { kind: 'actions', items: ['閉じる'], columns: 1, lastItemSpan: 1 },
      { kind: 'block', item: 'note' },
    ]);
  });

  it('drops empty groups', () => {
    expect(planFooterRows([group(), action('閉じる')])).toEqual([
      { kind: 'actions', items: ['閉じる'], columns: 1, lastItemSpan: 1 },
    ]);
  });
});

describe('planFooterRows labels', () => {
  it('keeps the accessible label of an explicit group', () => {
    expect(planFooterRows<string>([{ type: 'group', items: ['上へ', '下へ'], label: '並び順' }])).toEqual([
      { kind: 'actions', items: ['上へ', '下へ'], columns: 2, lastItemSpan: 1, label: '並び順' },
    ]);
  });
});
