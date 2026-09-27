import type { ContentSnapshot, ContentUpdate } from "./types";
import { isPublishedPost } from "./post-publication";

export type PublicContentItem = {
  id: string;
  source: "post" | "tool" | "app";
  slug: string;
  title: string;
  description: string;
  publishedAt?: string;
  metaLabel?: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  tags: string[];
  relatedTags: string[];
  priority: number;
  showInPickup: boolean;
};

export type ContentUpdateGroup = {
  date: string;
  updates: ContentUpdate[];
};

const PUBLIC_LIST_ROUTES = new Set(["/tools", "/apps", "/blog", "/pickup", "/info"]);
const PUBLIC_STATIC_ROUTES = new Set(["/contact", "/terms-of-service", "/privacy-policy"]);

export function formatContentDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (!match) throw new TypeError(`Invalid content date: ${value}`);

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    throw new TypeError(`Invalid content date: ${value}`);
  }

  return `${yearText}-${monthText}-${dayText}`;
}

export function shouldShowUpdatedDate(publishedAt: string, updatedAt?: string): updatedAt is string {
  if (!updatedAt) return false;
  const publishedTime = Date.parse(publishedAt);
  const updatedTime = Date.parse(updatedAt);
  return Number.isFinite(publishedTime) && Number.isFinite(updatedTime) && updatedTime > publishedTime;
}

export function groupContentUpdatesByDate(updates: ContentUpdate[]): ContentUpdateGroup[] {
  const groups = new Map<string, ContentUpdate[]>();

  for (const update of updates) {
    const date = formatContentDate(update.publishedAt);
    const group = groups.get(date);
    if (group) {
      group.push(update);
    } else {
      groups.set(date, [update]);
    }
  }

  return [...groups].map(([date, groupedUpdates]) => ({
    date,
    updates: groupedUpdates,
  }));
}

export function selectInfoUpdates(updates: ContentUpdate[], now = Date.now()): ContentUpdate[] {
  return updates
    .filter((item) => Date.parse(item.publishedAt) <= now && !item.skipInfo && (
      item.target === "post" || item.target === "tool" || item.target === "app"
    ))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function toPublicContentItems(snapshot: ContentSnapshot, now = Date.now()): PublicContentItem[] {
  const posts: PublicContentItem[] = snapshot.posts
    .filter((post) => isPublishedPost(post, now))
    .map((post) => ({
      id: `post:${post.slug}`,
      source: "post",
      slug: post.slug,
      title: post.title,
      description: post.summary,
      publishedAt: post.publishedAt,
      imageSrc: post.thumbnail ?? "/pokenaeLogo.png",
      imageAlt: "",
      href: `/blog/${post.slug}`,
      tags: post.tags,
      relatedTags: post.relatedTags,
      priority: post.priority,
      showInPickup: post.showInPickup,
    }));

  const tools: PublicContentItem[] = snapshot.tools.map((tool) => ({
    id: `tool:${tool.slug}`,
    source: "tool",
    slug: tool.slug,
    title: tool.name,
    description: tool.summary,
    metaLabel: tool.kind === "library" ? "ライブラリ" : "Windows アプリ",
    imageSrc: tool.image ?? "/pokenaeLogo.png",
    imageAlt: "",
    href: `/tools/${tool.slug}`,
    tags: tool.tags,
    relatedTags: [],
    priority: tool.priority ?? 0,
    showInPickup: tool.showInPickup ?? false,
  }));

  const apps: PublicContentItem[] = snapshot.apps
    .filter((app) => app.status === "published")
    .map((app) => ({
      id: `app:${app.slug}`,
      source: "app",
      slug: app.slug,
      title: app.name,
      description: app.summary,
      metaLabel: app.metaLabel ?? "Webアプリ",
      imageSrc: app.image ?? "/pokenaeLogo.png",
      imageAlt: app.imageAlt,
      href: app.href,
      tags: app.tags,
      relatedTags: [],
      priority: 1000 - app.order,
      showInPickup: false,
    }));

  return [...posts, ...tools, ...apps];
}

export function selectPickupItems(items: PublicContentItem[], limit?: number): PublicContentItem[] {
  const selected = items
    .filter((item) => item.showInPickup)
    .sort(comparePriorityThenRecent);
  return limit === undefined ? selected : selected.slice(0, limit);
}

export function selectRelatedItems(
  items: PublicContentItem[],
  pathname: string,
  limit = 4,
): PublicContentItem[] {
  const normalizedPath = normalizePath(pathname);
  const current = items.find((item) => item.href === normalizedPath);
  const candidates = items.filter((item) => item.href !== normalizedPath);
  if (!current) return candidates.sort(compareRecentThenPriority).slice(0, limit);

  const currentTags = normalizedTags([...current.tags, ...current.relatedTags]);
  if (!currentTags.size) return candidates.sort(compareRecentThenPriority).slice(0, limit);

  return candidates
    .map((item) => ({
      item,
      score: [...normalizedTags([...item.tags, ...item.relatedTags])]
        .filter((tag) => currentTags.has(tag)).length,
    }))
    .sort((left, right) => (
      right.score - left.score
      || compareRecentThenPriority(left.item, right.item)
    ))
    .slice(0, limit)
    .map(({ item }) => item);
}

export function shouldShowPublicSidebar(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname);
  return PUBLIC_LIST_ROUTES.has(normalizedPath)
    || PUBLIC_STATIC_ROUTES.has(normalizedPath)
    || normalizedPath.startsWith("/blog/")
    || normalizedPath.startsWith("/tools/");
}

function normalizePath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function normalizedTags(tags: string[]): Set<string> {
  return new Set(tags.map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean));
}

function comparePriorityThenRecent(left: PublicContentItem, right: PublicContentItem): number {
  return right.priority - left.priority
    || compareRecentThenPriority(left, right)
    || left.id.localeCompare(right.id);
}

function compareRecentThenPriority(left: PublicContentItem, right: PublicContentItem): number {
  return (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")
    || right.priority - left.priority
    || left.id.localeCompare(right.id);
}
