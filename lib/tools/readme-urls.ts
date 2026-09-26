export type RepositoryMarkdownContext = {
  repository: string;
  commitSha: string;
  path: string;
};

type RepositoryReferenceKind = "image" | "link";

const ABSOLUTE_REFERENCE_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const REPOSITORY_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const COMMIT_SHA_PATTERN = /^[a-f\d]{40}$/i;

function repositoryUrls(context: RepositoryMarkdownContext, kind: RepositoryReferenceKind): { file: URL; root: URL } | null {
  if (!REPOSITORY_PATTERN.test(context.repository) || !COMMIT_SHA_PATTERN.test(context.commitSha)) return null;

  const encodedRepository = context.repository.split("/").map(encodeURIComponent).join("/");
  const encodedPath = context.path.split("/").map(encodeURIComponent).join("/");
  const prefix = kind === "image"
    ? `https://raw.githubusercontent.com/${encodedRepository}/${context.commitSha}/`
    : `https://github.com/${encodedRepository}/blob/${context.commitSha}/`;
  const root = new URL(prefix);

  return { file: new URL(encodedPath, root), root };
}

export function resolveRepositoryReference(
  reference: string | undefined,
  context: RepositoryMarkdownContext | undefined,
  kind: RepositoryReferenceKind,
): string | undefined {
  if (
    !reference
    || !context
    || reference.startsWith("#")
    || reference.startsWith("/")
    || reference.startsWith("\\")
    || ABSOLUTE_REFERENCE_PATTERN.test(reference)
  ) {
    return reference;
  }

  const urls = repositoryUrls(context, kind);
  if (!urls) return reference;

  const resolved = new URL(reference, urls.file);
  return resolved.origin === urls.root.origin && resolved.pathname.startsWith(urls.root.pathname)
    ? resolved.toString()
    : reference;
}
