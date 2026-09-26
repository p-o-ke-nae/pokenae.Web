import "server-only";
import matter from "gray-matter";
import { contentFixture } from "./fixtures";
import { announcementSchema, bannerSchema, postFrontmatterSchema, toolSchema, updateSchema } from "./schemas";
import type { CollectionDexRecord, ContentSnapshot, Post } from "./types";

const OWNER = process.env.CONTENT_REPOSITORY_OWNER ?? "p-o-ke-nae";
const REPOSITORY = process.env.CONTENT_REPOSITORY_NAME ?? "pokenae.Content";
const REF = process.env.CONTENT_REPOSITORY_REF ?? "main";
const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPOSITORY}/contents`;
const RAW_ROOT = `https://raw.githubusercontent.com/${OWNER}/${REPOSITORY}/${REF}`;

type GitHubEntry = { name: string; path: string; type: "file" | "dir"; download_url: string | null };

function shouldUseFixtures() {
  return process.env.CONTENT_SOURCE === "fixture" || process.env.NODE_ENV === "test";
}

async function githubFetch(path: string): Promise<Response> {
  return fetch(`${API_ROOT}/${path}?ref=${encodeURIComponent(REF)}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    next: { revalidate: 300, tags: ["pokenae-content"] },
  });
}

async function list(path: string): Promise<GitHubEntry[]> {
  const response = await githubFetch(path);
  if (!response.ok) throw new Error(`Content API ${response.status}: ${path}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error(`Content path is not a directory: ${path}`);
  return data.filter((entry): entry is GitHubEntry => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as Record<string, unknown>;
    return typeof item.name === "string" && typeof item.path === "string" && (item.type === "file" || item.type === "dir");
  });
}

async function readText(path: string): Promise<string> {
  const response = await githubFetch(path);
  if (!response.ok) throw new Error(`Content API ${response.status}: ${path}`);
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("content" in data) || typeof data.content !== "string") {
    throw new Error(`Invalid GitHub file response: ${path}`);
  }
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function readJsonFiles<T>(directory: string, parse: (input: unknown) => T): Promise<T[]> {
  const entries = await list(directory);
  return Promise.all(entries.filter((entry) => entry.type === "file" && entry.name.endsWith(".json")).map(async (entry) => parse(JSON.parse(await readText(entry.path)))));
}

async function getRemoteSnapshot(): Promise<ContentSnapshot> {
  const postDirectories = (await list("content/posts")).filter((entry) => entry.type === "dir");
  const posts = await Promise.all(postDirectories.map(async (directory): Promise<Post> => {
    const source = await readText(`${directory.path}/index.md`);
    const parsed = matter(source);
    const metadata = postFrontmatterSchema.parse(parsed.data);
    const base = `${RAW_ROOT}/${directory.path}`;
    const body = parsed.content.replace(/\]\(\.\/([^)]+)\)/g, `](${base}/$1)`);
    return { ...metadata, thumbnail: resolveContentUrl(metadata.thumbnail, directory.path), body };
  }));
  const [tools, banners, announcements, updates] = await Promise.all([
    readJsonFiles("content/tools", (value) => toolSchema.parse(value)),
    readText("content/home/banners.json").then((value) => bannerSchema.array().parse(JSON.parse(value)).map((banner) => ({ ...banner, image: resolveContentUrl(banner.image, "content/home") ?? banner.image }))),
    readText("content/home/announcements.json").then((value) => announcementSchema.array().parse(JSON.parse(value))),
    readJsonFiles("content/updates", (value) => updateSchema.parse(value)),
  ]);
  return { posts, tools, banners, announcements, updates };
}

function resolveContentUrl(value: string | undefined, directory: string) {
  if (!value || !value.startsWith(".")) return value;
  const parts = `${directory}/${value}`.split("/");
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === "." || !part) continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return `${RAW_ROOT}/${normalized.join("/")}`;
}

export async function getContentSnapshot(): Promise<ContentSnapshot> {
  if (shouldUseFixtures()) return structuredClone(contentFixture);
  try {
    return await getRemoteSnapshot();
  } catch (error) {
    console.error("pokenae.Content の取得に失敗したため fixture を表示します。", error);
    return structuredClone(contentFixture);
  }

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
  let raw: { records?: unknown[] };
  try {
    raw = JSON.parse(await readText(`content/posts/${post.slug}/${post.embed.data.replace(/^\.\//, "")}`)) as { records?: unknown[] };
  } catch {
    return [];
  }
  if (!Array.isArray(raw.records)) return [];
  return raw.records.flatMap((entry) => {
    if (!Array.isArray(entry) || typeof entry[0] !== "number" || typeof entry[4] !== "string") return [];
    return [{
      number: entry[0],
      name: entry[4],
      region: entry[0] <= 151 ? "カントー" : entry[0] <= 251 ? "ジョウト" : entry[0] <= 386 ? "ホウエン" : "シンオウ",
      status: typeof entry[15] === "string" ? entry[15] : typeof entry[5] === "string" ? entry[5] : "未設定",
      color: typeof entry[14] === "string" ? entry[14] : undefined,
      image: typeof entry[3] === "string" ? resolveContentUrl(entry[3], `content/posts/${post.slug}`) : undefined,
      location: typeof entry[11] === "string" ? entry[11] : undefined,
    }];
  });
}
