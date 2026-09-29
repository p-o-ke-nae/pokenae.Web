import type { ValidationIssue } from "./canonical-validation";

function toIndex(part: string | number | undefined) {
  if (typeof part === "number") return Number.isInteger(part) && part >= 0 ? part : null;
  if (typeof part === "string" && /^\d+$/.test(part)) return Number(part);
  return null;
}

/**
 * 検証エラーのうち、指定した一覧（例: banners）の行を指すもののインデックスを返す。
 * `banners.0.id` 形式と、一覧名を省略した `0.id` 形式の両方を扱う。
 */
export function collectInvalidIndexes(issues: readonly ValidationIssue[], listName: string): Set<number> {
  const indexes = new Set<number>();
  for (const { path } of issues) {
    const index = path[0] === listName ? toIndex(path[1]) : toIndex(path[0]);
    if (index !== null) indexes.add(index);
  }
  return indexes;
}

/** datetime-local 形式の値をグリッド表示用に整形する。 */
export function formatGridDateTime(value: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "";
}
