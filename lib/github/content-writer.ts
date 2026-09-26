import "server-only";
import matter from "gray-matter";
import { getOptionalInstallationToken, getRequiredInstallationToken } from "./app-auth";
import { materializeGitTreeEntries, type ContentFileChange } from "./tree-changes";
import { ContentConflictError } from "./content-conflict";
import { getContentRevisionFiles, getFreshContentSnapshotWithRevision } from "../content/repository";
import type { TagDefinition } from "../content/types";

const OWNER = process.env.CONTENT_REPOSITORY_OWNER ?? "p-o-ke-nae";
const REPOSITORY = process.env.CONTENT_REPOSITORY_NAME ?? "pokenae.Content";
const BASE_BRANCH = process.env.CONTENT_REPOSITORY_REF ?? "main";

type CreatedPullRequest = {
  html_url: string;
  number: number;
  base: { sha: string };
};

type GitHubPullRequest = {
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft: boolean;
  changed_files: number;
  base: { ref: string; sha: string; repo: { full_name: string } };
  head: { ref: string; sha: string; repo: { full_name: string } | null };
};

export type ConfigKind = "banners" | "announcements" | "tools" | "tags";

export type EditableContentPullRequest = {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  branch: string;
  kind: ConfigKind;
  headRevision: string;
  baseRevision: string;
  updatePath: string;
};

export type EditableContentPullRequestSnapshot = EditableContentPullRequest & {
  value: unknown;
  update: unknown;
  paths: string[];
  toolPaths: string[];
  postSources: Array<{ path: string; source: string }>;
  schemas: { home: string; tool: string; update: string };
};

export type EditablePostPullRequest = {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  branch: string;
  slug: string;
  headRevision: string;
  baseRevision: string;
  updatePath: string;
};

export type EditablePostPullRequestSnapshot = EditablePostPullRequest & {
  source: string;
  updateSource?: string;
  tagDefinitions: Array<{ id: string; label: string }>;
};

export function normalizeLegacyPostTags(
  source: string,
  tagDefinitions: ReadonlyArray<{ id: string; label: string }>,
) {
  const parsed = matter(source);
  const definitionsById = new Map(tagDefinitions.map((tag) => [tag.id, tag]));
  const definitionsByLabel = new Map<string, typeof tagDefinitions[number][]>();
  for (const definition of tagDefinitions) {
    const matches = definitionsByLabel.get(definition.label) ?? [];
    matches.push(definition);
    definitionsByLabel.set(definition.label, matches);
  }

  function normalize(value: unknown, field: string) {
    if (!Array.isArray(value)) return value;
    return value.map((tag, index) => {
      if (typeof tag !== "string") {
        throw new ContentPullRequestError(`記事PRの${field}[${index}]はタグIDまたは表示名ではありません。`, 422);
      }
      if (definitionsById.has(tag)) return tag;
      const matches = definitionsByLabel.get(tag) ?? [];
      if (matches.length === 1) return matches[0].id;
      if (matches.length > 1) {
        throw new ContentPullRequestError(`記事PRの${field}[${index}]「${tag}」は複数のタグに一致するため変換できません。`, 422);
      }
      throw new ContentPullRequestError(`記事PRの${field}[${index}]「${tag}」に対応するタグIDがありません。タグ管理で定義を追加してから再試行してください。`, 422);
    });
  }

  const data = {
    ...parsed.data,
    tags: normalize(parsed.data.tags, "tags"),
    relatedTags: normalize(parsed.data.relatedTags, "relatedTags"),
  };
  return matter.stringify(parsed.content, data);
}

export class ContentPullRequestError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = "CONTENT_PR_INVALID") {
    super(message);
    this.name = "ContentPullRequestError";
  }
}

async function api<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPOSITORY}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function encodeRefPath(ref: string) {
  return ref.split("/").map(encodeURIComponent).join("/");
}

function expectedUpdatePath(branch: string) {
  return `content/updates/${branch.slice("content/".length)}.json`;
}

function branchKind(branch: string): ConfigKind | null {
  const match = /^content\/(banners|announcements|tools|tags)-\d{14}$/.exec(branch);
  return (match?.[1] as ConfigKind | undefined) ?? null;
}

