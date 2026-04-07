export type SelectionInteractionMode = 'checkbox' | 'row';

export type SelectionInteractionOptions = {
  orderedKeys: string[];
  selectedKeys: string[];
  anchorKey: string | null;
  targetKey: string;
  mode: SelectionInteractionMode;
  checked?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
};

function uniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>();

  return keys.filter((key) => {
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getSelectionRangeKeys(orderedKeys: string[], anchorKey: string | null, targetKey: string): string[] {
  if (!anchorKey) {
    return [targetKey];
  }

  const anchorIndex = orderedKeys.indexOf(anchorKey);
  const targetIndex = orderedKeys.indexOf(targetKey);

  if (anchorIndex === -1 || targetIndex === -1) {
    return [targetKey];
  }

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return orderedKeys.slice(start, end + 1);
}

export function applySelectionInteraction({
  orderedKeys,
  selectedKeys,
  anchorKey,
  targetKey,
  mode,
  checked,
  shiftKey = false,
  metaKey = false,
  ctrlKey = false,
}: SelectionInteractionOptions): { selectedKeys: string[]; anchorKey: string } {
  const effectiveAnchorKey = anchorKey && orderedKeys.includes(anchorKey) ? anchorKey : null;
  const isTargetSelected = selectedKeys.includes(targetKey);
  const shouldToggle = metaKey || ctrlKey;

  if (shiftKey) {
    const rangeKeys = getSelectionRangeKeys(orderedKeys, effectiveAnchorKey, targetKey);

    if (mode === 'checkbox') {
      const shouldSelect = checked ?? !isTargetSelected;
      return {
        selectedKeys: shouldSelect
          ? uniqueKeys([...selectedKeys, ...rangeKeys])
          : selectedKeys.filter((key) => !rangeKeys.includes(key)),
        anchorKey: effectiveAnchorKey ?? targetKey,
      };
    }

    return {
      selectedKeys: rangeKeys,
      anchorKey: effectiveAnchorKey ?? targetKey,
    };
  }

  if (mode === 'row') {
    if (shouldToggle) {
      return {
        selectedKeys: isTargetSelected
          ? selectedKeys.filter((key) => key !== targetKey)
          : uniqueKeys([...selectedKeys, targetKey]),
        anchorKey: targetKey,
      };
    }

    return {
      selectedKeys: [targetKey],
      anchorKey: targetKey,
    };
  }

  const shouldSelect = checked ?? !isTargetSelected;
  return {
    selectedKeys: shouldSelect
      ? uniqueKeys([...selectedKeys, targetKey])
      : selectedKeys.filter((key) => key !== targetKey),
    anchorKey: targetKey,
  };
}

export function moveSelectedItemsByOne<T>(
  orderedItems: T[],
  selectedItems: T[],
  direction: 'up' | 'down',
): T[] {
  if (orderedItems.length <= 1 || selectedItems.length === 0) {
    return orderedItems;
  }

  const selectedSet = new Set(selectedItems);
  const next = [...orderedItems];

  if (direction === 'up') {
    for (let index = 1; index < next.length; index += 1) {
      if (selectedSet.has(next[index]) && !selectedSet.has(next[index - 1])) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      }
    }

    return next;
  }

  for (let index = next.length - 2; index >= 0; index -= 1) {
    if (selectedSet.has(next[index]) && !selectedSet.has(next[index + 1])) {
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
    }
  }

  return next;
}

export function moveSelectedItemsToTarget<T>(
  orderedItems: T[],
  selectedItems: T[],
  sourceIndex: number,
  targetIndex: number,
): T[] {
  if (
    orderedItems.length <= 1
    || selectedItems.length === 0
    || sourceIndex < 0
    || targetIndex < 0
    || sourceIndex >= orderedItems.length
    || targetIndex >= orderedItems.length
    || sourceIndex === targetIndex
  ) {
    return orderedItems;
  }

  const sourceItem = orderedItems[sourceIndex];
  const targetItem = orderedItems[targetIndex];
  const selectedSet = new Set(selectedItems);
  const effectiveSelectedItems = selectedSet.has(sourceItem)
    ? orderedItems.filter((item) => selectedSet.has(item))
    : [sourceItem];

  if (effectiveSelectedItems.length === 0) {
    return orderedItems;
  }

  const effectiveSelectedSet = new Set(effectiveSelectedItems);
  if (effectiveSelectedSet.has(targetItem)) {
    return orderedItems;
  }

  const remainingItems = orderedItems.filter((item) => !effectiveSelectedSet.has(item));
  const targetRemainingIndex = remainingItems.indexOf(targetItem);
  if (targetRemainingIndex === -1) {
    return orderedItems;
  }

  const insertionIndex = sourceIndex < targetIndex
    ? targetRemainingIndex + 1
    : targetRemainingIndex;
  const next = [...remainingItems];
  next.splice(insertionIndex, 0, ...effectiveSelectedItems);
  return next;
}