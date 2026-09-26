import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveRepositoryReference, type RepositoryMarkdownContext } from "./readme-urls";

vi.mock("server-only", () => ({}));

const commitSha = "a".repeat(40);
const context: RepositoryMarkdownContext = {
  repository: "p-o-ke-nae/BlinkObserverTool",
  commitSha,
  path: "README.md",
};

describe("getRepositoryReadme", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads the README from a resolved commit", async () => {
    const source = "# BlinkObserverTool\n";
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ default_branch: "feature/docs" }))
      .mockResolvedValueOnce(Response.json({ sha: commitSha }))
      .mockResolvedValueOnce(Response.json({
        content: Buffer.from(source).toString("base64"),
        encoding: "base64",
        path: "README.md",
      }));
    vi.stubGlobal("fetch", fetcher);
    const { getRepositoryReadme } = await import("./readme");

    await expect(getRepositoryReadme(context.repository)).resolves.toEqual({ ...context, source });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      `https://api.github.com/repos/${context.repository}/commits/feature%2Fdocs`,
      expect.any(Object),
    );
    expect(String(fetcher.mock.calls[2]?.[0])).toBe(
      `https://api.github.com/repos/${context.repository}/readme?ref=${commitSha}`,
    );
  });

  it("returns null for an invalid GitHub response", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ default_branch: "" })));
    const { getRepositoryReadme } = await import("./readme");

    await expect(getRepositoryReadme(context.repository)).resolves.toBeNull();
  });

  it("returns null for invalid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("{")));
    const { getRepositoryReadme } = await import("./readme");

    await expect(getRepositoryReadme(context.repository)).resolves.toBeNull();
  });

  it.each([0, 1, 2])("returns null when GitHub request %i fails", async (failedRequest) => {
    const responses = [
      Response.json({ default_branch: "main" }),
      Response.json({ sha: commitSha }),
      Response.json({
        content: Buffer.from("# README").toString("base64"),
        encoding: "base64",
        path: "README.md",
      }),
    ];
    let requestIndex = 0;
    const fetcher = vi.fn<typeof fetch>(async () => {
      const currentRequest = requestIndex;
      requestIndex += 1;
      return currentRequest === failedRequest
        ? new Response("failed", { status: 503 })
        : responses[currentRequest];
    });
    vi.stubGlobal("fetch", fetcher);
    const { getRepositoryReadme } = await import("./readme");

    await expect(getRepositoryReadme(context.repository)).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(failedRequest + 1);
  });

  it("returns null for invalid Base64 content", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ default_branch: "main" }))
      .mockResolvedValueOnce(Response.json({ sha: commitSha }))
      .mockResolvedValueOnce(Response.json({ content: "***", encoding: "base64", path: "README.md" })));
    const { getRepositoryReadme } = await import("./readme");

    await expect(getRepositoryReadme(context.repository)).resolves.toBeNull();
  });
});

describe("resolveRepositoryReference", () => {
  it("resolves relative images and links against the README at the fixed commit", () => {
    expect(resolveRepositoryReference("docs/images/overview.svg", context, "image")).toBe(
      `https://raw.githubusercontent.com/p-o-ke-nae/BlinkObserverTool/${commitSha}/docs/images/overview.svg`,
    );
    expect(resolveRepositoryReference("./docs/manual.md#setup", context, "link")).toBe(
      `https://github.com/p-o-ke-nae/BlinkObserverTool/blob/${commitSha}/docs/manual.md#setup`,
    );
  });

  it("resolves parent paths from a nested README", () => {
    expect(resolveRepositoryReference("../images/overview.svg", { ...context, path: "docs/README.md" }, "image")).toBe(
      `https://raw.githubusercontent.com/p-o-ke-nae/BlinkObserverTool/${commitSha}/images/overview.svg`,
    );
  });

  it.each([
    "https://example.com/image.svg",
    "mailto:help@example.com",
    "#setup",
    "//cdn.example.com/image.svg",
    "\\\\cdn.example.com\\image.svg",
    "/site/image.svg",
  ])("preserves non-repository reference %s", (reference) => {
    expect(resolveRepositoryReference(reference, context, "link")).toBe(reference);
  });

  it("does not resolve a path that escapes the repository root", () => {
    expect(resolveRepositoryReference("../outside.md", context, "link")).toBe("../outside.md");
  });

  it("preserves references when no repository context is provided", () => {
    expect(resolveRepositoryReference("docs/manual.md", undefined, "link")).toBe("docs/manual.md");
  });
});
