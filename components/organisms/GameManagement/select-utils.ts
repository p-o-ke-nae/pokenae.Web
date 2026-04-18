import type { SelectOption } from '../../../lib/game-management/types';

export function hasEmptySelectOption(items: SelectOption[]): boolean {
  return items.some((item) => item.value === '');
}

export function shouldRenderSelectPlaceholder(options: SelectOption[], placeholder?: string): boolean {
  return Boolean(placeholder) && !hasEmptySelectOption(options);
}