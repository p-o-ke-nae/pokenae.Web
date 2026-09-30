type ChangeNoteItem = {
  slug: string;
  displayName: string;
};

type InfoLinkItem = {
  slug: string;
  href?: string;
  status?: string;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function isInfoLinkItem(value: unknown): value is InfoLinkItem {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).slug === "string";
}

function hasChanged(before: unknown, after: unknown) {
  return stableStringify(before) !== stableStringify(after);
}

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
    return before !== undefined && hasChanged(before, item);
  });
  const removed = previous.filter((item) => !nextBySlug.has(item.slug));

  return [
    added.length ? `${added.map((item) => item.displayName).join("、")}を追加` : "",
    updated.length ? `${updated.map((item) => item.displayName).join("、")}を更新` : "",
    removed.length ? `${removed.map((item) => item.displayName).join("、")}を削除` : "",
  ].filter(Boolean).join("、") || `${label}一覧を更新`;
}

export function buildContentInfoHref(
  kind: "tools" | "apps",
  previousValue: unknown,
  nextValue: unknown,
): string {
  const fallback = kind === "tools" ? "/tools" : "/apps";
  const previous = Array.isArray(previousValue) ? previousValue.filter(isInfoLinkItem) : [];
  const next = Array.isArray(nextValue) ? nextValue.filter(isInfoLinkItem) : [];
  const previousBySlug = new Map(previous.map((item) => [item.slug, item]));
  const changedItems = next.filter((item) => {
    const before = previousBySlug.get(item.slug);
    return before === undefined || hasChanged(before, item);
  });
  if (changedItems.length !== 1) return fallback;

  const item = changedItems[0];
  if (kind === "tools") {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) ? `/tools/${item.slug}` : fallback;
  }
  return item.status === "published"
    && typeof item.href === "string"
    && /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(item.href)
    ? item.href
    : fallback;
}