function isAllowedConfigPath(kind: ConfigKind, path: string, updatePath: string) {
  if (path === updatePath) return true;
  if (kind === "banners") {
    return path === "content/home/banners.json"
      || /^content\/home\/images\/[a-z0-9][a-z0-9-]*\.webp$/.test(path);
  }
  if (kind === "announcements") return path === "content/home/announcements.json";
  if (kind === "tags") {
    return path === "fixtures/tags.json"
      || path === "fixtures/tag-labels.json"
      || /^content\/posts\/[^/]+\/index\.md$/.test(path);
  }
  return /^content\/tools\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(path);
}

function requiredConfigPaths(kind: ConfigKind) {
  if (kind === "banners") return ["content/home/banners.json"];
  if (kind === "announcements") return ["content/home/announcements.json"];
  if (kind === "tags") return ["fixtures/tags.json", "fixtures/tag-labels.json"];
  return [];
}

function assertEditableContentPullRequest(
  pullRequest: GitHubPullRequest,
  expectedKind?: ConfigKind,
): EditableContentPullRequest {
  const repository = `${OWNER}/${REPOSITORY}`;
  const kind = branchKind(pullRequest.head.ref);
  if (
    pullRequest.state !== "open"
    || pullRequest.base.ref !== BASE_BRANCH
    || pullRequest.base.repo.full_name !== repository
    || pullRequest.head.repo?.full_name !== repository
    || !kind
    || (expectedKind !== undefined && kind !== expectedKind)
  ) {
    throw new ContentPullRequestError("この Pull Request は管理画面から更新できません。", 403);
  }
  return {
    number: pullRequest.number,
    title: pullRequest.title,
    url: pullRequest.html_url,
    draft: pullRequest.draft,
    branch: pullRequest.head.ref,
    kind,
    headRevision: pullRequest.head.sha,
    baseRevision: pullRequest.base.sha,
    updatePath: expectedUpdatePath(pullRequest.head.ref),
  };
}

async function loadEditableContentPullRequest(number: number, kind: ConfigKind, token: string) {
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new ContentPullRequestError("Pull Request 番号が不正です。");
  }
  const pullRequest = await api<GitHubPullRequest>(`/pulls/${number}`, {}, token);
  const editable = assertEditableContentPullRequest(pullRequest, kind);
  if (pullRequest.changed_files > 100) {
    throw new ContentPullRequestError("変更ファイル数が上限を超えています。", 403);
  }
  const changedFiles = await api<Array<{ filename: string }>>(`/pulls/${number}/files?per_page=100`, {}, token);
  const paths = changedFiles.map((file) => file.filename);
  const requiredPaths = requiredConfigPaths(kind);
  if (
    !paths.includes(editable.updatePath)
    || requiredPaths.some((path) => !paths.includes(path))
    || (kind === "tools" && !paths.some((path) => /^content\/tools\/[^/]+\.json$/.test(path)))
    || paths.some((path) => !isAllowedConfigPath(kind, path, editable.updatePath))
  ) {
    throw new ContentPullRequestError("許可されていないファイルを含む Pull Request は更新できません。", 403);
  }
  return editable;
}

async function assertExpectedMainRevision(token: string, expectedRevision: string) {
  const currentBase = await api<{ object: { sha: string } }>(`/git/ref/heads/${encodeRefPath(BASE_BRANCH)}`, {}, token);
  if (currentBase.object.sha !== expectedRevision) throw new ContentConflictError();
}

async function deleteContentBranch(token: string, branch: string, context: string) {
  try {
    await api(`/git/refs/heads/${encodeRefPath(branch)}`, { method: "DELETE" }, token);
  } catch {
    console.error(`Content branch cleanup failed ${context}`);
  }
}

