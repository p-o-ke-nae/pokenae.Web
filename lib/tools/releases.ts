import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { releaseManifestSchema, type ReleaseManifest } from "../content/schemas";
import type { ToolDefinition } from "../content/types";

const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;
const MAX_INSTALLER_BYTES = 512 * 1024 * 1024;
const MAX_DOWNLOAD_REDIRECTS = 5;
const INSTALLER_FETCH_TIMEOUT_MS = 60_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const githubReleaseAssetSchema = z.object({
  name: z.string(),
  browser_download_url: z.string().url(),
  url: z.string().url(),
  digest: z.string().nullable().optional(),
});
export type GitHubReleaseAsset = z.infer<typeof githubReleaseAssetSchema>;

const githubReleaseSchema = z.object({
  tag_name: z.string(),
  html_url: z.string().url(),
  assets: z.array(githubReleaseAssetSchema),
});

export type ToolRelease =
  | { available: true; manifest: ReleaseManifest; installerUrl: string; checksumUrl: string }
  | { available: false; reason: string; releaseUrl?: string };

function normalizeSha256(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return SHA256_PATTERN.test(normalized) ? normalized : null;
}

function checksumFromText(value: string): string | null {
  return normalizeSha256(value.trim().split(/\s+/)[0] ?? "");
}

function digestSha256(value: string): string | null {
  const match = /^sha256:([a-fA-F0-9]{64})$/.exec(value);
  return match ? match[1].toLowerCase() : null;
}

async function fetchInstallerResponse(url: string): Promise<Response> {
  let currentUrl = new URL(url);

  for (let redirectCount = 0; redirectCount <= MAX_DOWNLOAD_REDIRECTS; redirectCount += 1) {
    if (currentUrl.protocol !== "https:") throw new Error("HTTPS ではないダウンロード先です。");

    const response = await fetch(currentUrl, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(INSTALLER_FETCH_TIMEOUT_MS),
    });
    if (!REDIRECT_STATUSES.has(response.status)) return response;

    if (redirectCount === MAX_DOWNLOAD_REDIRECTS) {
      throw new Error(`リダイレクト回数が ${MAX_DOWNLOAD_REDIRECTS} 回を超えました。`);
    }
    const location = response.headers.get("location");
    if (!location) throw new Error("リダイレクト先がありません。");
    currentUrl = new URL(location, currentUrl);
  }

  throw new Error("MSI のダウンロード先を解決できません。");
}

/**
 * Streams the remote MSI into a SHA-256 hash while enforcing response-size limits.
 */
async function calculateInstallerSha256(url: string): Promise<string> {
  const response = await fetchInstallerResponse(url);
  if (!response.ok) throw new Error(`MSI の取得に失敗しました (HTTP ${response.status})。`);

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      throw new Error("MSI の Content-Length が不正です。");
    }
    if (contentLength > MAX_INSTALLER_BYTES) {
      throw new Error(`MSI が最大サイズ ${MAX_INSTALLER_BYTES} bytes を超えています。`);
    }
  }
  if (!response.body) throw new Error("MSI のレスポンス本文がありません。");

  const hash = createHash("sha256");
  const reader = response.body.getReader();
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_INSTALLER_BYTES) {
      await reader.cancel();
      throw new Error(`MSI が最大サイズ ${MAX_INSTALLER_BYTES} bytes を超えています。`);
    }
    hash.update(value);
  }

  if (contentLengthHeader !== null && receivedBytes !== Number(contentLengthHeader)) {
    throw new Error("MSI の実サイズが Content-Length と一致しません。");
  }
  return hash.digest("hex");
}

export async function getValidatedToolRelease(tool: ToolDefinition): Promise<ToolRelease> {
  if (tool.kind !== "windows-app") return { available: false, reason: "ライブラリにはインストーラー配布はありません。" };
  const response = await fetch(`https://api.github.com/repos/${tool.repository}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    next: { revalidate: 900 },
  });
  if (!response.ok) return { available: false, reason: `Release 情報を取得できませんでした (${response.status})。` };
  const releaseResult = githubReleaseSchema.safeParse(await response.json());
  if (!releaseResult.success) return { available: false, reason: "Release 情報の形式が不正です。" };
  const release = releaseResult.data;
  const manifestAsset = release.assets.find((asset) => asset.name === "manifest.json");
  if (!manifestAsset) return { available: false, reason: "検証用 manifest.json がありません。", releaseUrl: release.html_url };

  const manifestResponse = await fetch(manifestAsset.browser_download_url, { next: { revalidate: 900 } });
  if (!manifestResponse.ok) return { available: false, reason: "manifest.json を取得できません。", releaseUrl: release.html_url };
  const parsed = releaseManifestSchema.safeParse(await manifestResponse.json());
  if (!parsed.success) return { available: false, reason: "manifest.json の形式が不正です。", releaseUrl: release.html_url };
  const manifest = parsed.data;
  if (manifest.tag !== release.tag_name || manifest.releaseUrl !== release.html_url) {
    return { available: false, reason: "manifest と Release の識別情報が一致しません。", releaseUrl: release.html_url };
  }
  const installer = release.assets.find((asset) => asset.name === manifest.installer);
  const checksum = release.assets.find((asset) => asset.name === `${manifest.installer}.sha256` || asset.name === "SHA256");
  if (!installer || !checksum) return { available: false, reason: "MSI または SHA-256 ファイルが同じ Release にありません。", releaseUrl: release.html_url };
  const checksumResponse = await fetch(checksum.browser_download_url, { next: { revalidate: 900 } });
  if (!checksumResponse.ok) {
    return { available: false, reason: `SHA-256 ファイルを取得できませんでした (${checksumResponse.status})。`, releaseUrl: release.html_url };
  }
  const manifestSha256 = normalizeSha256(manifest.sha256);
  const checksumSha256 = checksumFromText(await checksumResponse.text());
  if (!manifestSha256 || !checksumSha256) {
    return { available: false, reason: "manifest または SHA-256 ファイルのハッシュ形式が不正です。", releaseUrl: release.html_url };
  }
  if (checksumSha256 !== manifestSha256) {
    return { available: false, reason: "manifest と SHA-256 ファイルが一致しません。", releaseUrl: release.html_url };
  }

  if (installer.digest != null) {
    const assetSha256 = digestSha256(installer.digest);
    if (!assetSha256) {
      return { available: false, reason: "GitHub Release asset の digest 形式が不正です。", releaseUrl: release.html_url };
    }
    if (assetSha256 !== manifestSha256) {
      return { available: false, reason: "GitHub Release asset の digest が manifest および SHA-256 ファイルと一致しません。", releaseUrl: release.html_url };
    }
  } else {
    try {
      const binarySha256 = await calculateInstallerSha256(installer.browser_download_url);
      if (binarySha256 !== manifestSha256) {
        return { available: false, reason: "MSI 本体の SHA-256 が manifest および SHA-256 ファイルと一致しません。", releaseUrl: release.html_url };
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "不明なエラー";
      return { available: false, reason: `MSI 本体を検証できませんでした: ${detail}`, releaseUrl: release.html_url };
    }
  }

  return { available: true, manifest, installerUrl: installer.browser_download_url, checksumUrl: checksum.browser_download_url };
}

export async function getRepositoryReadme(repository: string) {
  const response = await fetch(`https://api.github.com/repos/${repository}/readme`, {
    headers: { Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" },
    next: { revalidate: 900 },
  });
  return response.ok ? response.text() : "";
}
