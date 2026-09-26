import "server-only";
import { createAppAuth } from "@octokit/auth-app";

const OWNER = process.env.CONTENT_REPOSITORY_OWNER ?? "p-o-ke-nae";
const REPOSITORY = process.env.CONTENT_REPOSITORY_NAME ?? "pokenae.Content";
const BASE_BRANCH = process.env.CONTENT_REPOSITORY_REF ?? "main";

function required(name: "GITHUB_APP_ID" | "GITHUB_APP_INSTALLATION_ID" | "GITHUB_APP_PRIVATE_KEY") {
  const value = name === "GITHUB_APP_PRIVATE_KEY"
    ? process.env.GITHUB_APP_PRIVATE_KEY ?? (process.env.GITHUB_APP_PRIVATE_KEY_BASE64 ? Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_BASE64, "base64").toString("utf8") : undefined)
    : process.env[name];
  if (!value) throw new Error(`${name} が設定されていません。`);
  return value;
}

async function installationToken() {
  const auth = createAppAuth({
    appId: required("GITHUB_APP_ID"),
    installationId: Number(required("GITHUB_APP_INSTALLATION_ID")),
    privateKey: required("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n"),
  });
  return (await auth({ type: "installation" })).token;
}

async function api<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPOSITORY}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function createContentPullRequest(input: { branch: string; title: string; body: string; files: { path: string; content: Buffer | string }[] }) {
  const token = await installationToken();
  const base = await api<{ object: { sha: string } }>(`/git/ref/heads/${BASE_BRANCH}`, {}, token);
  const commit = await api<{ tree: { sha: string } }>(`/git/commits/${base.object.sha}`, {}, token);
  const blobs = await Promise.all(input.files.map(async (file) => {
    const blob = await api<{ sha: string }>("/git/blobs", { method: "POST", body: JSON.stringify({ content: typeof file.content === "string" ? file.content : file.content.toString("base64"), encoding: typeof file.content === "string" ? "utf-8" : "base64" }) }, token);
    return { path: file.path, mode: "100644", type: "blob", sha: blob.sha };
  }));
  const tree = await api<{ sha: string }>("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: blobs }) }, token);
  const createdCommit = await api<{ sha: string }>("/git/commits", { method: "POST", body: JSON.stringify({ message: input.title, tree: tree.sha, parents: [base.object.sha] }) }, token);
  await api("/git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha: createdCommit.sha }) }, token);
  return api<{ html_url: string; number: number }>("/pulls", { method: "POST", body: JSON.stringify({ title: input.title, body: input.body, head: input.branch, base: BASE_BRANCH }) }, token);
}

export async function getOpenContentPullRequests() {
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPOSITORY}/pulls?state=open&base=${BASE_BRANCH}&per_page=30`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    next: { revalidate: 60 },
  });
  if (!response.ok) return [];
  return response.json() as Promise<Array<{ number: number; title: string; html_url: string; draft: boolean; head: { ref: string } }>>;
}
