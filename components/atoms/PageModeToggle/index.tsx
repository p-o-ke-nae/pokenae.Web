'use client';

import { forwardRef } from 'react';
import type { PageMode } from '@/lib/game-management/resources';

export type PageModeToggleProps = {
  /** 現在のモード */
  mode: PageMode;
  /** モード変更コールバック */
  onChange: (mode: PageMode) => void;
  /** 無効状態 */
  disabled?: boolean;
  /** 追加クラス名 */
  className?: string;
};

/**
 * iOS 風スライドトグルスイッチで閲覧/編集モードを切り替えるコンポーネント。
 */
const PageModeToggle = forwardRef<HTMLButtonElement, PageModeToggleProps>(
  ({ mode, onChange, disabled = false, className = '' }, ref) => {
    const isEdit = mode === 'edit';

    return (
      <>
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={isEdit}
          aria-label={isEdit ? '編集モード ON — クリックで閲覧モードに切り替え' : '閲覧モード — クリックで編集モードに切り替え'}
          disabled={disabled}
          className={[
            'page-mode-toggle',
            isEdit ? 'page-mode-toggle--edit' : 'page-mode-toggle--view',
            disabled ? 'page-mode-toggle--disabled' : '',
            className,
          ].filter(Boolean).join(' ')}
          onClick={() => onChange(isEdit ? 'view' : 'edit')}
        >
          <span className="page-mode-toggle__track">
            <span className="page-mode-toggle__knob" />
          </span>
          <span className="page-mode-toggle__label">
            {isEdit ? '編集モード' : '閲覧モード'}
          </span>
        </button>

        <style jsx>{`
          .page-mode-toggle {
            display: inline-flex;
            align-items: center;
            gap: 0.625rem;
            padding: 0;
            border: none;
            background: none;
            cursor: pointer;
            user-select: none;
            font-size: 0.875rem;
            font-weight: 600;
            line-height: 1;
            color: var(--color-text-strong);
            transition: opacity 120ms ease;
          }

          .page-mode-toggle:focus-visible {
            outline: 2px solid var(--color-accent-25);
            outline-offset: 4px;
            border-radius: 1rem;
          }

          .page-mode-toggle--disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .page-mode-toggle__track {
            position: relative;
            display: inline-flex;
            align-items: center;
            width: 2.75rem;
            height: 1.5rem;
            border-radius: 0.75rem;
            transition: background-color 200ms ease, box-shadow 200ms ease;
            flex-shrink: 0;
          }

          .page-mode-toggle--view .page-mode-toggle__track {
            background-color: var(--color-base-70-dark);
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
          }

          .page-mode-toggle--edit .page-mode-toggle__track {
            background-color: var(--color-accent-25);
            box-shadow:
              inset 0 1px 3px rgba(0, 0, 0, 0.08),
              0 0 8px color-mix(in srgb, var(--color-accent-25) 35%, transparent);
          }

          .page-mode-toggle__knob {
            position: absolute;
            top: 0.1875rem;
            left: 0.1875rem;
            width: 1.125rem;
            height: 1.125rem;
            border-radius: 50%;
            background: white;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
            transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
          }

          .page-mode-toggle--edit .page-mode-toggle__knob {
            transform: translateX(1.25rem);
          }

          .page-mode-toggle__label {
            white-space: nowrap;
          }

          .page-mode-toggle--view .page-mode-toggle__label {
            color: color-mix(in srgb, var(--color-text-strong) 72%, transparent);
          }

          .page-mode-toggle--edit .page-mode-toggle__label {
            color: var(--color-accent-25-strong);
          }
        `}</style>
      </>
    );
  },
);

PageModeToggle.displayName = 'PageModeToggle';

export default PageModeToggle;
