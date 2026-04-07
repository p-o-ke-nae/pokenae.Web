import { describe, expect, it } from 'vitest';

import {
  applySelectionInteraction,
  getSelectionRangeKeys,
  moveSelectedItemsByOne,
  moveSelectedItemsToTarget,
} from './selection-utils';

describe('getSelectionRangeKeys', () => {
  it('returns the inclusive range between anchor and target', () => {
    expect(getSelectionRangeKeys(['a', 'b', 'c', 'd'], 'b', 'd')).toEqual(['b', 'c', 'd']);
  });

  it('falls back to the target when the anchor is missing', () => {
    expect(getSelectionRangeKeys(['a', 'b', 'c'], null, 'c')).toEqual(['c']);
  });
});

describe('applySelectionInteraction', () => {
  it('selects an inclusive range on shift row selection', () => {
    expect(applySelectionInteraction({
      orderedKeys: ['a', 'b', 'c', 'd'],
      selectedKeys: ['b'],
      anchorKey: 'b',
      targetKey: 'd',
      mode: 'row',
      shiftKey: true,
    })).toEqual({
      selectedKeys: ['b', 'c', 'd'],
      anchorKey: 'b',
    });
  });

  it('adds the range to the existing selection on shift checkbox selection', () => {
    expect(applySelectionInteraction({
      orderedKeys: ['a', 'b', 'c', 'd'],
      selectedKeys: ['a'],
      anchorKey: 'b',
      targetKey: 'd',
      mode: 'checkbox',
      checked: true,
      shiftKey: true,
    })).toEqual({
      selectedKeys: ['a', 'b', 'c', 'd'],
      anchorKey: 'b',
    });
  });

  it('toggles row selection with ctrl without dropping the existing selection', () => {
    expect(applySelectionInteraction({
      orderedKeys: ['a', 'b', 'c'],
      selectedKeys: ['a'],
      anchorKey: 'a',
      targetKey: 'c',
      mode: 'row',
      ctrlKey: true,
    })).toEqual({
      selectedKeys: ['a', 'c'],
      anchorKey: 'c',
    });
  });
});

describe('moveSelectedItemsByOne', () => {
  it('moves a contiguous selected block up together', () => {
    expect(moveSelectedItemsByOne([1, 2, 3, 4], [2, 3], 'up')).toEqual([2, 3, 1, 4]);
  });

  it('moves a contiguous selected block down together', () => {
    expect(moveSelectedItemsByOne([1, 2, 3, 4], [2, 3], 'down')).toEqual([1, 4, 2, 3]);
  });

  it('keeps order unchanged when the selected block is already at the boundary', () => {
    expect(moveSelectedItemsByOne([1, 2, 3], [1, 2], 'up')).toEqual([1, 2, 3]);
  });
});

describe('moveSelectedItemsToTarget', () => {
  it('moves a selected block below the drop target when dragging downward', () => {
    expect(moveSelectedItemsToTarget([1, 2, 3, 4, 5], [1, 2], 0, 3)).toEqual([3, 4, 1, 2, 5]);
  });

  it('moves a selected block above the drop target when dragging upward', () => {
    expect(moveSelectedItemsToTarget([1, 2, 3, 4, 5], [4, 5], 4, 1)).toEqual([1, 4, 5, 2, 3]);
  });

  it('keeps order unchanged when dropped onto another selected row', () => {
    expect(moveSelectedItemsToTarget([1, 2, 3, 4], [1, 2], 0, 1)).toEqual([1, 2, 3, 4]);
  });
});