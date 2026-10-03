/**
 * DialogFooterLayout の行分け・列数を決める純粋ロジック。
 *
 * モバイル表示では、フッターのボタンを「グループ = 1行」として扱い、
 * 行内のボタンは均等幅のグリッドに並べる。
 * - 明示的なグループ（ResponsiveActionGroup）は1行にまとめる
 * - グループ化されていない連続したボタンは1つのグループとして扱う
 * - ボタン以外の要素（件数表示など）は1行を占有する
 * - trailing の最後のボタン（主要操作）は単独の全幅行に分離する
 */

export type FooterToken<T> =
  | { type: 'action'; item: T }
  | { type: 'group'; items: T[]; label?: string }
  | { type: 'block'; item: T };

export type FooterRow<T> =
  | { kind: 'actions'; items: T[]; columns: number; lastItemSpan: number; label?: string }
  | { kind: 'block'; item: T };

/** モバイル時の1行あたりの最大列数。3列を超えると 320px 幅で文言が収まらない。 */
export const FOOTER_MOBILE_MAX_COLUMNS = 3;

/**
 * ボタン数からモバイル時の列数を決める。
 * 1〜3件は1行に均等配置し、4件以上は2列で折り返す。
 */
export function resolveMobileColumns(count: number, maxColumns: number = FOOTER_MOBILE_MAX_COLUMNS): number {
  if (count <= 1) return 1;
  const cap = Math.max(1, Math.min(maxColumns, FOOTER_MOBILE_MAX_COLUMNS));
  if (count <= cap) return count;
  return Math.min(2, cap);
}

/**
 * 最終行が埋まらない場合に最後のボタンが占有する列数。
 * 例: 5件・2列なら最後の1件が2列分（全幅）を使い、空きセルを作らない。
 */
export function resolveLastItemSpan(count: number, columns: number): number {
  if (count <= 0 || columns <= 1) return 1;
  const remainder = count % columns;
  return remainder === 0 ? 1 : columns - remainder + 1;
}

function toActionsRow<T>(items: T[], maxColumns?: number, label?: string): FooterRow<T> {
  const columns = resolveMobileColumns(items.length, maxColumns);
  const row: FooterRow<T> = { kind: 'actions', items, columns, lastItemSpan: resolveLastItemSpan(items.length, columns) };
  return label ? { ...row, label } : row;
}

export type PlanFooterRowsOptions = {
  /** 最後のボタンを主要操作として単独行に分離する（trailing 用） */
  separatePrimary?: boolean;
  /** 1行あたりの最大列数（既定 3） */
  maxColumns?: number;
};

export function planFooterRows<T>(tokens: FooterToken<T>[], options: PlanFooterRowsOptions = {}): FooterRow<T>[] {
  const groups: Array<{ kind: 'actions'; items: T[]; label?: string } | { kind: 'block'; item: T }> = [];
  let pending: T[] = [];

  const flushPending = () => {
    if (pending.length > 0) {
      groups.push({ kind: 'actions', items: pending });
      pending = [];
    }
  };

  for (const token of tokens) {
    if (token.type === 'action') {
      pending.push(token.item);
      continue;
    }
    flushPending();
    if (token.type === 'group') {
      if (token.items.length > 0) groups.push({ kind: 'actions', items: [...token.items], label: token.label });
    } else {
      groups.push({ kind: 'block', item: token.item });
    }
  }
  flushPending();

  if (options.separatePrimary) {
    const last = groups[groups.length - 1];
    if (last && last.kind === 'actions' && last.items.length > 1) {
      const primary = last.items[last.items.length - 1];
      groups.splice(groups.length - 1, 1, { kind: 'actions', items: last.items.slice(0, -1), label: last.label }, { kind: 'actions', items: [primary] });
    }
  }

  return groups.map((group) => (group.kind === 'actions' ? toActionsRow(group.items, options.maxColumns, group.label) : group));
}
