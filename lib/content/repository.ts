import "server-only";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";
import { getOptionalInstallationToken } from "../github/app-auth";
import { contentAdminFixture, contentFixture } from "./fixtures";
import {
  announcementContentSchema,
  announcementSchema,
  appSchema,
  bannerContentSchema,
  bannerSchema,
  postFrontmatterSchema,
  tagDefinitionListSchema,
  toolContentSchema,
  toolSchema,
  updateSchema,
} from "./schemas";
import type { CollectionDexRecord, ContentSnapshot, Post, TagDefinition } from "./types";
import type { RepositoryMarkdownContext } from "../tools/readme-urls";

const OWNER = process.env.CONTENT_REPOSITORY_OWNER ?? "p-o-ke-nae";
const REPOSITORY = process.env.CONTENT_REPOSITORY_NAME ?? "pokenae.Content";
const REF = process.env.CONTENT_REPOSITORY_REF ?? "main";
const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPOSITORY}`;

type GitTree = {
  sha: string;
  truncated: boolean;
  tree: Array<{ path: string; type: "blob" | "tree"; sha: string }>;
};
type GitHubCommit = {
  sha: string;
  commit: { tree: { sha: string } };
};

export type ContentAdminSnapshot = {
  revision: string;
  tags: TagDefinition[];
  banners: Array<ReturnType<typeof bannerContentSchema.parse>>;
  announcements: Array<ReturnType<typeof announcementContentSchema.parse>>;
  tools: Array<ReturnType<typeof toolContentSchema.parse>>;
  toolPaths: string[];
  paths: string[];
  postSources: Array<{ path: string; source: string }>;
  schemas: {
    home: string;
    tool: string;
    update: string;
  };
};

export function usesContentFixtures() {
  return process.env.CONTENT_SOURCE === "fixture";
}

function githubHeaders(token?: string) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchRepositoryFiles(
  fetcher: typeof fetch,
  token?: string,
  ref = REF,
): Promise<{ revision: string; files: Map<string, string>; paths: string[] }> {
  const commitResponse = await fetcher(`${API_ROOT}/commits/${encodeURIComponent(ref)}`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (!commitResponse.ok) throw new Error(`Content commit API ${commitResponse.status}`);
  const commit = await commitResponse.json() as GitHubCommit;
  const treeResponse = await fetcher(`${API_ROOT}/git/trees/${commit.commit.tree.sha}?recursive=1`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (!treeResponse.ok) throw new Error(`Content tree API ${treeResponse.status}`);
  const tree = await treeResponse.json() as GitTree;
  if (tree.truncated) throw new Error("Content tree が切り詰められたため安全に読み込めません。");
  const allPaths = tree.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
  const paths = allPaths
    .filter((path) => (
      (path.startsWith("content/") && /\.(json|md)$/i.test(path))
      || path === "schemas/home.schema.json"
      || path === "schemas/tool.schema.json"
      || path === "schemas/update.schema.json"
      || path === "schemas/app.schema.json"
      || path === "fixtures/tags.json"
      || path === "fixtures/tag-labels.json"
    ))
  const entries = await Promise.all(paths.map(async (path) => {
    const response = await fetcher(`${rawRoot(commit.sha)}/${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Content raw ${response.status}: ${path}`);
    return [path, await response.text()] as const;
  }));
  return { revision: commit.sha, files: new Map(entries), paths: allPaths };
}

const getRemoteFileRecord = unstable_cache(
  async () => {
    const snapshot = await fetchRepositoryFiles(fetch, await getOptionalInstallationToken());
    return { revision: snapshot.revision, files: Object.fromEntries(snapshot.files), paths: snapshot.paths };
  },
  ["pokenae-content-snapshot", OWNER, REPOSITORY, REF],
  { revalidate: 300, tags: ["pokenae-content"] },
);

async function getRemoteFiles() {
  const snapshot = await getRemoteFileRecord();
  return { revision: snapshot.revision, files: new Map(Object.entries(snapshot.files)), paths: snapshot.paths };
}

function requiredFile(files: ReadonlyMap<string, string>, path: string) {
  const value = files.get(path);
  if (value === undefined) throw new Error(`Content snapshot に ${path} がありません。`);
  return value;
}

function jsonFiles<T>(files: ReadonlyMap<string, string>, directory: string, parse: (input: unknown) => T) {
  return [...files.entries()]
    .filter(([path]) => path.startsWith(`${directory}/`) && path.endsWith(".json") && !path.slice(directory.length + 1).includes("/"))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, source]) => parse(JSON.parse(source)));
}

function rawRoot(revision: string) {
  return `https://raw.githubusercontent.com/${OWNER}/${REPOSITORY}/${revision}`;
}

