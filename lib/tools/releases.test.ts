import { beforeEach, describe, expect, it, vi } from "vitest";

import { githubReleaseFixture, installerBytes, installerSha256, releaseManifestFixture } from "./releases.fixture";

vi.mock("server-only", () => ({}));

const tool = {
  slug: "blink-observer-tool",
  name: "BlinkObserverTool",
  summary: "test",
  repository: "p-o-ke-nae/BlinkObserverTool",
  kind: "windows-app",
} as const;

function responseForRelease(release: ReturnType<typeof githubReleaseFixture>, installerResponse?: () => Response | Promise<Response>) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.includes("api.github.com/repos/")) return Response.json(release);
    if (url.endsWith("manifest.json")) return Response.json(releaseManifestFixture);
    if (url.endsWith(".sha256")) return new Response(`${installerSha256}  BlinkObserverTool.msi\n`);
    if (url.endsWith(".msi") && installerResponse) return installerResponse();
    return new Response("unexpected", { status: 500 });
  });
}

describe("getValidatedToolRelease", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("accepts matching manifest, checksum, and GitHub asset digest without downloading the MSI", async () => {
    const fetcher = responseForRelease(githubReleaseFixture());
    vi.stubGlobal("fetch", fetcher);
    const { getValidatedToolRelease } = await import("./releases");

    const result = await getValidatedToolRelease(tool);

    expect(result.available).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("rejects a GitHub asset digest that differs from manifest and checksum", async () => {
    vi.stubGlobal("fetch", responseForRelease(githubReleaseFixture(`sha256:${"0".repeat(64)}`)));
    const { getValidatedToolRelease } = await import("./releases");

    const result = await getValidatedToolRelease(tool);

    expect(result).toMatchObject({ available: false });
    if (!result.available) expect(result.reason).toContain("digest");
  });

  it("streams and accepts the MSI body when the asset digest is absent", async () => {
    const fetcher = responseForRelease(
      githubReleaseFixture(null),
      () => new Response(installerBytes, { headers: { "content-length": String(installerBytes.byteLength) } }),
    );
    vi.stubGlobal("fetch", fetcher);
    const { getValidatedToolRelease } = await import("./releases");

    const result = await getValidatedToolRelease(tool);

    expect(result.available).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("rejects an MSI body whose SHA-256 differs from manifest and checksum", async () => {
    vi.stubGlobal("fetch", responseForRelease(githubReleaseFixture(null), () => new Response("tampered")));
    const { getValidatedToolRelease } = await import("./releases");

    const result = await getValidatedToolRelease(tool);

    expect(result).toMatchObject({ available: false });
    if (!result.available) expect(result.reason).toContain("MSI 本体の SHA-256");
  });

  it("rejects an MSI download HTTP failure", async () => {
    vi.stubGlobal("fetch", responseForRelease(githubReleaseFixture(null), () => new Response("failed", { status: 503 })));
    const { getValidatedToolRelease } = await import("./releases");

    const result = await getValidatedToolRelease(tool);

    expect(result).toMatchObject({ available: false });
    if (!result.available) expect(result.reason).toContain("HTTP 503");
  });

  it("rejects an MSI download network failure", async () => {
    vi.stubGlobal("fetch", responseForRelease(githubReleaseFixture(null), async () => {
      throw new TypeError("fetch failed");
    }));
    const { getValidatedToolRelease } = await import("./releases");

    const result = await getValidatedToolRelease(tool);

    expect(result).toMatchObject({ available: false });
    if (!result.available) expect(result.reason).toContain("fetch failed");
  });

  it("rejects a malformed GitHub asset digest instead of falling back", async () => {
    const fetcher = responseForRelease(githubReleaseFixture(`sha512:${installerSha256}`));
    vi.stubGlobal("fetch", fetcher);
    const { getValidatedToolRelease } = await import("./releases");

    const result = await getValidatedToolRelease(tool);

    expect(result).toMatchObject({ available: false });
    if (!result.available) expect(result.reason).toContain("digest 形式");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
