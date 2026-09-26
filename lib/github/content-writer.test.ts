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
      if (url.endsWith("/pulls")) return Response.json({ html_url: "https://github.com/p-o-ke-nae/pokenae.Content/pull/1", number: 1 });
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

  it("creates no commit, branch, or pull request when main changes before commit creation", async () => {
    let refReads = 0;
    const calls: Array<{ url: string; method: string }> = [];
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
      return new Response("unexpected", { status: 500 });
    });
    const { createContentPullRequest } = await import("./content-writer");

    await expect(createContentPullRequest({
      branch: "content/test",
      title: "test",
      body: "test",
      expectedRevision: "expected-main-commit",
      files: [{ path: "content/tools/test.json", content: "{}" }],
    })).rejects.toBeInstanceOf(ContentConflictError);

    expect(calls.some((call) => call.method === "POST" && call.url.endsWith("/git/commits"))).toBe(false);
    expect(calls.some((call) => call.method === "POST" && call.url.endsWith("/git/refs"))).toBe(false);
    expect(calls.some((call) => call.method === "POST" && call.url.endsWith("/pulls"))).toBe(false);
  });
});