export async function createContentPullRequest(input: { branch: string; title: string; body: string; expectedRevision?: string; files: ContentFileChange[] }) {
  const token = await getRequiredInstallationToken();
  const baseRevision = input.expectedRevision ?? (await api<{ object: { sha: string } }>(`/git/ref/heads/${encodeRefPath(BASE_BRANCH)}`, {}, token)).object.sha;
  if (input.expectedRevision) await assertExpectedMainRevision(token, baseRevision);
  const commit = await api<{ tree: { sha: string } }>(`/git/commits/${baseRevision}`, {}, token);
  const blobs = await materializeGitTreeEntries(input.files, async (file) => {
    const blob = await api<{ sha: string }>("/git/blobs", { method: "POST", body: JSON.stringify({ content: typeof file.content === "string" ? file.content : file.content.toString("base64"), encoding: typeof file.content === "string" ? "utf-8" : "base64" }) }, token);
    return blob.sha;
  });
  const tree = await api<{ sha: string }>("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: blobs }) }, token);
  const createdCommit = await api<{ sha: string }>("/git/commits", { method: "POST", body: JSON.stringify({ message: input.title, tree: tree.sha, parents: [baseRevision] }) }, token);
  await api("/git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha: createdCommit.sha }) }, token);
  if (input.expectedRevision) {
    try {
      await assertExpectedMainRevision(token, baseRevision);
    } catch (error) {
      if (!(error instanceof ContentConflictError)) throw error;
      await deleteContentBranch(token, input.branch, "after revision conflict");
      throw error;
    }

  }
  const pullRequest = await api<CreatedPullRequest>("/pulls", { method: "POST", body: JSON.stringify({ title: input.title, body: input.body, head: input.branch, base: BASE_BRANCH }) }, token);
  if (input.expectedRevision && pullRequest.base.sha !== input.expectedRevision) {
    try {
      await api(`/pulls/${pullRequest.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) }, token);
    } catch {
      console.error("Content pull request cleanup failed after base revision conflict");
    }
    await deleteContentBranch(token, input.branch, "after base revision conflict");
    throw new ContentConflictError();
  }
  return pullRequest;
}

export async function getEditableContentPullRequest(
  number: number,
  kind: ConfigKind,
): Promise<EditableContentPullRequestSnapshot> {
  const token = await getRequiredInstallationToken();
  const pullRequest = await loadEditableContentPullRequest(number, kind, token);
  const snapshot = await getContentRevisionFiles(pullRequest.headRevision);
  const valueSources = kind === "tools"
    ? [...snapshot.files.entries()]
      .filter(([path]) => /^content\/tools\/[^/]+\.json$/.test(path))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, source]) => source)
    : kind === "tags"
      ? [snapshot.files.get("fixtures/tags.json")]
      : [snapshot.files.get(kind === "banners"
        ? "content/home/banners.json"
        : "content/home/announcements.json")];
  const updateSource = snapshot.files.get(pullRequest.updatePath);
  const homeSchema = snapshot.files.get("schemas/home.schema.json");
  const toolSchema = snapshot.files.get("schemas/tool.schema.json");
  const updateSchema = snapshot.files.get("schemas/update.schema.json");
  if (valueSources.some((source) => source === undefined) || !updateSource || !homeSchema || !toolSchema || !updateSchema) {
    throw new ContentPullRequestError("Pull Request の編集に必要なファイルを取得できません。", 422);
  }
  let value: unknown;
  let update: unknown;
  try {
    value = kind === "tools"
      ? valueSources.map((source) => JSON.parse(source as string) as unknown)
      : kind === "tags"
        ? (() => {
            const ids = JSON.parse(valueSources[0] as string) as unknown;
            const labelsSource = snapshot.files.get("fixtures/tag-labels.json");
            const labels = labelsSource ? JSON.parse(labelsSource) as unknown : {};
            const labelRecord = typeof labels === "object" && labels !== null && !Array.isArray(labels)
              ? labels as Record<string, unknown>
              : {};
            if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
              throw new Error("invalid tag IDs");
            }
            return ids.map((id) => ({
              id,
              label: typeof labelRecord[id] === "string" ? labelRecord[id] : id,
            }));
          })()
        : JSON.parse(valueSources[0] as string) as unknown;
    update = JSON.parse(updateSource) as unknown;
  } catch {
    throw new ContentPullRequestError("Pull Request 内の JSON が不正です。", 422);
  }
  return {
    ...pullRequest,
    value,
    update,
    paths: snapshot.paths,
    toolPaths: snapshot.paths.filter((path) => /^content\/tools\/[^/]+\.json$/.test(path)).sort(),
    postSources: [...snapshot.files.entries()]
      .filter(([path]) => /^content\/posts\/[^/]+\/index\.md$/.test(path))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([path, source]) => ({ path, source })),
    schemas: { home: homeSchema, tool: toolSchema, update: updateSchema },
  };
}

export async function listEditableContentPullRequests(kind: ConfigKind): Promise<EditableContentPullRequest[]> {
  const token = await getRequiredInstallationToken();
  const pullRequests = await api<GitHubPullRequest[]>(
    `/pulls?state=open&base=${encodeURIComponent(BASE_BRANCH)}&per_page=100`,
    {},
    token,
  );
  const candidates = pullRequests.filter((pullRequest) => {
    try {
      assertEditableContentPullRequest(pullRequest, kind);
      return true;
    } catch {
      return false;
    }
  });
  const checked = await Promise.all(candidates.map(async (pullRequest) => {
    try {
      return await loadEditableContentPullRequest(pullRequest.number, kind, token);
    } catch {
      return null;
    }
  }));
  return checked.filter((pullRequest): pullRequest is EditableContentPullRequest => pullRequest !== null);
}

export async function getReservedTagDefinitions(excludeNumber?: number): Promise<TagDefinition[]> {
  const token = await getRequiredInstallationToken();
  const repository = `${OWNER}/${REPOSITORY}`;
  const pullRequests = await api<GitHubPullRequest[]>(
    `/pulls?state=open&base=${encodeURIComponent(BASE_BRANCH)}&per_page=100`,
    {},
    token,
  );
  const candidates = pullRequests.filter((pullRequest) => (
    pullRequest.number !== excludeNumber
    && pullRequest.state === "open"
    && pullRequest.base.ref === BASE_BRANCH
    && pullRequest.base.repo.full_name === repository
    && pullRequest.head.repo?.full_name === repository
    && pullRequest.head.ref.startsWith("content/")
  ));
  const snapshots = await Promise.all(candidates.map(async (pullRequest) => {
    const snapshot = await getContentRevisionFiles(pullRequest.head.sha);
    const idsSource = snapshot.files.get("fixtures/tags.json");
    if (!idsSource) {
      throw new ContentPullRequestError(`Pull Request #${pullRequest.number} のタグ定義を確認できません。`, 502);
    }
    const ids = JSON.parse(idsSource) as unknown;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !/^(?!000000)\d{6}$/.test(id))) {
      throw new ContentPullRequestError(`Pull Request #${pullRequest.number} のタグ定義が不正です。`, 422);
    }
    return ids.map((id) => ({ id, label: id }));
  }));
  return [...new Map(snapshots.flat().map((tag) => [tag.id, tag])).values()];
}

