import "server-only";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";
import { getOptionalInstallationToken } from "../github/app-auth";
import { contentAdminFixture, contentFixture } from "./fixtures";
import {
  announcementContentSchema,
  announcementSchema,
  bannerContentSchema,
  bannerSchema,
  postFrontmatterSchema,
  toolContentSchema,
  toolSchema,
  updateSchema,
} from "./schemas";
import type { CollectionDexRecord, ContentSnapshot, Post } from "./types";

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
  banners: Array<ReturnType<typeof bannerContentSchema.parse>>;
  announcements: Array<ReturnType<typeof announcementContentSchema.parse>>;
  tools: Array<ReturnType<typeof toolContentSchema.parse>>;
  toolPaths: string[];
};

function shouldUseFixtures() {
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
): Promise<{ revision: string; files: Map<string, string> }> {
  const commitResponse = await fetcher(`${API_ROOT}/commits/${encodeURIComponent(REF)}`, {
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
  const paths = tree.tree
    .filter((entry) => entry.type === "blob" && entry.path.startsWith("content/") && /\.(json|md)$/i.test(entry.path))
    .map((entry) => entry.path);
  const entries = await Promise.all(paths.map(async (path) => {
    const response = await fetcher(`${rawRoot(commit.sha)}/${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Content raw ${response.status}: ${path}`);
    return [path, await response.text()] as const;
  }));
  return { revision: commit.sha, files: new Map(entries) };
}

const getRemoteFileRecord = unstable_cache(
  async () => {
    const snapshot = await fetchRepositoryFiles(fetch, await getOptionalInstallationToken());
    return { revision: snapshot.revision, files: Object.fromEntries(snapshot.files) };
  },
  ["pokenae-content-snapshot", OWNER, REPOSITORY, REF],
  { revalidate: 300, tags: ["pokenae-content"] },
);

async function getRemoteFiles() {
  const snapshot = await getRemoteFileRecord();
  return { revision: snapshot.revision, files: new Map(Object.entries(snapshot.files)) };
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

export function parseContentSnapshot(files: ReadonlyMap<string, string>, revision: string): ContentSnapshot {
  const postPaths = [...files.keys()].filter((path) => /^content\/posts\/[^/]+\/index\.md$/.test(path)).sort();
  const posts = postPaths.map((path): Post => {
    const parsed = matter(requiredFile(files, path));
    const metadata = postFrontmatterSchema.parse(parsed.data);
    const directory = path.slice(0, -"/index.md".length);
    const base = `${rawRoot(revision)}/${directory}`;
    return {
      ...metadata,
      thumbnail: resolveContentUrl(metadata.thumbnail, directory, revision),
      body: parsed.content.replace(/\]\(\.\/([^)]+)\)/g, `](${base}/$1)`),
    };
  });
  return {
    posts,
    tools: jsonFiles(files, "content/tools", (value) => toolSchema.parse(value)),
    banners: bannerSchema.array().parse(JSON.parse(requiredFile(files, "content/home/banners.json")))
      .map((banner) => ({ ...banner, image: resolveContentUrl(banner.image, "content/home", revision) ?? banner.image })),
    announcements: announcementSchema.array().parse(JSON.parse(requiredFile(files, "content/home/announcements.json"))),
    updates: jsonFiles(files, "content/updates", (value) => updateSchema.parse(value)),
  };
}

export function parseContentAdminSnapshot(files: ReadonlyMap<string, string>, revision: string): ContentAdminSnapshot {
  const toolPaths = [...files.keys()].filter((path) => /^content\/tools\/[^/]+\.json$/.test(path)).sort();
  return {
    revision,
    banners: bannerContentSchema.array().parse(JSON.parse(requiredFile(files, "content/home/banners.json"))),
    announcements: announcementContentSchema.array().parse(JSON.parse(requiredFile(files, "content/home/announcements.json"))),
    tools: toolPaths.map((path) => toolContentSchema.parse(JSON.parse(requiredFile(files, path)))),
    toolPaths,
  };
}

export async function getContentSnapshot(): Promise<ContentSnapshot> {
  if (shouldUseFixtures()) return structuredClone(contentFixture);
  return (await getContentSnapshotWithRevision()).content;
}

export async function getContentSnapshotWithRevision(): Promise<{ revision: string; content: ContentSnapshot }> {
  if (shouldUseFixtures()) return { revision: contentAdminFixture.revision, content: structuredClone(contentFixture) };
  const snapshot = await getRemoteFiles();
  return { revision: snapshot.revision, content: parseContentSnapshot(snapshot.files, snapshot.revision) };
}

export async function getContentAdminSnapshot(): Promise<ContentAdminSnapshot> {
  if (shouldUseFixtures()) return structuredClone(contentAdminFixture);
  const snapshot = await getRemoteFiles();
  return parseContentAdminSnapshot(snapshot.files, snapshot.revision);
}

export async function getFreshContentAdminSnapshot(): Promise<ContentAdminSnapshot> {
  if (shouldUseFixtures()) return structuredClone(contentAdminFixture);
  const snapshot = await fetchRepositoryFiles(fetch, await getOptionalInstallationToken());
  return parseContentAdminSnapshot(snapshot.files, snapshot.revision);
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
  if (!post.embed || post.embed.component !== "CollectionDex" || shouldUseFixtures()) return [];
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