export function getContentMarkdownContext(revision: string, path: string): RepositoryMarkdownContext {
  return {
    repository: `${OWNER}/${REPOSITORY}`,
    commitSha: revision,
    path,
  };
}

function resolveContentUrl(value: string | undefined, directory: string, revision: string) {
  if (!value || !value.startsWith(".")) return value;
  const normalized: string[] = [];
  for (const part of `${directory}/${value}`.split("/")) {
    if (part === "." || !part) continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return `${rawRoot(revision)}/${normalized.join("/")}`;
}

function resolveContentItemImage<T extends { image?: string }>(item: T, directory: string, revision: string): T {
  return item.image?.startsWith(".")
    ? { ...item, image: resolveContentUrl(item.image, directory, revision) }
    : item;
}

function findFirstMarkdownImage(body: string): string | undefined {
  const match = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/u.exec(body);
  return match?.[1] ?? match?.[2];
}

function parseTagDefinitions(files: ReadonlyMap<string, string>): TagDefinition[] {
  const ids = JSON.parse(requiredFile(files, "fixtures/tags.json")) as unknown;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new Error("Content snapshot の fixtures/tags.json が不正です。");
  }
  const labelsSource = files.get("fixtures/tag-labels.json");
  const labels = labelsSource ? JSON.parse(labelsSource) as unknown : {};
  const labelRecord = typeof labels === "object" && labels !== null && !Array.isArray(labels)
    ? labels as Record<string, unknown>
    : {};
  return tagDefinitionListSchema.parse(ids.map((id) => {
    const normalizedId = /^\d{4}$/.test(id) ? id.padStart(6, "0") : id;
    return {
      id: normalizedId,
      label: typeof labelRecord[id] === "string" && labelRecord[id].trim() ? labelRecord[id] : normalizedId,
    };
  }));
}

function normalizeLegacyTagReferences(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const normalize = (tags: unknown) => Array.isArray(tags)
    ? tags.map((tag) => typeof tag === "string" && /^\d{4}$/.test(tag) ? tag.padStart(6, "0") : tag)
    : tags;
  return {
    ...source,
    tags: normalize(source.tags),
    ...(Object.hasOwn(source, "relatedTags") ? { relatedTags: normalize(source.relatedTags) } : {}),
  };
}

export function parseContentSnapshot(files: ReadonlyMap<string, string>, revision: string): ContentSnapshot {
  const postPaths = [...files.keys()].filter((path) => /^content\/posts\/[^/]+\/index\.md$/.test(path)).sort();
  const posts = postPaths.map((path): Post => {
    const parsed = matter(requiredFile(files, path));
    const metadata = postFrontmatterSchema.parse(normalizeLegacyTagReferences(parsed.data));
    const directory = path.slice(0, -"/index.md".length);
    const base = `${rawRoot(revision)}/${directory}`;
    const firstImage = resolveContentUrl(findFirstMarkdownImage(parsed.content), directory, revision);
    return {
      ...metadata,
      legacyUrl: metadata.legacyUrl ?? undefined,
      thumbnail: firstImage,
      body: parsed.content.replace(/\]\(\.\/([^)]+)\)/g, `](${base}/$1)`),
    };
  });
  return {
    posts,
    tagDefinitions: parseTagDefinitions(files),
    tools: jsonFiles(files, "content/tools", (value) => toolSchema.parse(normalizeLegacyTagReferences(value)))
      .map((tool) => resolveContentItemImage(tool, "content/tools", revision)),
    apps: jsonFiles(files, "content/apps", (value) => appSchema.parse(normalizeLegacyTagReferences(value)))
      .map((app) => resolveContentItemImage(app, "content/apps", revision))
      .sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug)),
    banners: bannerSchema.array().parse(JSON.parse(requiredFile(files, "content/home/banners.json")))
      .map((banner) => ({ ...banner, image: resolveContentUrl(banner.image, "content/home", revision) ?? banner.image })),
    announcements: announcementSchema.array().parse(JSON.parse(requiredFile(files, "content/home/announcements.json"))),
    updates: jsonFiles(files, "content/updates", (value) => updateSchema.parse(value)),
  };
}

