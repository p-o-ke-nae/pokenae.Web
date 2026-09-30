type ChangeNoteItem = {
  slug: string;
  displayName: string;
};

export function buildContentChangeNote<T extends ChangeNoteItem>(
  label: string,
  previous: readonly T[],
  next: readonly T[],
): string {
  const previousBySlug = new Map(previous.map((item) => [item.slug, item]));
  const nextBySlug = new Map(next.map((item) => [item.slug, item]));
  const added = next.filter((item) => !previousBySlug.has(item.slug));
  const updated = next.filter((item) => {
    const before = previousBySlug.get(item.slug);
    return before !== undefined && JSON.stringify(before) !== JSON.stringify(item);
  });
  const removed = previous.filter((item) => !nextBySlug.has(item.slug));

  return [
    added.length ? `${added.map((item) => item.displayName).join("、")}を追加` : "",
    updated.length ? `${updated.map((item) => item.displayName).join("、")}を更新` : "",
    removed.length ? `${removed.map((item) => item.displayName).join("、")}を削除` : "",
  ].filter(Boolean).join("、") || `${label}一覧を更新`;
}
