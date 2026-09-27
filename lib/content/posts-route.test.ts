import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  usesContentFixtures: vi.fn(),
  getFreshContentAdminSnapshot: vi.fn(),
  getFreshContentSnapshotWithRevision: vi.fn(),
  getContentRevisionFiles: vi.fn(),
  createContentPullRequest: vi.fn(),
  getReservedTagDefinitions: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ getAdminAuthorization: mocks.getAdminAuthorization }));
vi.mock("@/lib/content/repository", () => ({
  getContentSnapshot: vi.fn(),
  getFreshContentAdminSnapshot: mocks.getFreshContentAdminSnapshot,
  getFreshContentSnapshotWithRevision: mocks.getFreshContentSnapshotWithRevision,
  getContentRevisionFiles: mocks.getContentRevisionFiles,
  usesContentFixtures: mocks.usesContentFixtures,
}));
vi.mock("@/lib/github/content-writer", () => ({
  createContentPullRequest: mocks.createContentPullRequest,
  getReservedTagDefinitions: mocks.getReservedTagDefinitions,
}));
vi.mock("@/lib/content/schemas", () => ({
  gitCommitShaSchema: {
    safeParse: (value: unknown) => typeof value === "string" && /^[0-9a-fA-F]{40}$/.test(value)
      ? { success: true, data: value.toLowerCase() }
      : { success: false },
  },
  postWriteRequestSchema: {
    safeParse: (value: { baseRevision: string; post: unknown; body: string }) => value.body.trim()
      ? { success: true, data: { ...value, body: value.body.trim() } }
      : { success: false, error: { issues: [{ path: ["body"] }] } },
  },
  postUnpublishRequestSchema: {
    safeParse: (value: { baseRevision?: unknown; slug?: unknown }) => typeof value.baseRevision === "string" && typeof value.slug === "string"
      ? { success: true, data: value }
      : { success: false, error: { issues: [] } },
  },
  postFrontmatterSchema: {
    parse: (value: unknown) => value,
  },
  tagDefinitionListSchema: {
    safeParse: (value: unknown) => Array.isArray(value)
      ? { success: true, data: value }
      : { success: false, error: { issues: [] } },
  },
  updateContentSchema: {
    safeParse: (value: unknown) => ({ success: true, data: value }),
  },
}));
vi.mock("@/lib/github/content-conflict", () => ({
  isContentConflictError: (error: unknown) => error instanceof Error && error.name === "ContentConflictError",
}));

