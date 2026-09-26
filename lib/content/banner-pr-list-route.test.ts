import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  usesContentFixtures: vi.fn(),
  listEditableContentPullRequests: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ getAdminAuthorization: mocks.getAdminAuthorization }));
vi.mock("@/lib/content/repository", () => ({ usesContentFixtures: mocks.usesContentFixtures }));
vi.mock("@/lib/github/content-writer", () => ({
  listEditableContentPullRequests: mocks.listEditableContentPullRequests,
}));

describe("GET /api/content/config/pull-requests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAdminAuthorization.mockResolvedValue({
      authorized: true,
      status: 200,
      session: { user: { email: "admin@example.com" } },
    });
    mocks.usesContentFixtures.mockReturnValue(false);
  });

  it("rejects unauthenticated requests before GitHub access", async () => {
    mocks.getAdminAuthorization.mockResolvedValue({ authorized: false, status: 401 });
    const { GET } = await import("../../app/api/content/config/pull-requests/route");
    const response = await GET(new Request("http://localhost/api/content/config/pull-requests?kind=banners"));

    expect(response.status).toBe(401);
    expect(mocks.listEditableContentPullRequests).not.toHaveBeenCalled();
  });

  it("returns an empty list without GitHub access in fixture mode", async () => {
    mocks.usesContentFixtures.mockReturnValue(true);
    const { GET } = await import("../../app/api/content/config/pull-requests/route");
    const response = await GET(new Request("http://localhost/api/content/config/pull-requests?kind=tools"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ pullRequests: [] });
    expect(mocks.listEditableContentPullRequests).not.toHaveBeenCalled();
  });

  it("returns only the editable pull requests supplied by the writer", async () => {
    const pullRequests = [{
      number: 2,
      title: "content: banners を更新",
      url: "https://example.test/2",
      draft: false,
      branch: "content/banners-20260926103844",
      headRevision: "2222222222222222222222222222222222222222",
      baseRevision: "1111111111111111111111111111111111111111",
      updatePath: "content/updates/banners-20260926103844.json",
    }];
    mocks.listEditableContentPullRequests.mockResolvedValue(pullRequests);
    const { GET } = await import("../../app/api/content/config/pull-requests/route");
    const response = await GET(new Request("http://localhost/api/content/config/pull-requests?kind=banners"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ pullRequests });
    expect(mocks.listEditableContentPullRequests).toHaveBeenCalledWith("banners");
  });

  it("requires an explicit supported kind", async () => {
    const { GET } = await import("../../app/api/content/config/pull-requests/route");
    const response = await GET(new Request("http://localhost/api/content/config/pull-requests"));

    expect(response.status).toBe(400);
    expect(mocks.listEditableContentPullRequests).not.toHaveBeenCalled();
  });
});
