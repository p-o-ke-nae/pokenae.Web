import matter from "gray-matter";
import { tagDefinitionListSchema, updateContentSchema } from "./schemas";
import type { TagDefinition } from "./types";
import { validateCanonicalJson, type ValidationIssue } from "./canonical-validation";

type TagWriteInput = {
  rawValue: unknown;
  currentTags: readonly TagDefinition[];
  reservedTags?: readonly TagDefinition[];
  postSources: ReadonlyArray<{ path: string; source: string }>;
  updateSchema: string;
  updatePath: string;
  updateId: string;
  summary: string;
  publishedAt?: string;
};

export function allocateNextTagId(tagSets: ReadonlyArray<ReadonlyArray<Pick<TagDefinition, "id">>>) {
  const maximum = tagSets.flatMap((tags) => tags)
    .reduce((current, tag) => Math.max(current, Number(tag.id)), 0);
  if (!Number.isSafeInteger(maximum) || maximum >= 999999) {
    throw new RangeError("新しいtag IDを採番できません。");
  }
  return String(maximum + 1).padStart(6, "0");
}

export function assignNewTagIds(
  rawValue: unknown,
  currentTags: readonly TagDefinition[],
  reservedTags: readonly TagDefinition[] = [],
) {
  if (!Array.isArray(rawValue)) return rawValue;
  const used = new Set([...currentTags, ...reservedTags].map((tag) => tag.id));
  let nextId: string | undefined;
  return rawValue.map((entry) => {
    if (typeof entry !== "object" || entry === null) return entry;
    const tag = entry as { id?: unknown; label?: unknown };
    if (typeof tag.id === "string" && tag.id && !tag.id.startsWith("new-")) return entry;
    nextId ??= allocateNextTagId([currentTags, reservedTags]);
    while (used.has(nextId)) {
      nextId = String(Number(nextId) + 1).padStart(6, "0");
    }
    if (nextId === "1000000") throw new RangeError("新しいtag IDを採番できません。");
    used.add(nextId);
    const assigned = { ...tag, id: nextId };
    nextId = String(Number(nextId) + 1).padStart(6, "0");
    return assigned;
  });
}

export function assignNewTagsToPost<T extends { tags: string[]; relatedTags: string[] }>(
  rawDefinitions: unknown,
  post: T,
  currentTags: readonly TagDefinition[],
  reservedTags: readonly TagDefinition[] = [],
) {
  const assigned = assignNewTagIds(rawDefinitions, currentTags, reservedTags);
  if (!Array.isArray(rawDefinitions) || !Array.isArray(assigned)) return { definitions: assigned, post };
  const replacements = new Map<string, string>();
  rawDefinitions.forEach((entry, index) => {
    if (
      typeof entry !== "object"
      || entry === null
      || typeof assigned[index] !== "object"
      || assigned[index] === null
    ) return;
    const before = (entry as { id?: unknown }).id;
    const after = (assigned[index] as { id?: unknown }).id;
    if (typeof before === "string" && typeof after === "string" && before !== after) {
      replacements.set(before, after);
    }
  });
  const replace = (ids: string[]) => ids.map((id) => replacements.get(id) ?? id);
  return {
    definitions: assigned,
    post: { ...post, tags: replace(post.tags), relatedTags: replace(post.relatedTags) },
  };
}

type TagWriteResult =
  | { success: true; tags: TagDefinition[]; files: Array<{ path: string; content: string }> }
  | { success: false; issues: ValidationIssue[] };

function zodIssues(issues: Array<{ path: PropertyKey[]; message: string }>): ValidationIssue[] {
  return issues.map((issue) => ({
    path: ["tags", ...issue.path.filter((part): part is string | number => (
      typeof part === "string" || typeof part === "number"
    ))],
    message: issue.message,
  }));
}

export function serializeTagFiles(tags: readonly TagDefinition[]) {
  const ordered = [...tags].sort((left, right) => left.id.localeCompare(right.id));
  return [
    { path: "fixtures/tags.json", content: `${JSON.stringify(ordered.map((tag) => tag.id), null, 2)}\n` },
    {
      path: "fixtures/tag-labels.json",
      content: `${JSON.stringify(Object.fromEntries(ordered.map((tag) => [tag.id, tag.label])), null, 2)}\n`,
    },
  ];
}

export function prepareTagWrite(input: TagWriteInput): TagWriteResult {
  const parsed = tagDefinitionListSchema.safeParse(assignNewTagIds(
    input.rawValue,
    input.currentTags,
    input.reservedTags,
  ));
  if (!parsed.success) return { success: false, issues: zodIssues(parsed.error.issues) };

  const nextIds = new Set(parsed.data.map((tag) => tag.id));
  const removedIds = new Set(input.currentTags.map((tag) => tag.id).filter((id) => !nextIds.has(id)));
  const files = serializeTagFiles(parsed.data);

  for (const post of input.postSources) {
    const parsedPost = matter(post.source);
    const currentTags = Array.isArray(parsedPost.data.tags) ? parsedPost.data.tags : [];
    const currentRelatedTags = Array.isArray(parsedPost.data.relatedTags) ? parsedPost.data.relatedTags : [];
    const tags = currentTags.filter((tag): tag is string => typeof tag === "string" && !removedIds.has(tag));
    const relatedTags = currentRelatedTags.filter((tag): tag is string => typeof tag === "string" && !removedIds.has(tag));
    if (tags.length !== currentTags.length || relatedTags.length !== currentRelatedTags.length) {
      files.push({
        path: post.path,
        content: matter.stringify(parsedPost.content, { ...parsedPost.data, tags, relatedTags }),
      });
    }
  }

  const update = updateContentSchema.parse({
    id: input.updateId,
    publishedAt: input.publishedAt ?? new Date().toISOString(),
    target: "navigation",
    summary: input.summary,
    href: "/",
    visible: false,
  });
  const updateIssues = validateCanonicalJson(input.updateSchema, update);
  if (updateIssues.length) {
    return {
      success: false,
      issues: updateIssues.map((issue) => ({ ...issue, path: ["update", ...issue.path] })),
    };
  }
  files.push({ path: input.updatePath, content: `${JSON.stringify(update, null, 2)}\n` });
  return { success: true, tags: parsed.data, files };
}