describe("POST /api/content/posts", () => {
  const uppercaseRevision = "ABCDEF0123456789ABCDEF0123456789ABCDEF01";
  const normalizedRevision = uppercaseRevision.toLowerCase();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getAdminAuthorization.mockResolvedValue({
      authorized: true,
      status: 200,
      session: { user: { email: "admin@example.com" } },
    });
    mocks.usesContentFixtures.mockReturnValue(false);
    mocks.getReservedTagDefinitions.mockResolvedValue([]);
    mocks.getFreshContentAdminSnapshot.mockResolvedValue({
      revision: normalizedRevision,
      schemas: {
        update: JSON.stringify({
          type: "object",
          additionalProperties: false,
          required: ["id", "publishedAt", "target", "summary", "href", "visible"],
          properties: {
            id: { type: "string" },
            publishedAt: { type: "string", format: "date-time" },
            target: { enum: ["post", "tool", "app", "home", "navigation"] },
            summary: { type: "string" },
            href: { type: "string" },
            visible: { type: "boolean" },
          },
        }),
      },
      tags: [],
      postSources: [],
    });
  });

  afterEach(() => vi.useRealTimers());

  function validForm(baseRevision?: string) {
    const form = new FormData();
    if (baseRevision !== undefined) form.set("baseRevision", baseRevision);
    form.set("post", JSON.stringify({
      slug: "test-post",
      title: "Test post",
      summary: "Summary",
      publishedAt: "2025-01-01",
      status: "draft",
      category: "news",
      tags: [],
      relatedTags: [],
      priority: 0,
      showInPickup: false,
    }));
    form.set("body", "Body");
    form.set("tagDefinitions", "[]");
    return form;
  }

  it("returns 503 without GitHub side effects in fixture mode", async () => {
    mocks.usesContentFixtures.mockReturnValue(true);
    const form = validForm(normalizedRevision);
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "CONTENT_WRITE_DISABLED",
      error: expect.stringContaining("CONTENT_SOURCE=github"),
    });
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("returns 400 without a revision and does not call the writer", async (baseRevision) => {
    const form = validForm(baseRevision);
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(400);
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it.each(["not-a-commit", "abcdef0123456789abcdef0123456789abcdef0g", `${normalizedRevision} `])("returns 400 for invalid revision %j and does not call the writer", async (baseRevision) => {
    const form = validForm(baseRevision);
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(400);
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it("normalizes and passes the editor revision to the writer", async () => {
    mocks.createContentPullRequest.mockResolvedValue({ html_url: "https://example.test/pr/1", number: 1 });
    const form = validForm(uppercaseRevision);
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(201);
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: normalizedRevision,
    }));
  });

  it("writes a scheduled publication with matching canonical dates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T02:00:00Z"));
    mocks.createContentPullRequest.mockResolvedValue({ html_url: "https://example.test/pr/2", number: 2 });
    const form = validForm(normalizedRevision);
    const metadata = JSON.parse(String(form.get("post"))) as Record<string, unknown>;
    form.set("post", JSON.stringify({
      ...metadata,
      publishedAt: "2026-09-28",
      updatedAt: "2026-09-27T00:00:00Z",
      status: "published",
    }));
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(201);
    const files = mocks.createContentPullRequest.mock.calls[0][0].files as Array<{ path: string; content: string }>;
    const article = files.find(({ path }) => path.endsWith("/index.md"))?.content;
    const update = files.find(({ path }) => path.startsWith("content/updates/"))?.content;
    expect(article).toContain('publishedAt: "2026-09-28T00:00:00+09:00"');
    expect(article).toContain('updatedAt: "2026-09-28T00:00:00+09:00"');
    expect(JSON.parse(update ?? "{}")).toMatchObject({
      publishedAt: "2026-09-28T00:00:00+09:00",
    });
  });

  it("sets an update date when editing an already published article", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T02:00:00Z"));
    mocks.getFreshContentAdminSnapshot.mockResolvedValue({
      ...(await mocks.getFreshContentAdminSnapshot()),
      postSources: [{ path: "content/posts/test-post/index.md", source: "" }],
    });
    mocks.createContentPullRequest.mockResolvedValue({ html_url: "https://example.test/pr/2", number: 2 });
    const form = validForm(normalizedRevision);
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(201);
    const files = mocks.createContentPullRequest.mock.calls[0][0].files as Array<{ path: string; content: string }>;
    const article = files.find(({ path }) => path.endsWith("/index.md"))?.content;
    expect(article).toContain('publishedAt: "2025-01-01T00:00:00+09:00"');
    expect(article).toContain('updatedAt: "2026-09-27T02:00:00.000Z"');
  });

  it("adds a new tag catalog entry to the same article pull request", async () => {
    mocks.createContentPullRequest.mockResolvedValue({ html_url: "https://example.test/pr/3", number: 3 });
    const form = validForm(normalizedRevision);
    form.set("tagDefinitions", JSON.stringify([{ id: "new-generation-7", label: "第7世代" }]));
    form.set("post", JSON.stringify({
      slug: "test-post",
      title: "Test post",
      summary: "Summary",
      publishedAt: "2025-01-01",
      status: "draft",
      category: "news",
      tags: ["new-generation-7"],
      relatedTags: [],
      priority: 0,
      showInPickup: false,
    }));
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(201);
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      files: expect.arrayContaining([
        expect.objectContaining({ path: "content/posts/test-post/index.md" }),
        expect.objectContaining({ path: "fixtures/tags.json", content: expect.stringContaining("000001") }),
        expect.objectContaining({ path: "fixtures/tag-labels.json", content: expect.stringContaining("第7世代") }),
      ]),
    }));
  });

  it("normalizes same-post raw image URLs and omits an unset legacyUrl", async () => {
    mocks.createContentPullRequest.mockResolvedValue({ html_url: "https://example.test/pr/4", number: 4 });
    const rawImage = `https://raw.githubusercontent.com/p-o-ke-nae/pokenae.Content/${normalizedRevision}/content/posts/test-post/images/pasted.webp`;
    const form = validForm(normalizedRevision);
    const metadata = JSON.parse(String(form.get("post"))) as Record<string, unknown>;
    form.set("post", JSON.stringify({ ...metadata, thumbnail: rawImage }));
    form.set("body", `![image](${rawImage})`);
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(201);
    const article = mocks.createContentPullRequest.mock.calls[0][0].files
      .find((file: { path: string }) => file.path === "content/posts/test-post/index.md");
    expect(article.content).toContain('thumbnail: "./images/pasted.webp"');
    expect(article.content).toContain("![image](./images/pasted.webp)");
    expect(article.content).not.toContain("legacyUrl:");
    expect(article.content).not.toContain("raw.githubusercontent.com");
  });

  it("rejects external article images before creating a pull request", async () => {
    const form = validForm(normalizedRevision);
    form.set("body", "![image](https://example.com/image.webp)");
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("./images/") });
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it("does not allow article save to rename an existing tag", async () => {
    mocks.getFreshContentAdminSnapshot.mockResolvedValue({
      ...(await mocks.getFreshContentAdminSnapshot()),
      tags: [{ id: "000001", label: "ポケモン" }],
    });
    const form = validForm(normalizedRevision);
    form.set("tagDefinitions", JSON.stringify([{ id: "000001", label: "Pokemon" }]));
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("表示名") });
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it("returns 409 when the required revision conflicts during the write", async () => {
    mocks.createContentPullRequest.mockRejectedValue(Object.assign(new Error("再読込してください。"), { name: "ContentConflictError" }));
    const form = validForm(normalizedRevision);
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toMatchObject({ code: "CONTENT_CONFLICT" });
    expect(body).not.toHaveProperty("pullRequestUrl");
    expect(body).not.toHaveProperty("number");
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: normalizedRevision,
    }));
  });

  it("creates a PR that changes a published post to draft", async () => {
    mocks.getFreshContentSnapshotWithRevision.mockResolvedValue({
      revision: normalizedRevision,
      content: { posts: [{ slug: "test-post", title: "Test post", status: "published" }] },
    });
    mocks.getContentRevisionFiles.mockResolvedValue({
      revision: normalizedRevision,
      files: new Map([["content/posts/test-post/index.md", "---\nslug: test-post\nstatus: published\ntitle: Test post\n---\n\n本文\n"]]),
    });
    mocks.createContentPullRequest.mockResolvedValue({ html_url: "https://example.test/pr/2", number: 2 });
    const { DELETE } = await import("../../app/api/content/posts/route");

    const response = await DELETE(new Request("http://localhost/api/content/posts", {
      method: "DELETE",
      body: JSON.stringify({ baseRevision: normalizedRevision, slug: "test-post" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(201);
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: normalizedRevision,
      files: [expect.objectContaining({
        path: "content/posts/test-post/index.md",
        content: expect.stringContaining("status: draft"),
      })],
    }));
  });

  it("returns 409 when unpublish revision conflicts", async () => {
    mocks.getFreshContentSnapshotWithRevision.mockResolvedValue({ revision: "1234567890123456789012345678901234567890", content: { posts: [] } });
    const { DELETE } = await import("../../app/api/content/posts/route");

    const response = await DELETE(new Request("http://localhost/api/content/posts", {
      method: "DELETE",
      body: JSON.stringify({ baseRevision: normalizedRevision, slug: "test-post" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(409);
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });
});
