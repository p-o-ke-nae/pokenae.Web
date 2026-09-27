import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentConflictError } from "./content-conflict";
import { getContentRevisionFiles } from "../content/repository";

vi.mock("server-only", () => ({}));
vi.mock("./app-auth", () => ({
  getRequiredInstallationToken: vi.fn(async () => "installation-token"),
  getOptionalInstallationToken: vi.fn(async () => "installation-token"),
}));
vi.mock("../content/repository", () => ({
  getContentRevisionFiles: vi.fn(),
}));

describe("getOpenContentPullRequests", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("requests open pull requests and filters out non-open responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([
      { number: 1, title: "open", html_url: "https://example.test/1", state: "open", draft: false, head: { ref: "content/open" } },
      { number: 2, title: "closed", html_url: "https://example.test/2", state: "closed", draft: false, head: { ref: "content/closed" } },
    ]));
    const { getOpenContentPullRequests } = await import("./content-writer");

    await expect(getOpenContentPullRequests()).resolves.toEqual([
      expect.objectContaining({ number: 1, state: "open" }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/pulls?state=open&base=main&per_page=30"),
      expect.objectContaining({ next: { revalidate: 300 } }),
    );
  });

  describe("getReservedTagDefinitions", () => {
    beforeEach(() => vi.restoreAllMocks());

    it("collects six-digit IDs from other open content pull requests", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([
        {
          number: 10,
          state: "open",
          base: { ref: "main", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
          head: {
            ref: "content/article-20260927000000",
            sha: "head-10",
            repo: { full_name: "p-o-ke-nae/pokenae.Content" },
          },
        },
        {
          number: 11,
          state: "open",
          base: { ref: "main", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
          head: {
            ref: "content/tags-20260927000001",
            sha: "head-11",
            repo: { full_name: "p-o-ke-nae/pokenae.Content" },
          },
        },
      ]));
      vi.mocked(getContentRevisionFiles).mockImplementation(async (revision) => ({
        revision,
        files: new Map([["fixtures/tags.json", JSON.stringify(
          revision === "head-10" ? ["000001", "000005"] : ["000001", "000006"],
        )]]),
        paths: [],
      }));
      const { getReservedTagDefinitions } = await import("./content-writer");

      await expect(getReservedTagDefinitions(11)).resolves.toEqual([
        { id: "000001", label: "000001" },
        { id: "000005", label: "000005" },
      ]);
    });
  });

  describe("normalizeLegacyPostTags", () => {
    it("converts legacy labels while preserving current IDs", async () => {
      const { normalizeLegacyPostTags } = await import("./content-writer");
      const source = [
        "---",
        "slug: example",
        "tags: [ポケモン, pokemon]",
        "relatedTags: [ポケモン]",
        "---",
        "",
        "本文",
        "",
      ].join("\n");

      expect(normalizeLegacyPostTags(source, [
        { id: "pokemon", label: "ポケモン" },
      ])).toContain("tags:\n  - pokemon\n  - pokemon");
    });

    it("rejects labels that cannot be resolved to a current tag ID", async () => {
      const { normalizeLegacyPostTags, ContentPullRequestError } = await import("./content-writer");
      const source = "---\ntags: [未定義]\nrelatedTags: []\n---\n本文\n";

      expect(() => normalizeLegacyPostTags(source, [
        { id: "pokemon", label: "ポケモン" },
      ])).toThrowError(ContentPullRequestError);
    });
  });
});

