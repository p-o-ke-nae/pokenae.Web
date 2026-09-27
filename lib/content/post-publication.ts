import type { Post } from "./types";
import type { PostWriteRequest } from "./schemas";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function toJapanDateInputValue(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function normalizePostPublishedAt(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return value;

  const [, yearText, monthText, dayText] = match;
  if (!isValidDateParts(Number(yearText), Number(monthText), Number(dayText))) {
    return value;
  }
  return `${value}T00:00:00+09:00`;
}

export function preparePostForWrite(
  post: PostWriteRequest["post"],
  existing: boolean,
  now = new Date(),
): PostWriteRequest["post"] {
  const publishedAt = normalizePostPublishedAt(post.publishedAt);
  const result = { ...post, publishedAt };
  delete result.updatedAt;
  const publishedTime = Date.parse(publishedAt);

  if (existing && Number.isFinite(publishedTime) && now.getTime() > publishedTime) {
    result.updatedAt = now.toISOString();
  }
  return result;
}

export function getPostUpdatePublishedAt(publishedAt: string, now = new Date()) {
  const publishedTime = Date.parse(publishedAt);
  return Number.isFinite(publishedTime) && publishedTime > now.getTime()
    ? publishedAt
    : now.toISOString();
}

export function isPublishedPost(
  post: Pick<Post, "status" | "publishedAt">,
  now = Date.now(),
) {
  const publishedTime = Date.parse(normalizePostPublishedAt(post.publishedAt));
  return post.status === "published"
    && Number.isFinite(publishedTime)
    && publishedTime <= now;
}
