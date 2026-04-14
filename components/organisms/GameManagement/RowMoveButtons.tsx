'use client';

/**
 * 行の上下移動ボタン
 *
 * DataTable の操作列内で使用される。上 / 下のみの単純な UI で、
 * 実際の並び替えロジックは親コンポーネントの onMove ハンドラに委譲する。
 */

type RowMoveButtonsProps = {
  /** この行が最上行かどうか */
  isFirst: boolean;
  /** この行が最下行かどうか */
  isLast: boolean;
  /** 並び替え操作全体が無効化されているか */
  disabled?: boolean;
  /** 上に移動 */
  onMoveUp: () => void;
  /** 下に移動 */
  onMoveDown: () => void;
};

export default function RowMoveButtons({ isFirst, isLast, disabled = false, onMoveUp, onMoveDown }: RowMoveButtonsProps) {
  return (
    <span className="row-move-buttons">
      <button
        type="button"
        className="row-move-buttons__btn"
        onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
        disabled={disabled || isFirst}
        aria-label="上に移動"
        title="上に移動"
      >
        ▲
      </button>
      <button
        type="button"
        className="row-move-buttons__btn"
        onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
        disabled={disabled || isLast}
        aria-label="下に移動"
        title="下に移動"
      >
        ▼
      </button>

      <style jsx>{`
        .row-move-buttons {
          display: inline-flex;
          gap: 0.125rem;
          align-items: center;
        }

        .row-move-buttons__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border: 1px solid var(--color-base-70-dark);
          border-radius: 0.25rem;
          background-color: var(--color-base-70-light);
          color: var(--color-text-strong);
          font-size: 0.625rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: background-color 100ms ease, opacity 100ms ease;
        }

        .row-move-buttons__btn:hover:not(:disabled) {
          background-color: color-mix(
            in srgb,
            var(--color-accent-25) 12%,
            var(--color-base-70-light)
          );
        }

        .row-move-buttons__btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>
    </span>
  );
}