export async function updateEditableContentPullRequest(input: {
  number: number;
  kind: ConfigKind;
  expectedRevision: string;
  title: string;
  files: ContentFileChange[];
}) {
  const token = await getRequiredInstallationToken();
  const pullRequest = await loadEditableContentPullRequest(input.number, input.kind, token);
  if (pullRequest.headRevision !== input.expectedRevision) throw new ContentConflictError("Pull Request が更新されています。再読込してください。");
  if (input.files.some((file) => !isAllowedConfigPath(input.kind, file.path, pullRequest.updatePath))) {
    throw new ContentPullRequestError("許可されていない path への書き込みはできません。", 403);
  }
  const commit = await api<{ tree: { sha: string } }>(`/git/commits/${pullRequest.headRevision}`, {}, token);
  const blobs = await materializeGitTreeEntries(input.files, async (file) => {
    const blob = await api<{ sha: string }>("/git/blobs", {
      method: "POST",
      body: JSON.stringify({
        content: typeof file.content === "string" ? file.content : file.content.toString("base64"),
        encoding: typeof file.content === "string" ? "utf-8" : "base64",
      }),
    }, token);
    return blob.sha;
  });
  const tree = await api<{ sha: string }>("/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree: blobs }),
  }, token);
  const createdCommit = await api<{ sha: string }>("/git/commits", {
    method: "POST",
    body: JSON.stringify({ message: input.title, tree: tree.sha, parents: [pullRequest.headRevision] }),
  }, token);
  try {
    await api(`/git/refs/heads/${encodeRefPath(pullRequest.branch)}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: createdCommit.sha, force: false }),
    }, token);
  } catch (error) {
    const current = await loadEditableContentPullRequest(input.number, input.kind, token);
    if (current.headRevision !== input.expectedRevision) throw new ContentConflictError("Pull Request が更新されています。再読込してください。");
    throw error;
  }
  return { ...pullRequest, headRevision: createdCommit.sha };
}

export type EditableBannerPullRequest = EditableContentPullRequest;
export type EditableBannerPullRequestSnapshot = EditableContentPullRequestSnapshot & { banners: unknown };

export async function getEditableBannerPullRequest(number: number): Promise<EditableBannerPullRequestSnapshot> {
  const snapshot = await getEditableContentPullRequest(number, "banners");
  return { ...snapshot, banners: snapshot.value };
}

export function listEditableBannerPullRequests() {
  return listEditableContentPullRequests("banners");
}

export function updateEditableBannerPullRequest(input: Omit<Parameters<typeof updateEditableContentPullRequest>[0], "kind">) {
  return updateEditableContentPullRequest({ ...input, kind: "banners" });
}

function parsePostBranch(branch: string) {
  const match = /^content\/(.+)-(\d{14})$/.exec(branch);
  if (!match || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(match[1])) return null;
  return { slug: match[1], updatePath: `content/updates/${match[1]}-${match[2]}.json` };
}

function assertEditablePostPullRequest(pullRequest: GitHubPullRequest): EditablePostPullRequest {
  const repository = `${OWNER}/${REPOSITORY}`;
  const parsedBranch = parsePostBranch(pullRequest.head.ref);
  if (
    pullRequest.state !== "open"
    || pullRequest.base.ref !== BASE_BRANCH
    || pullRequest.base.repo.full_name !== repository
    || pullRequest.head.repo?.full_name !== repository
    || !parsedBranch
  ) {
    throw new ContentPullRequestError("この記事 Pull Request は管理画面から更新できません。", 403);
  }
  return {
    number: pullRequest.number,
    title: pullRequest.title,
    url: pullRequest.html_url,
    draft: pullRequest.draft,
    branch: pullRequest.head.ref,
    slug: parsedBranch.slug,
    headRevision: pullRequest.head.sha,
    baseRevision: pullRequest.base.sha,
    updatePath: parsedBranch.updatePath,
  };
}

async function loadEditablePostPullRequest(number: number, token: string) {
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new ContentPullRequestError("Pull Request 番号が不正です。");
  }
  const pullRequest = await api<GitHubPullRequest>(`/pulls/${number}`, {}, token);
  const editable = assertEditablePostPullRequest(pullRequest);
  if (pullRequest.changed_files > 100) {
    throw new ContentPullRequestError("変更ファイル数が上限を超えています。", 403);
  }
  const changedFiles = await api<Array<{ filename: string }>>(`/pulls/${number}/files?per_page=100`, {}, token);
  const paths = changedFiles.map((file) => file.filename);
  const articlePath = `content/posts/${editable.slug}/index.md`;
  const imagePrefix = `content/posts/${editable.slug}/images/`;
  const allowed = (path: string) => path === articlePath
    || path === editable.updatePath
    || path === "fixtures/tags.json"
    || path === "fixtures/tag-labels.json"
    || (path.startsWith(imagePrefix) && /^[a-zA-Z0-9_-]+\.webp$/.test(path.slice(imagePrefix.length)));
  if (!paths.includes(articlePath) || paths.some((path) => !allowed(path))) {
    throw new ContentPullRequestError("許可されていないファイルを含む記事 Pull Request は更新できません。", 403);
  }
  return editable;
}

export async function getEditablePostPullRequest(number: number): Promise<EditablePostPullRequestSnapshot> {
  const token = await getRequiredInstallationToken();
  const pullRequest = await loadEditablePostPullRequest(number, token);
  const snapshot = await getContentRevisionFiles(pullRequest.headRevision);
  const source = snapshot.files.get(`content/posts/${pullRequest.slug}/index.md`);
  const updateSource = snapshot.files.get(pullRequest.updatePath);
  if (!source) {
    throw new ContentPullRequestError("記事 Pull Request の内容を取得できません。", 422);
  }
  const tagIds = JSON.parse(snapshot.files.get("fixtures/tags.json") ?? "[]") as unknown;
  const tagLabels = JSON.parse(snapshot.files.get("fixtures/tag-labels.json") ?? "{}") as unknown;
  if (!Array.isArray(tagIds) || tagIds.some((id) => typeof id !== "string")) {
    throw new ContentPullRequestError("記事 Pull Request のタグ一覧が不正です。", 422);
  }
  const labels = typeof tagLabels === "object" && tagLabels !== null && !Array.isArray(tagLabels)
    ? tagLabels as Record<string, unknown>
    : {};
  const currentContent = await getFreshContentSnapshotWithRevision();
  const tagDefinitions = currentContent.content.tagDefinitions.length > 0
    ? currentContent.content.tagDefinitions
    : tagIds.map((id) => ({
        id,
        label: typeof labels[id] === "string" ? labels[id] : id,
      }));
  return {
    ...pullRequest,
    source: normalizeLegacyPostTags(source, tagDefinitions),
    updateSource,
    tagDefinitions,
  };
}

export async function listEditablePostPullRequests(): Promise<EditablePostPullRequest[]> {
  const token = await getRequiredInstallationToken();
  const pullRequests = await api<GitHubPullRequest[]>(
    `/pulls?state=open&base=${encodeURIComponent(BASE_BRANCH)}&per_page=100`,
    {},
    token,
  );
  const results = await Promise.all(pullRequests.map(async (pullRequest) => {
    try {
      const editable = assertEditablePostPullRequest(pullRequest);
      await loadEditablePostPullRequest(editable.number, token);
      return editable;
    } catch {
      return null;
    }
  }));
  return results.filter((value): value is EditablePostPullRequest => value !== null);
}

export async function updateEditablePostPullRequest(input: {
  number: number;
  expectedRevision: string;
  title: string;
  body?: string;
  files: ContentFileChange[];
}) {
  const token = await getRequiredInstallationToken();
  const pullRequest = await loadEditablePostPullRequest(input.number, token);
  if (pullRequest.headRevision !== input.expectedRevision) {
    throw new ContentConflictError("記事 Pull Request が更新されています。再読込してください。");
  }
  const articlePath = `content/posts/${pullRequest.slug}/index.md`;
  const imagePrefix = `content/posts/${pullRequest.slug}/images/`;
  const allowed = (path: string) => path === articlePath
    || path === pullRequest.updatePath
    || path === "fixtures/tags.json"
    || path === "fixtures/tag-labels.json"
    || (path.startsWith(imagePrefix) && /^[a-zA-Z0-9_-]+\.webp$/.test(path.slice(imagePrefix.length)));
  if (input.files.some((file) => !allowed(file.path))) {
    throw new ContentPullRequestError("許可されていないpathへの書き込みはできません。", 403);
  }
  const commit = await api<{ tree: { sha: string } }>(`/git/commits/${pullRequest.headRevision}`, {}, token);
  const blobs = await materializeGitTreeEntries(input.files, async (file) => {
    const blob = await api<{ sha: string }>("/git/blobs", {
      method: "POST",
      body: JSON.stringify({
        content: typeof file.content === "string" ? file.content : file.content.toString("base64"),
        encoding: typeof file.content === "string" ? "utf-8" : "base64",
      }),
    }, token);
    return blob.sha;
  });
  const tree = await api<{ sha: string }>("/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree: blobs }),
  }, token);
  const createdCommit = await api<{ sha: string }>("/git/commits", {
    method: "POST",
    body: JSON.stringify({ message: input.title, tree: tree.sha, parents: [pullRequest.headRevision] }),
  }, token);
  try {
    await api(`/git/refs/heads/${encodeRefPath(pullRequest.branch)}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: createdCommit.sha, force: false }),
    }, token);
  } catch (error) {
    const current = await loadEditablePostPullRequest(input.number, token);
    if (current.headRevision !== input.expectedRevision) {
      throw new ContentConflictError("記事 Pull Request が更新されています。再読込してください。");
    }
    throw error;
  }
  if (input.body !== undefined) {
    await api(`/pulls/${input.number}`, {
      method: "PATCH",
      body: JSON.stringify({ body: input.body }),
    }, token);
  }
  return { ...pullRequest, headRevision: createdCommit.sha };
}

export async function getOpenContentPullRequests() {
  const token = await getOptionalInstallationToken();
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPOSITORY}/pulls?state=open&base=${BASE_BRANCH}&per_page=30`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    next: { revalidate: 300 },
  });
  if (!response.ok) return [];
  const pullRequests = await response.json() as Array<{
    number: number;
    title: string;
    html_url: string;
    state: string;
    draft: boolean;
    head: { ref: string };
  }>;
  return pullRequests.filter((pullRequest) => pullRequest.state === "open");
}
