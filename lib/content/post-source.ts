import type { PostWriteRequest } from "./schemas";

const DEFAULT_OWNER = "p-o-ke-nae";
const DEFAULT_REPOSITORY = "pokenae.Content";
const MARKDOWN_IMAGE_PATTERN = /(!\[[^\]]*\]\(\s*)(?:<([^>]+)>|([^\s)]+))((?:\s+"[^"]*")?\s*\))/gu;
const ABSOLUTE_REFERENCE_PATTERN = /^[a-z][a-z\d+.-]*:/i;

type ContentRepository = {
  owner?: string;
  repository?: string;
};

export class PostImageReferenceError extends Error {
  constructor(reference: string) {
    super(`記事画像は ./images/... の相対パスで指定してください: ${reference}`);
    this.name = "PostImageReferenceError";
  }
}

function safePathParts(pathname: string, reference: string) {
  const parts = pathname.split("/");
  if (
    parts.some((part) => {
      try {
        const decoded = decodeURIComponent(part);
        return !decoded || decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\");
      } catch {
        return true;
      }
    })
  ) {
    throw new PostImageReferenceError(reference);
  }
  return parts;
}

export function normalizePostImageReference(
  reference: string,
  slug: string,
  contentRepository: ContentRepository = {},
) {
  const owner = contentRepository.owner ?? process.env.CONTENT_REPOSITORY_OWNER ?? DEFAULT_OWNER;
  const repository = contentRepository.repository ?? process.env.CONTENT_REPOSITORY_NAME ?? DEFAULT_REPOSITORY;

  if (ABSOLUTE_REFERENCE_PATTERN.test(reference)) {
    let url: URL;
    try {
      url = new URL(reference);
    } catch {
      throw new PostImageReferenceError(reference);
    }
    const parts = safePathParts(url.pathname.replace(/^\/+/, ""), reference);
    const expectedPrefix = [owner, repository, parts[2], "content", "posts", slug, "images"];
    if (
      url.protocol !== "https:"
      || url.hostname !== "raw.githubusercontent.com"
      || url.search
      || url.hash
      || parts.length <= expectedPrefix.length
      || expectedPrefix.some((part, index) => parts[index] !== part)
    ) {
      throw new PostImageReferenceError(reference);
    }
    return `./images/${parts.slice(expectedPrefix.length).join("/")}`;
  }

  if (!reference.startsWith("./images/") || reference.includes("?") || reference.includes("#")) {
    throw new PostImageReferenceError(reference);
  }
  safePathParts(reference.slice("./images/".length), reference);
  return reference;
}

export function normalizePostImageReferences(
  post: PostWriteRequest["post"],
  body: string,
  contentRepository: ContentRepository = {},
) {
  const normalizedBody = body.replace(
    MARKDOWN_IMAGE_PATTERN,
    (_match, prefix: string, angleReference: string | undefined, plainReference: string | undefined, suffix: string) => {
      const reference = angleReference ?? plainReference ?? "";
      const normalized = normalizePostImageReference(reference, post.slug, contentRepository);
      return `${prefix}${angleReference === undefined ? normalized : `<${normalized}>`}${suffix}`;
    },
  );
  return {
    post: {
      ...post,
      thumbnail: post.thumbnail
        ? normalizePostImageReference(post.thumbnail, post.slug, contentRepository)
        : post.thumbnail,
    },
    body: normalizedBody,
  };
}

export function serializePostSource(post: PostWriteRequest["post"], body: string) {
  const normalized = normalizePostImageReferences(post, body);
  const frontmatter = Object.entries(normalized.post)
    .filter(([key, value]) => value !== undefined && !(key === "changeNote" && value === ""))
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n\n${normalized.body}\n`;
}
