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
const app = {
  slug: "sample-app",
  displayName: "Sample App",
  summary: "概要",
  href: "/sample-app",
  image: null,
  imageAlt: "",
  metaLabel: "Webアプリ",
  status: "published",
  order: 1,
  tags: [],
};
const homeSchema = JSON.stringify({ type: "array" });
const toolSchema = JSON.stringify({ type: "object" });
const appSchema = JSON.stringify({ type: "object" });
const updateSchema = JSON.stringify({ type: "object" });

describe("GitHub content snapshot", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("pins the tree and authenticated raw files to one immutable commit", async () => {
    const { fetchRepositoryFiles } = await import("./repository");
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/commits/")) {
        return Response.json({ sha: "commit-revision", commit: { tree: { sha: "tree-revision" } } });
      }
      if (url.includes("/git/trees/")) {
        return Response.json({
          sha: "tree-revision",
          truncated: false,
          tree: [
            { path: "content/home/banners.json", type: "blob", sha: "1" },
            { path: "content/home/announcements.json", type: "blob", sha: "2" },
            { path: "content/images/ignored.png", type: "blob", sha: "3" },
            { path: "schemas/home.schema.json", type: "blob", sha: "4" },
            { path: "schemas/tool.schema.json", type: "blob", sha: "5" },
            { path: "schemas/update.schema.json", type: "blob", sha: "6" },
            { path: "fixtures/tags.json", type: "blob", sha: "7" },
            { path: "schemas/app.schema.json", type: "blob", sha: "8" },
          ],
        });
      }
      expect(url).toContain("/commit-revision/");
      const text = url.endsWith("banners.json")
        ? JSON.stringify(banners)
        : url.endsWith("announcements.json")
          ? JSON.stringify(announcements)
          : url.endsWith("tags.json")
            ? JSON.stringify(["pokemon"])
          : "{}";
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer installation-token");
      return new Response(text, { status: 200 });
    });

    const snapshot = await fetchRepositoryFiles(fetcher, "installation-token");

    expect(snapshot.revision).toBe("commit-revision");
    expect(snapshot.files.size).toBe(7);
    expect(snapshot.paths).toContain("content/images/ignored.png");
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("api.github.com")).length).toBe(2);
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer installation-token");
  });

  it("does not convert a repository failure into fixture success", async () => {
    const { fetchRepositoryFiles } = await import("./repository");
    const fetcher = vi.fn<typeof fetch>(async () => new Response("rate limited", { status: 403 }));
    await expect(fetchRepositoryFiles(fetcher)).rejects.toThrow("Content commit API 403");
  });

  it("round-trips the current storage model without losing fields", async () => {
    const { parseContentAdminSnapshot } = await import("./repository");
    const files = new Map([
      ["content/home/banners.json", JSON.stringify(banners)],
      ["content/home/announcements.json", JSON.stringify(announcements)],
      ["content/tools/sample-tool.json", JSON.stringify(tool)],
      ["content/apps/sample-app.json", JSON.stringify(app)],
      ["schemas/home.schema.json", homeSchema],
      ["schemas/tool.schema.json", toolSchema],
      ["schemas/app.schema.json", appSchema],
      ["schemas/update.schema.json", updateSchema],
      ["fixtures/tags.json", JSON.stringify(["0001"])],
      ["fixtures/tag-labels.json", JSON.stringify({ "0001": "ポケモン" })],
      ["content/posts/sample-post/index.md", "---\nslug: sample-post\n---\n\n![画像](./images/sample.webp)\n"],
    ]);

    const snapshot = parseContentAdminSnapshot(files, "base-tree-sha");

    expect(snapshot.revision).toBe("base-tree-sha");
    expect(snapshot.banners).toEqual(banners);
    expect(snapshot.announcements).toEqual(announcements);
    expect(snapshot.tools).toEqual([{ ...tool, tags: [] }]);
    expect(snapshot.apps).toEqual([app]);
    expect(snapshot.toolPaths).toEqual(["content/tools/sample-tool.json"]);
    expect(snapshot.appPaths).toEqual(["content/apps/sample-app.json"]);
    expect(snapshot.tags).toEqual([{ id: "000001", label: "ポケモン" }]);
    expect(snapshot.postSources).toEqual([{
      path: "content/posts/sample-post/index.md",
      source: "---\nslug: sample-post\n---\n\n![画像](./images/sample.webp)\n",
    }]);
    expect(snapshot.schemas).toEqual({ home: homeSchema, tool: toolSchema, app: appSchema, update: updateSchema });
  });

  it("uses the first Markdown image as the public post thumbnail", async () => {
    const { parseContentSnapshot } = await import("./repository");
    const files = new Map([
      ["content/home/banners.json", JSON.stringify([])],
      ["content/home/announcements.json", JSON.stringify([])],
      ["fixtures/tags.json", JSON.stringify([])],
      ["content/posts/sample-post/index.md", `---
slug: sample-post
title: サンプル記事
summary: 概要
publishedAt: "2026-09-26"
status: published
category: blog
tags: []
relatedTags: []
priority: 1
thumbnail: /mock/should-not-be-used.svg
showInPickup: false
---

本文の前置き。

![最初の画像](./images/first.png)

![次の画像](./images/second.png)
`],
    ]);

    const snapshot = parseContentSnapshot(files, "base-revision");

    expect(snapshot.posts[0]?.thumbnail).toBe(
      "https://raw.githubusercontent.com/p-o-ke-nae/pokenae.Content/base-revision/content/posts/sample-post/images/first.png",
    );
  });

  it("accepts null optional URLs and normalizes legacyUrl", async () => {
    const { parseContentSnapshot } = await import("./repository");
    const files = new Map([
      ["content/home/banners.json", JSON.stringify([])],
      ["content/home/announcements.json", JSON.stringify([])],
      ["fixtures/tags.json", JSON.stringify([])],
      ["content/posts/sample-post/index.md", `---
slug: sample-post
title: サンプル記事
summary: 概要
publishedAt: "2026-09-26"
status: published
category: blog
tags: []
relatedTags: []
priority: 1
thumbnail: null
legacyUrl: null
showInPickup: false
---

本文です。
`],
    ]);

    const snapshot = parseContentSnapshot(files, "base-revision");

    expect(snapshot.posts[0]).toMatchObject({ slug: "sample-post", legacyUrl: undefined, thumbnail: undefined });
  });

  it("parses app updates from the canonical content snapshot", async () => {
    const { parseContentSnapshot } = await import("./repository");
    const update = {
      id: "apps-and-tag-ids-20260927",
      publishedAt: "2026-09-27T06:55:30.147+09:00",
      target: "app",
      summary: "Webアプリ情報を正本化しました。",
      href: "/apps",
      visible: false,
    };
    const files = new Map([
      ["content/home/banners.json", JSON.stringify([])],
      ["content/home/announcements.json", JSON.stringify([])],
      ["content/updates/apps-and-tag-ids-20260927.json", JSON.stringify(update)],
      ["fixtures/tags.json", JSON.stringify([])],
    ]);

    const snapshot = parseContentSnapshot(files, "base-revision");

    expect(snapshot.updates).toEqual([{ ...update, skipInfo: true }]);
  });

  it("resolves relative tool and app images against the Content commit", async () => {
    const { parseContentSnapshot } = await import("./repository");
    const files = new Map([
      ["content/home/banners.json", JSON.stringify([])],
      ["content/home/announcements.json", JSON.stringify([])],
      ["fixtures/tags.json", JSON.stringify([])],
      ["content/tools/sample-tool.json", JSON.stringify({
        slug: "sample-tool",
        displayName: "サンプルツール",
        summary: "概要",
        repository: "p-o-ke-nae/sample-tool",
        kind: "windows-app",
        image: "./images/pokenaeLogo.png",
        tags: [],
      })],
      ["content/apps/sample-app.json", JSON.stringify({
        slug: "sample-app",
        displayName: "サンプルアプリ",
        summary: "概要",
        metaLabel: "Webアプリ",
        image: "./images/pokenaeLogo.png",
        imageAlt: "",
        href: "/sample-app",
        status: "published",
        order: 1,
        tags: [],
      })],
    ]);

    const snapshot = parseContentSnapshot(files, "base-revision");

    expect(snapshot.tools[0]?.image).toBe(
      "https://raw.githubusercontent.com/p-o-ke-nae/pokenae.Content/base-revision/content/tools/images/pokenaeLogo.png",
    );
    expect(snapshot.apps[0]?.image).toBe(
      "https://raw.githubusercontent.com/p-o-ke-nae/pokenae.Content/base-revision/content/apps/images/pokenaeLogo.png",
    );
  });
});