export function parseContentAdminSnapshot(files: ReadonlyMap<string, string>, revision: string, paths = [...files.keys()]): ContentAdminSnapshot {
  const toolPaths = [...files.keys()].filter((path) => /^content\/tools\/[^/]+\.json$/.test(path)).sort();
  const postSources = [...files.entries()]
    .filter(([path]) => /^content\/posts\/[^/]+\/index\.md$/.test(path))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, source]) => ({ path, source }));
  return {
    revision,
    tags: parseTagDefinitions(files),
    banners: bannerContentSchema.array().parse(JSON.parse(requiredFile(files, "content/home/banners.json"))),
    announcements: announcementContentSchema.array().parse(JSON.parse(requiredFile(files, "content/home/announcements.json"))),
    tools: toolPaths.map((path) => toolContentSchema.parse(JSON.parse(requiredFile(files, path)))),
    toolPaths,
    paths,
    postSources,
    schemas: {
      home: requiredFile(files, "schemas/home.schema.json"),
      tool: requiredFile(files, "schemas/tool.schema.json"),
      update: requiredFile(files, "schemas/update.schema.json"),
    },
  };
}

export async function getContentSnapshot(): Promise<ContentSnapshot> {
  if (usesContentFixtures()) return structuredClone(contentFixture);
  return (await getContentSnapshotWithRevision()).content;
}

export async function getContentSnapshotWithRevision(): Promise<{ revision: string; content: ContentSnapshot }> {
  if (usesContentFixtures()) return { revision: contentAdminFixture.revision, content: structuredClone(contentFixture) };
  const snapshot = await getRemoteFiles();
  return { revision: snapshot.revision, content: parseContentSnapshot(snapshot.files, snapshot.revision) };
}

export async function getFreshContentSnapshotWithRevision(): Promise<{ revision: string; content: ContentSnapshot }> {
  if (usesContentFixtures()) return { revision: contentAdminFixture.revision, content: structuredClone(contentFixture) };
  const snapshot = await fetchRepositoryFiles(fetch, await getOptionalInstallationToken());
  return { revision: snapshot.revision, content: parseContentSnapshot(snapshot.files, snapshot.revision) };
}

export async function getContentAdminSnapshot(): Promise<ContentAdminSnapshot> {
  if (usesContentFixtures()) return structuredClone(contentAdminFixture);
  const snapshot = await getRemoteFiles();
  return parseContentAdminSnapshot(snapshot.files, snapshot.revision, snapshot.paths);
}

export async function getFreshContentAdminSnapshot(): Promise<ContentAdminSnapshot> {
  if (usesContentFixtures()) return structuredClone(contentAdminFixture);
  const snapshot = await fetchRepositoryFiles(fetch, await getOptionalInstallationToken());
  return parseContentAdminSnapshot(snapshot.files, snapshot.revision, snapshot.paths);
}

export async function getContentRevisionFiles(revision: string) {
  if (usesContentFixtures()) throw new Error("fixture モードでは revision を取得できません。");
  return fetchRepositoryFiles(fetch, await getOptionalInstallationToken(), revision);
}

export function isActiveContent(startsAt?: string, endsAt?: string, now = Date.now()) {
  return (!startsAt || Date.parse(startsAt) <= now) && (!endsAt || Date.parse(endsAt) >= now);
}

export async function getPublishedPosts() {
  const { posts } = await getContentSnapshot();
  return posts
    .filter((post) => post.status === "published")
    .sort((a, b) => b.priority - a.priority || b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPublishedPost(slug: string) {
  return (await getPublishedPosts()).find((post) => post.slug === slug);
}

export async function getCollectionDexRecords(post: Post): Promise<CollectionDexRecord[]> {
  if (!post.embed || post.embed.component !== "CollectionDex" || usesContentFixtures()) return [];
  const snapshot = await getRemoteFiles();
  const { files } = snapshot;
  const raw = JSON.parse(requiredFile(files, `content/posts/${post.slug}/${post.embed.data.replace(/^\.\//, "")}`)) as { records?: unknown[] };
  if (!Array.isArray(raw.records)) return [];
  return raw.records.flatMap((entry) => {
    if (!Array.isArray(entry) || typeof entry[0] !== "number" || typeof entry[4] !== "string") return [];
    return [{
      number: entry[0],
      name: entry[4],
      region: entry[0] <= 151 ? "カントー" : entry[0] <= 251 ? "ジョウト" : entry[0] <= 386 ? "ホウエン" : "シンオウ",
      status: typeof entry[15] === "string" ? entry[15] : typeof entry[5] === "string" ? entry[5] : "未設定",
      color: typeof entry[14] === "string" ? entry[14] : undefined,
      image: typeof entry[3] === "string" ? resolveContentUrl(entry[3], `content/posts/${post.slug}`, snapshot.revision) : undefined,
      location: typeof entry[11] === "string" ? entry[11] : undefined,
    }];
  });
}
