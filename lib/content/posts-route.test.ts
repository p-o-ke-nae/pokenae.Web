import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  createContentPullRequest: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ getAdminAuthorization: mocks.getAdminAuthorization }));
vi.mock("@/lib/content/repository", () => ({ getContentSnapshot: vi.fn() }));
vi.mock("@/lib/github/content-writer", () => ({ createContentPullRequest: mocks.createContentPullRequest }));
vi.mock("@/lib/content/schemas", () => ({
  postFrontmatterSchema: {
    safeParse: (value: unknown) => ({ success: true, data: value }),
  },
}));
vi.mock("@/lib/github/content-conflict", () => ({
  isContentConflictError: (error: unknown) => error instanceof Error && error.name === "ContentConflictError",
}));

describe("POST /api/content/posts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getAdminAuthorization.mockResolvedValue({
      authorized: true,
      status: 200,
      session: { user: { email: "admin@example.com" } },
    });
  });

  it("passes the editor revision to the writer and returns 409 on a late conflict", async () => {
    mocks.createContentPullRequest.mockRejectedValue(Object.assign(new Error("再読込してください。"), { name: "ContentConflictError" }));
    const form = new FormData();
    form.set("baseRevision", "expected-main-commit");
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
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "CONTENT_CONFLICT" });
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: "expected-main-commit",
    }));
  });

  it("keeps legacy callers without a revision compatible", async () => {
    mocks.createContentPullRequest.mockResolvedValue({ html_url: "https://example.test/pr/1", number: 1 });
    const form = new FormData();
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
    const { POST } = await import("../../app/api/content/posts/route");

    const response = await POST(new Request("http://localhost/api/content/posts", { method: "POST", body: form }));

    expect(response.status).toBe(201);
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.not.objectContaining({
      expectedRevision: expect.anything(),
    }));
  });
});