describe("createContentPullRequest", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("has no write side effects when main no longer matches expectedRevision", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ object: { sha: "new-main-commit" } }),
    );
    const { createContentPullRequest } = await import("./content-writer");

    await expect(createContentPullRequest({
      branch: "content/test",
      title: "test",
      body: "test",
      expectedRevision: "expected-main-commit",
      files: [{ path: "content/tools/test.json", content: "{}" }],
    })).rejects.toBeInstanceOf(ContentConflictError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("uses the validated commit as both base tree source and parent", async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: "expected-main-commit" } });
      if (url.endsWith("/git/commits/expected-main-commit")) return Response.json({ tree: { sha: "expected-base-tree" } });
      if (url.endsWith("/git/blobs")) return Response.json({ sha: "blob-sha" });
      if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
      if (url.endsWith("/git/commits")) return Response.json({ sha: "new-commit" });
      if (url.endsWith("/git/refs")) return Response.json({ ref: "refs/heads/content/test" });
      if (url.endsWith("/pulls")) return Response.json({ html_url: "https://github.com/p-o-ke-nae/pokenae.Content/pull/1", number: 1, base: { sha: "expected-main-commit" } });
      return new Response("unexpected", { status: 500 });
    });
    const { createContentPullRequest } = await import("./content-writer");

    await createContentPullRequest({
      branch: "content/test",
      title: "test",
      body: "test",
      expectedRevision: "expected-main-commit",
      files: [{ path: "content/tools/test.json", content: "{}" }],
    });

    expect(calls.find((call) => call.url.endsWith("/git/trees"))?.body).toMatchObject({ base_tree: "expected-base-tree" });
    expect(calls.find((call) => call.url.endsWith("/git/commits") && call.method === "POST")?.body).toMatchObject({ parents: ["expected-main-commit"] });
  });

  it("deletes the branch and creates no pull request when main changes before PR creation", async () => {
    let refReads = 0;
    const calls: Array<{ url: string; method: string }> = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url.endsWith("/git/ref/heads/main")) {
        refReads += 1;
        return Response.json({ object: { sha: refReads === 1 ? "expected-main-commit" : "new-main-commit" } });
      }
      if (url.endsWith("/git/commits/expected-main-commit")) return Response.json({ tree: { sha: "expected-base-tree" } });
      if (url.endsWith("/git/blobs")) return Response.json({ sha: "blob-sha" });
      if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
      if (url.endsWith("/git/commits")) return Response.json({ sha: "new-commit" });
      if (url.endsWith("/git/refs")) return Response.json({ ref: "refs/heads/content/記事" });
      if (url.endsWith("/git/refs/heads/content/%E8%A8%98%E4%BA%8B") && method === "DELETE") return new Response(null, { status: 204 });
      return new Response(`unexpected ${method} ${url}`, { status: 500 });
    });
    const { createContentPullRequest } = await import("./content-writer");

    await expect(createContentPullRequest({
      branch: "content/記事",
      title: "test",
      body: "test",
      expectedRevision: "expected-main-commit",
      files: [{ path: "content/tools/test.json", content: "{}" }],
    })).rejects.toBeInstanceOf(ContentConflictError);

    expect(calls).toContainEqual(expect.objectContaining({
      method: "DELETE",
      url: expect.stringMatching(/\/git\/refs\/heads\/content\/%E8%A8%98%E4%BA%8B$/),
    }));
    expect(calls.some((call) => call.method === "POST" && call.url.endsWith("/pulls"))).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("preserves the revision conflict when branch cleanup fails", async () => {
    let refReads = 0;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/git/ref/heads/main")) {
        refReads += 1;
        return Response.json({ object: { sha: refReads === 1 ? "expected-main-commit" : "new-main-commit" } });
      }
      if (url.endsWith("/git/commits/expected-main-commit")) return Response.json({ tree: { sha: "expected-base-tree" } });
      if (url.endsWith("/git/blobs")) return Response.json({ sha: "blob-sha" });
      if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
      if (url.endsWith("/git/commits")) return Response.json({ sha: "new-commit" });
      if (url.endsWith("/git/refs")) return Response.json({ ref: "refs/heads/content/test" });
      if (url.endsWith("/git/refs/heads/content/test") && method === "DELETE") return new Response("cleanup failed", { status: 500 });
      return new Response(`unexpected ${method} ${url}`, { status: 500 });
    });
    const { createContentPullRequest } = await import("./content-writer");

    await expect(createContentPullRequest({
      branch: "content/test",
      title: "test",
      body: "test",
      expectedRevision: "expected-main-commit",
      files: [{ path: "content/tools/test.json", content: "{}" }],
    })).rejects.toBeInstanceOf(ContentConflictError);

    expect(consoleError).toHaveBeenCalledWith(
      "Content branch cleanup failed after revision conflict",
    );
  });

  it("closes the pull request and deletes the branch when the created PR has a different base revision", async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: "expected-main-commit" } });
      if (url.endsWith("/git/commits/expected-main-commit")) return Response.json({ tree: { sha: "expected-base-tree" } });
      if (url.endsWith("/git/blobs")) return Response.json({ sha: "blob-sha" });
      if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
      if (url.endsWith("/git/commits")) return Response.json({ sha: "new-commit" });
      if (url.endsWith("/git/refs")) return Response.json({ ref: "refs/heads/content/test" });
      if (url.endsWith("/pulls") && method === "POST") {
        return Response.json({
          html_url: "https://github.com/p-o-ke-nae/pokenae.Content/pull/42",
          number: 42,
          base: { sha: "new-main-commit" },
        });
      }
      if (url.endsWith("/pulls/42") && method === "PATCH") return Response.json({ state: "closed" });
      if (url.endsWith("/git/refs/heads/content/test") && method === "DELETE") return new Response(null, { status: 204 });
      return new Response(`unexpected ${method} ${url}`, { status: 500 });
    });
    const { createContentPullRequest } = await import("./content-writer");

    await expect(createContentPullRequest({
      branch: "content/test",
      title: "test",
      body: "test",
      expectedRevision: "expected-main-commit",
      files: [{ path: "content/tools/test.json", content: "{}" }],
    })).rejects.toBeInstanceOf(ContentConflictError);

    expect(calls.filter((call) => call.url.endsWith("/git/ref/heads/main"))).toHaveLength(2);
    expect(calls).toContainEqual(expect.objectContaining({
      url: expect.stringMatching(/\/pulls\/42$/),
      method: "PATCH",
      body: { state: "closed" },
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      url: expect.stringMatching(/\/git\/refs\/heads\/content\/test$/),
      method: "DELETE",
    }));
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("keeps the conflict and logs no cleanup response details when PR and branch cleanup fail", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: "expected-main-commit" } });
      if (url.endsWith("/git/commits/expected-main-commit")) return Response.json({ tree: { sha: "expected-base-tree" } });
      if (url.endsWith("/git/blobs")) return Response.json({ sha: "blob-sha" });
      if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
      if (url.endsWith("/git/commits")) return Response.json({ sha: "new-commit" });
      if (url.endsWith("/git/refs")) return Response.json({ ref: "refs/heads/content/test" });
      if (url.endsWith("/pulls") && method === "POST") {
        return Response.json({ html_url: "https://example.test/pr/42", number: 42, base: { sha: "new-main-commit" } });
      }
      if (url.endsWith("/pulls/42") && method === "PATCH") return new Response("secret close detail", { status: 500 });
      if (url.endsWith("/git/refs/heads/content/test") && method === "DELETE") return new Response("secret branch detail", { status: 500 });
      return new Response(`unexpected ${method} ${url}`, { status: 500 });
    });
    const { createContentPullRequest } = await import("./content-writer");

    await expect(createContentPullRequest({
      branch: "content/test",
      title: "test",
      body: "test",
      expectedRevision: "expected-main-commit",
      files: [{ path: "content/tools/test.json", content: "{}" }],
    })).rejects.toBeInstanceOf(ContentConflictError);

    expect(consoleError.mock.calls).toEqual([
      ["Content pull request cleanup failed after base revision conflict"],
      ["Content branch cleanup failed after base revision conflict"],
    ]);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret");
  });

  it("lists only same-repository open banner PRs whose changed paths are allowed", async () => {
    const safe = {
      number: 2,
      title: "banner",
      html_url: "https://example.test/2",
      state: "open",
      draft: false,
      changed_files: 2,
      base: { ref: "main", sha: "base", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
      head: { ref: "content/banners-20260926103844", sha: "head", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
    };
    const fork = {
      ...safe,
      number: 3,
      head: { ...safe.head, repo: { full_name: "attacker/fork" } },
    };
    const unsafe = {
      ...safe,
      number: 4,
      head: { ...safe.head, ref: "content/banners-20260926103845" },
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/pulls?")) return Response.json([safe, fork, unsafe]);
      if (url.endsWith("/pulls/2")) return Response.json(safe);
      if (url.endsWith("/pulls/4")) return Response.json(unsafe);
      if (url.includes("/pulls/2/files")) {
        return Response.json([
          { filename: "content/home/banners.json" },
          { filename: "content/updates/banners-20260926103844.json" },
        ]);
      }
      if (url.includes("/pulls/4/files")) {
        return Response.json([
          { filename: "content/home/banners.json" },
          { filename: "content/updates/banners-20260926103845.json" },
          { filename: "content/posts/unsafe/index.md" },
        ]);
      }
      return new Response("unexpected", { status: 500 });
    });
    const { listEditableBannerPullRequests } = await import("./content-writer");

    await expect(listEditableBannerPullRequests()).resolves.toEqual([
      expect.objectContaining({ number: 2, branch: "content/banners-20260926103844" }),
    ]);
  });

  it("lists announcement and tool PRs only when their branch kind and paths match", async () => {
    const announcement = {
      number: 6,
      title: "announcements",
      html_url: "https://example.test/6",
      state: "open",
      draft: false,
      changed_files: 2,
      base: { ref: "main", sha: "base", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
      head: { ref: "content/announcements-20260926103844", sha: "announcement-head", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
    };
    const tools = {
      ...announcement,
      number: 7,
      title: "tools",
      changed_files: 3,
      head: { ...announcement.head, ref: "content/tools-20260926103845", sha: "tools-head" },
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/pulls?")) return Response.json([announcement, tools]);
      if (url.endsWith("/pulls/6")) return Response.json(announcement);
      if (url.endsWith("/pulls/7")) return Response.json(tools);
      if (url.includes("/pulls/6/files")) {
        return Response.json([
          { filename: "content/home/announcements.json" },
          { filename: "content/updates/announcements-20260926103844.json" },
        ]);
      }
      if (url.includes("/pulls/7/files")) {
        return Response.json([
          { filename: "content/tools/keep.json" },
          { filename: "content/tools/remove.json" },
          { filename: "content/updates/tools-20260926103845.json" },
        ]);
      }
      return new Response("unexpected", { status: 500 });
    });
    const { listEditableContentPullRequests } = await import("./content-writer");

    await expect(listEditableContentPullRequests("announcements")).resolves.toEqual([
      expect.objectContaining({ number: 6, kind: "announcements" }),
    ]);
    await expect(listEditableContentPullRequests("tools")).resolves.toEqual([
      expect.objectContaining({ number: 7, kind: "tools" }),
    ]);
  });

  it("accepts tag PRs that only change catalog, update, and post frontmatter files", async () => {
    const tags = {
      number: 8,
      title: "tags",
      html_url: "https://example.test/8",
      state: "open",
      draft: false,
      changed_files: 4,
      base: { ref: "main", sha: "base", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
      head: { ref: "content/tags-20260926103846", sha: "tags-head", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/pulls?")) return Response.json([tags]);
      if (url.endsWith("/pulls/8")) return Response.json(tags);
      if (url.includes("/pulls/8/files")) {
        return Response.json([
          { filename: "fixtures/tags.json" },
          { filename: "fixtures/tag-labels.json" },
          { filename: "content/posts/sample/index.md" },
          { filename: "content/updates/tags-20260926103846.json" },
        ]);
      }
      return new Response("unexpected", { status: 500 });
    });

    const { listEditableContentPullRequests } = await import("./content-writer");

    await expect(listEditableContentPullRequests("tags")).resolves.toEqual([
      expect.objectContaining({ number: 8, kind: "tags" }),
    ]);
  });

  it("lists app PRs only when changed paths stay inside content/apps", async () => {
    const appPullRequest = {
      number: 9,
      title: "apps",
      html_url: "https://example.test/9",
      state: "open",
      draft: false,
      changed_files: 2,
      base: { ref: "main", sha: "base", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
      head: { ref: "content/apps-20260926103847", sha: "apps-head", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/pulls?")) return Response.json([appPullRequest]);
      if (url.endsWith("/pulls/9")) return Response.json(appPullRequest);
      if (url.includes("/pulls/9/files")) {
        return Response.json([
          { filename: "content/apps/game-library.json" },
          { filename: "content/updates/apps-20260926103847.json" },
        ]);
      }
      return new Response("unexpected", { status: 500 });
    });

    const { listEditableContentPullRequests } = await import("./content-writer");

    await expect(listEditableContentPullRequests("apps")).resolves.toEqual([
      expect.objectContaining({ number: 9, kind: "apps" }),
    ]);
  });

  it("rejects app PRs that rename a file from outside the allowed paths", async () => {
    const appPullRequest = {
      number: 10,
      title: "apps",
      html_url: "https://example.test/10",
      state: "open",
      draft: false,
      changed_files: 2,
      base: { ref: "main", sha: "base", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
      head: { ref: "content/apps-20260926103848", sha: "apps-head", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/pulls?")) return Response.json([appPullRequest]);
      if (url.endsWith("/pulls/10")) return Response.json(appPullRequest);
      if (url.includes("/pulls/10/files")) {
        return Response.json([
          { filename: "content/apps/game-library.json", previous_filename: "content/posts/sample/index.md" },
          { filename: "content/updates/apps-20260926103848.json" },
        ]);
      }
      return new Response("unexpected", { status: 500 });
    });
    const { listEditableContentPullRequests } = await import("./content-writer");

    await expect(listEditableContentPullRequests("apps")).resolves.toEqual([]);
  });

  it("reports a missing pull request as a content error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}, { status: 404 }));
    const { getEditableContentPullRequest } = await import("./content-writer");

    await expect(getEditableContentPullRequest(404, "apps")).rejects.toMatchObject({
      name: "ContentPullRequestError",
      status: 404,
    });
  });

  it("rejects a pull request when the explicitly requested kind differs from its branch", async () => {
    const pullRequest = {
      number: 2,
      title: "banner",
      html_url: "https://example.test/2",
      state: "open",
      draft: false,
      changed_files: 2,
      base: { ref: "main", sha: "base", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
      head: { ref: "content/banners-20260926103844", sha: "head", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
    };
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      calls.push(String(input));
      return Response.json(pullRequest);
    });
    const { getEditableContentPullRequest } = await import("./content-writer");

    await expect(getEditableContentPullRequest(2, "tools")).rejects.toMatchObject({ status: 403 });
    expect(calls).toHaveLength(1);
  });

  it("rejects a stale PR head before creating blobs", async () => {
    const pullRequest = {
      number: 2,
      title: "banner",
      html_url: "https://example.test/2",
      state: "open",
      draft: false,
      changed_files: 2,
      base: { ref: "main", sha: "base", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
      head: { ref: "content/banners-20260926103844", sha: "new-head", repo: { full_name: "p-o-ke-nae/pokenae.Content" } },
    };
    const calls: Array<{ url: string; method: string }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET" });
      if (url.endsWith("/pulls/2")) return Response.json(pullRequest);
      if (url.includes("/pulls/2/files")) {
        return Response.json([
          { filename: "content/home/banners.json" },
          { filename: "content/updates/banners-20260926103844.json" },
        ]);
      }
      return new Response("unexpected", { status: 500 });
    });
    const { updateEditableBannerPullRequest } = await import("./content-writer");

    await expect(updateEditableBannerPullRequest({
      number: 2,
      expectedRevision: "old-head",
      title: "update",
      files: [{ path: "content/home/banners.json", content: "[]" }],
    })).rejects.toBeInstanceOf(ContentConflictError);
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });
});
