import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  getFreshContentAdminSnapshot: vi.fn(),
  createContentPullRequest: vi.fn(),
  buildToolContentChanges: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ getAdminAuthorization: mocks.getAdminAuthorization }));
vi.mock("@/lib/content/repository", () => ({ getFreshContentAdminSnapshot: mocks.getFreshContentAdminSnapshot }));
vi.mock("@/lib/github/content-writer", () => ({ createContentPullRequest: mocks.createContentPullRequest }));
vi.mock("@/lib/content/schemas", () => ({
  announcementContentSchema: { array: () => ({ safeParse: () => ({ success: true, data: [] }) }) },
  bannerContentSchema: { array: () => ({ safeParse: () => ({ success: true, data: [] }) }) },
  toolContentSchema: { array: () => ({ safeParse: () => ({ success: true, data: [] }) }) },
}));
vi.mock("@/lib/content/admin-config", () => ({ buildToolContentChanges: mocks.buildToolContentChanges }));
vi.mock("@/lib/github/content-conflict", () => ({
  isContentConflictError: (error: unknown) => error instanceof Error && error.name === "ContentConflictError",
}));

describe("POST /api/content/config", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAdminAuthorization.mockResolvedValue({
      authorized: true,
      status: 200,
      session: { user: { email: "admin@example.com" } },
    });
    mocks.getFreshContentAdminSnapshot.mockResolvedValue({
      revision: "current-tree",
      banners: [],
      announcements: [],
      tools: [],
      toolPaths: ["content/tools/new-tool.json"],
    });
    mocks.buildToolContentChanges.mockReturnValue([]);
  });

  it("returns 409 before generating deletions when the base revision is stale", async () => {
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "tools", value: [], baseRevision: "stale-tree" }),
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CONTENT_CONFLICT",
      error: expect.stringContaining("再読込"),
    });
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it("returns 409 when main changes again inside the writer", async () => {
    mocks.createContentPullRequest.mockRejectedValue(Object.assign(new Error("再読込してください。"), { name: "ContentConflictError" }));
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "tools", value: [], baseRevision: "current-tree" }),
    }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toMatchObject({ code: "CONTENT_CONFLICT" });
    expect(body).not.toHaveProperty("pullRequestUrl");
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: "current-tree",
    }));
  });
});
