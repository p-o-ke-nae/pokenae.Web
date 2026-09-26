import "server-only";
import { Buffer } from "node:buffer";
import { z } from "zod";
import { gitCommitShaSchema } from "../content/schemas";
import type { RepositoryMarkdownContext } from "./readme-urls";

const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};
const GITHUB_CACHE_SECONDS = 900;
const REPOSITORY_PATTERN = /^[\w.-]+\/[\w.-]+$/;

const githubRepositorySchema = z.object({
  default_branch: z.string().min(1),
});

const githubCommitSchema = z.object({
  sha: gitCommitShaSchema,
});

const githubReadmeSchema = z.object({
  content: z.string(),
  encoding: z.literal("base64"),
  path: z.string().min(1),
});

export type RepositoryReadme = RepositoryMarkdownContext & {
  source: string;
};

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function decodeBase64(value: string): string | null {
  const normalized = value.replace(/\s/g, "");
  if (normalized.length % 4 !== 0 || !/^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/.test(normalized)) {
    return null;
  }
  return Buffer.from(normalized, "base64").toString("utf8");
}

export async function getRepositoryReadme(repository: string): Promise<RepositoryReadme | null> {
  if (!REPOSITORY_PATTERN.test(repository)) return null;

  const repositoryResponse = await fetch(`https://api.github.com/repos/${repository}`, {
    headers: GITHUB_API_HEADERS,
    next: { revalidate: GITHUB_CACHE_SECONDS },
  });
  if (!repositoryResponse.ok) return null;
  const repositoryResult = githubRepositorySchema.safeParse(await responseJson(repositoryResponse));
  if (!repositoryResult.success) return null;

  const branch = encodeURIComponent(repositoryResult.data.default_branch);
  const commitResponse = await fetch(`https://api.github.com/repos/${repository}/commits/${branch}`, {
    headers: GITHUB_API_HEADERS,
    next: { revalidate: GITHUB_CACHE_SECONDS },
  });
  if (!commitResponse.ok) return null;
  const commitResult = githubCommitSchema.safeParse(await responseJson(commitResponse));
  if (!commitResult.success) return null;

  const readmeUrl = new URL(`https://api.github.com/repos/${repository}/readme`);
  readmeUrl.searchParams.set("ref", commitResult.data.sha);
  const readmeResponse = await fetch(readmeUrl, {
    headers: GITHUB_API_HEADERS,
    next: { revalidate: GITHUB_CACHE_SECONDS },
  });
  if (!readmeResponse.ok) return null;
  const readmeResult = githubReadmeSchema.safeParse(await responseJson(readmeResponse));
  if (!readmeResult.success) return null;

  const source = decodeBase64(readmeResult.data.content);
  if (source === null) return null;

  return {
    source,
    repository,
    commitSha: commitResult.data.sha,
    path: readmeResult.data.path,
  };
}
