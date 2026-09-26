import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  createContentPullRequest: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ getAdminAuthorization: mocks.getAdminAuthorization }));
vi.mock("@/lib/content/repository", () => ({ getContentSnapshot: vi.fn() }));
vi.mock("@/lib/github/content-writer", () => ({ createContentPullRequest: mocks.createContentPullRequest }));
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
  });

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
    return form;
  }

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
});
