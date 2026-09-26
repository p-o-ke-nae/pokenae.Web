import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentConflictError } from "./content-conflict";

vi.mock("server-only", () => ({}));
vi.mock("./app-auth", () => ({
  getRequiredInstallationToken: vi.fn(async () => "installation-token"),
  getOptionalInstallationToken: vi.fn(async () => "installation-token"),
}));

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
});
