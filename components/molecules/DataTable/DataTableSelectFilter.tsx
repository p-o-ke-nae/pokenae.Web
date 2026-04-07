'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import resources from '@/lib/resources';
import styles from './DataTableSelectFilter.module.css';

type DataTableSelectFilterProps = {
  /** 列の全データから算出したユニークな値一覧 */
  options: string[];
  /** 現在選択中の値一覧（undefined = 全表示、空配列 = 全解除） */
  selectedValues?: string[];
  /** 選択変更コールバック */
  onChange: (values: string[] | undefined) => void;
  /** ラベル（アクセシビリティ用） */
  label?: string;
};

function getScrollableAncestors(element: HTMLElement | null): HTMLElement[] {
  const ancestors: HTMLElement[] = [];
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    const overflowY = style.overflowY;
    const isScrollable = /(auto|scroll|overlay)/.test(`${overflowX} ${overflowY}`)
      || current.scrollWidth > current.clientWidth
      || current.scrollHeight > current.clientHeight;

    if (isScrollable) {
      ancestors.push(current);
    }

    current = current.parentElement;
  }

  return ancestors;
}

export function DataTableSelectFilter({
  options,
  selectedValues,
  onChange,
  label,
}: DataTableSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [filterText, setFilterText] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = dropdownRef.current?.offsetWidth ?? 288;
    const dropdownHeight = dropdownRef.current?.offsetHeight ?? 240;
    const nextLeft = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - dropdownWidth - 8));
    const preferredTop = rect.bottom + 4;
    const nextTop = preferredTop + dropdownHeight > window.innerHeight - 8
      ? Math.max(8, rect.top - dropdownHeight - 4)
      : preferredTop;

    setDropdownPos({ top: nextTop, left: nextLeft });
  }, []);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const scrollableAncestors = getScrollableAncestors(containerRef.current);
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    updateDropdownPosition();
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    scrollableAncestors.forEach((ancestor) => ancestor.addEventListener('scroll', updateDropdownPosition, { passive: true }));
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
      scrollableAncestors.forEach((ancestor) => ancestor.removeEventListener('scroll', updateDropdownPosition));
    };
  }, [open, updateDropdownPosition]);

  // ドロップダウン位置を trigger ボタン基準で算出（fixed 配置用）
  const openDropdown = useCallback(() => {
    updateDropdownPosition();
    setOpen(prev => !prev);
    setFilterText('');
  }, [updateDropdownPosition]);

  const normalizedSelectedValues = useMemo(() => selectedValues ?? [], [selectedValues]);
  const isAllSelected = selectedValues === undefined;
  const isNoneSelected = !isAllSelected && normalizedSelectedValues.length === 0;
  const isPartiallySelected = !isAllSelected && !isNoneSelected;
  const activeCount = isAllSelected ? options.length : normalizedSelectedValues.length;

  const filteredOptions = useMemo(() => {
    if (!filterText) return options;
    const lower = filterText.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(lower));
  }, [options, filterText]);

  const handleToggle = useCallback(
    (value: string) => {
      if (isAllSelected) {
        // 全選択状態から 1 つ外す → 残りを選択
        onChange(options.filter(v => v !== value));
      } else if (normalizedSelectedValues.includes(value)) {
        const next = normalizedSelectedValues.filter(v => v !== value);
        onChange(next);
      } else {
        const next = [...normalizedSelectedValues, value];
        onChange(next.length >= options.length ? undefined : next);
      }
    },
    [normalizedSelectedValues, onChange, options, isAllSelected],
  );

  const handleToggleAll = useCallback((checked: boolean) => {
    onChange(checked ? undefined : []);
  }, [onChange]);

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const triggerLabel = isAllSelected
    ? resources.dataTable.filterSelectAll
    : `${activeCount}${resources.dataTable.filterSelectCount}`;

  return (
      <div className={styles.root} ref={containerRef}>
        <button
          type="button"
          ref={triggerRef}
          className={[styles.trigger, !isAllSelected ? styles.triggerActive : ''].filter(Boolean).join(' ')}
          onClick={openDropdown}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label ? `${label}${resources.dataTable.filter}` : resources.dataTable.filter}
        >
          <span className={styles.triggerText}>{triggerLabel}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M2 3.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open && (
          <div
            ref={dropdownRef}
            className={styles.dropdown}
            role="dialog"
            aria-label={label}
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {options.length > 8 && (
              <input
                className={styles.search}
                type="text"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder={resources.dataTable.filterPlaceholder}
                autoFocus
              />
            )}
            <div className={styles.list}>
              <label className={[styles.option, styles.optionSticky].join(' ')}>
                <CustomCheckBox
                  checked={isAllSelected}
                  ref={element => {
                    if (element) {
                      element.indeterminate = isPartiallySelected;
                    }
                  }}
                  disabled={options.length === 0}
                  onChange={event => handleToggleAll(event.target.checked)}
                  aria-label={label ? `${label}の全体選択` : '全体選択'}
                />
                <span className={styles.optionText}>
                  全体選択 / 未選択
                </span>
              </label>
              {filteredOptions.map(option => {
                const checked = isAllSelected || normalizedSelectedValues.includes(option);
                return (
                  <label key={option} className={styles.option}>
                    <CustomCheckBox
                      checked={checked}
                      onChange={() => handleToggle(option)}
                    />
                    <span className={styles.optionText}>
                      {option || '(空)'}
                    </span>
                  </label>
                );
              })}
              {filteredOptions.length === 0 && (
                <p className={styles.empty}>
                  {resources.searchField.noResults}
                </p>
              )}
            </div>
            {!isAllSelected && (
              <button
                type="button"
                className={styles.clear}
                onClick={handleClearAll}
              >
                {resources.dataTable.filterClearAll}
              </button>
            )}
          </div>
        )}
      </div>
  );
}
