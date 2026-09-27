import { createHash } from "node:crypto";

export const installerBytes = new TextEncoder().encode("verified MSI fixture");
export const installerSha256 = createHash("sha256").update(installerBytes).digest("hex");

export const releaseManifestFixture = {
  version: "1.2.3",
  tag: "v1.2.3",
  product: "BlinkObserverTool",
  architecture: "x64",
  minimumWindowsVersion: "10",
  installer: "BlinkObserverTool.msi",
  sha256: installerSha256,
  publishedAt: "2026-09-26T00:00:00Z",
  releaseUrl: "https://github.com/p-o-ke-nae/BlinkObserverTool/releases/tag/v1.2.3",
} as const;

export function githubReleaseFixture(digest: string | null = `sha256:${installerSha256}`) {
  return {
    tag_name: releaseManifestFixture.tag,
    html_url: releaseManifestFixture.releaseUrl,
    assets: [
      {
        name: "manifest.json",
        browser_download_url: "https://github.com/releases/manifest.json",
        url: "https://api.github.com/assets/manifest",
        digest: null,
      },
      {
        name: releaseManifestFixture.installer,
        browser_download_url: "https://github.com/releases/BlinkObserverTool.msi",
        url: "https://api.github.com/assets/installer",
        digest,
      },
      {
        name: `${releaseManifestFixture.installer}.sha256`,
        browser_download_url: "https://github.com/releases/BlinkObserverTool.msi.sha256",
        url: "https://api.github.com/assets/checksum",
        digest: null,
      },
    ],
  };
}
