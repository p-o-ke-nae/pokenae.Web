import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const banners = [{
  id: "legacy-site-migration",
  image: "../posts/sample/images/banner.png",
  alt: "バナー",
  href: "/blog/sample",
  startsAt: "2024-03-24T11:04:43Z",
  endsAt: null,
  order: 10,
}];
const announcements = [{
  id: "notice",
  text: "お知らせ",
  href: "/blog",
  variant: "urgent",
  startsAt: "2026-09-26T01:43:02Z",
  endsAt: null,
}];
const tool = {
  slug: "sample-tool",
  displayName: "Sample Tool",
  summary: "概要",
  kind: "windows-app",
  repository: "p-o-ke-nae/sample-tool",
  docs: { readme: "README.md", paths: ["docs/", ".github/skills/"] },
  release: { channel: "stable", manifestRequired: true, unsignedInstaller: true },
  supportedOs: ["Windows 11 x64"],
  showInPickup: true,
  priority: 100,
};

describe("GitHub content snapshot", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses one Git Trees API request and authenticated raw requests", async () => {
    const { fetchRepositoryFiles } = await import("./repository");
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/git/trees/")) {
        return Response.json({
          truncated: false,
          tree: [
            { path: "content/home/banners.json", type: "blob", sha: "1" },
            { path: "content/home/announcements.json", type: "blob", sha: "2" },
            { path: "content/images/ignored.png", type: "blob", sha: "3" },
          ],
        });
      }
      const text = url.endsWith("banners.json") ? JSON.stringify(banners) : JSON.stringify(announcements);
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer installation-token");
      return new Response(text, { status: 200 });
    });

    const files = await fetchRepositoryFiles(fetcher, "installation-token");

    expect(files.size).toBe(2);
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("api.github.com")).length).toBe(1);
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer installation-token");
  });

  it("does not convert a repository failure into fixture success", async () => {
    const { fetchRepositoryFiles } = await import("./repository");
    const fetcher = vi.fn<typeof fetch>(async () => new Response("rate limited", { status: 403 }));
    await expect(fetchRepositoryFiles(fetcher)).rejects.toThrow("Content tree API 403");
  });

  it("round-trips the current storage model without losing fields", async () => {
    const { parseContentAdminSnapshot } = await import("./repository");
    const files = new Map([
      ["content/home/banners.json", JSON.stringify(banners)],
      ["content/home/announcements.json", JSON.stringify(announcements)],
      ["content/tools/sample-tool.json", JSON.stringify(tool)],
    ]);

    const snapshot = parseContentAdminSnapshot(files);

    expect(snapshot.banners).toEqual(banners);
    expect(snapshot.announcements).toEqual(announcements);
    expect(snapshot.tools).toEqual([tool]);
    expect(snapshot.toolPaths).toEqual(["content/tools/sample-tool.json"]);
  });
});
