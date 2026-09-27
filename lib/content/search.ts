import { tagIdSchema } from "./schemas";
import type { TagDefinition } from "./types";

export type ContentSearchParams = {
  q?: string | string[];
  tags?: string | string[];
};

export type ContentSearch = {
  query: string;
  tagIds: string[];
  invalidTag: boolean;
};

export function parseContentSearch(params: ContentSearchParams): ContentSearch {
  const tagValues = params.tags === undefined ? [] : Array.isArray(params.tags) ? params.tags : [params.tags];
  const parsedTags = tagValues.map((tag) => tagIdSchema.safeParse(tag));
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return {
    query: query?.trim() ?? "",
    tagIds: [...new Set(parsedTags.flatMap((tag) => tag.success ? [tag.data] : []))],
    invalidTag: parsedTags.some((tag) => !tag.success),
  };
}

export function matchesContentSearch(
  item: { title: string; tags: readonly string[] },
  search: ContentSearch,
) {
  if (search.invalidTag) return false;
  const normalizedQuery = search.query.toLocaleLowerCase("ja-JP");
  return (!normalizedQuery || item.title.toLocaleLowerCase("ja-JP").includes(normalizedQuery))
    && search.tagIds.every((tag) => item.tags.includes(tag));
}

export function searchResultLabel(count: number, invalidTag: boolean) {
  return invalidTag ? "タグの指定が不正です。" : `${count}件`;
}

export function selectedTagDefinitions(tagDefinitions: readonly TagDefinition[], tagIds: readonly string[]) {
  const selected = new Set(tagIds);
  return tagDefinitions.filter((tag) => selected.has(tag.id));
}
