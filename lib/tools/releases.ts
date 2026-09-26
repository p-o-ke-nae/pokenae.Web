import "server-only";
import { releaseManifestSchema, type ReleaseManifest } from "@/lib/content/schemas";
import type { ToolDefinition } from "@/lib/content/types";

type ReleaseAsset = { name: string; browser_download_url: string; url: string };
type GitHubRelease = { tag_name: string; html_url: string; assets: ReleaseAsset[] };

export type ToolRelease =
  | { available: true; manifest: ReleaseManifest; installerUrl: string; checksumUrl: string }
  | { available: false; reason: string; releaseUrl?: string };

export async function getValidatedToolRelease(tool: ToolDefinition): Promise<ToolRelease> {
  if (tool.kind !== "windows-app") return { available: false, reason: "ライブラリにはインストーラー配布はありません。" };
  const response = await fetch(`https://api.github.com/repos/${tool.repository}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    next: { revalidate: 900 },
  });
  if (!response.ok) return { available: false, reason: `Release 情報を取得できませんでした (${response.status})。` };
  const release = await response.json() as GitHubRelease;
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
  const checksumText = checksumResponse.ok ? (await checksumResponse.text()).trim().split(/\s+/)[0] : "";
  if (checksumText.toLowerCase() !== manifest.sha256.toLowerCase()) {
    return { available: false, reason: "manifest と SHA-256 ファイルが一致しません。", releaseUrl: release.html_url };
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
