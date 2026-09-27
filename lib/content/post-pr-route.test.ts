import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  usesContentFixtures: vi.fn(),
  getEditablePostPullRequest: vi.fn(),
  getReservedTagDefinitions: vi.fn(),
  updateEditablePostPullRequest: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ getAdminAuthorization: mocks.getAdminAuthorization }));
vi.mock("@/lib/content/repository", () => ({ usesContentFixtures: mocks.usesContentFixtures }));
vi.mock("@/lib/content/schemas", () => ({
  postWriteRequestSchema: {
    safeParse: (value: { baseRevision: string; post: unknown; body: string }) => value.body.trim()
      ? { success: true, data: { ...value, body: value.body.trim() } }
      : { success: false, error: { issues: [{ path: ["body"] }] } },
    shape: {
      post: {
        safeParse: (value: unknown) => ({ success: true, data: value }),
      },
    },
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
vi.mock("@/lib/github/content-writer", () => ({
  ContentPullRequestError: class ContentPullRequestError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message);
    }
  },
  getEditablePostPullRequest: mocks.getEditablePostPullRequest,
  getReservedTagDefinitions: mocks.getReservedTagDefinitions,
  updateEditablePostPullRequest: mocks.updateEditablePostPullRequest,
}));
vi.mock("@/lib/github/content-conflict", () => ({
  isContentConflictError: () => false,
}));
vi.mock("sharp", () => ({
  default: vi.fn((input: Buffer) => ({
    metadata: vi.fn(async () => ({ width: 1, height: 1 })),
    rotate() { return this; },
    resize() { return this; },
    webp() { return this; },
    toBuffer: vi.fn(async () => input),
  })),
}));

describe("PUT /api/content/posts/pull-requests/[number]", () => {
  const revision = "0123456789abcdef0123456789abcdef01234567";

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAdminAuthorization.mockResolvedValue({
      authorized: true,
      status: 200,
      session: { user: { email: "admin@example.com" } },
    });
    mocks.usesContentFixtures.mockReturnValue(false);
    mocks.getReservedTagDefinitions.mockResolvedValue([]);
    mocks.getEditablePostPullRequest.mockResolvedValue({
      number: 42,
      url: "https://github.com/p-o-ke-nae/pokenae.Content/pull/42",
      slug: "sample-post",
      headRevision: revision,
      updatePath: "content/updates/sample-post-20260927000000.json",
      tagDefinitions: [],
    });
    mocks.updateEditablePostPullRequest.mockResolvedValue({ headRevision: "new-head" });
  });

  afterEach(() => vi.useRealTimers());

  function request(body: string, thumbnail?: string) {
    return new Request("http://localhost/api/content/posts/pull-requests/42", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedRevision: revision,
        post: {
          slug: "sample-post",
          title: "Sample",
          summary: "Summary",
          publishedAt: "2026-09-27",
          status: "draft",
          category: "blog",
          tags: [],
          relatedTags: [],
          priority: 0,
          thumbnail,
          showInPickup: false,
        },
        body,
        tagDefinitions: [],
      }),
    });
  }

  function multipartRequest(body: string, image?: File, skipInfo = false) {
    const form = new FormData();
    form.set("baseRevision", revision);
    form.set("post", JSON.stringify({
      slug: "sample-post",
      title: "Sample",
      summary: "Summary",
      publishedAt: "2026-09-27",
      status: "draft",
      category: "blog",
      tags: [],
      relatedTags: [],
      priority: 0,
      showInPickup: false,
    }));
    form.set("body", body);
    form.set("tagDefinitions", "[]");
    form.set("skipInfo", String(skipInfo));
    if (image) form.append("images", image);
    return new Request("http://localhost/api/content/posts/pull-requests/42", {
      method: "PUT",
      body: form,
    });
  }

  it("repairs raw image URLs when updating the same pull request", async () => {
    const rawImage = `https://raw.githubusercontent.com/p-o-ke-nae/pokenae.Content/${revision}/content/posts/sample-post/images/pasted.webp`;
    const { PUT } = await import("../../app/api/content/posts/pull-requests/[number]/route");

    const response = await PUT(request(`![image](${rawImage})`, rawImage), {
      params: Promise.resolve({ number: "42" }),
    });

    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    const article = mocks.updateEditablePostPullRequest.mock.calls[0][0].files[0].content as string;
    expect(article).toContain('thumbnail: "./images/pasted.webp"');
    expect(article).toContain("![image](./images/pasted.webp)");
    expect(article).not.toContain("legacyUrl:");
    expect(article).not.toContain("raw.githubusercontent.com");
    expect(article).toMatch(/updatedAt: "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/);
  });

  it("matches updatedAt to the future publication and schedules INFO", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T02:00:00Z"));
    const { PUT } = await import("../../app/api/content/posts/pull-requests/[number]/route");
    const scheduledRequest = request("本文");
    const payload = await scheduledRequest.json() as { post: Record<string, unknown> };
    payload.post.publishedAt = "2026-09-28";
    payload.post.updatedAt = "2026-09-27T00:00:00Z";

    const response = await PUT(new Request(scheduledRequest.url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }), {
      params: Promise.resolve({ number: "42" }),
    });

    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    const files = mocks.updateEditablePostPullRequest.mock.calls[0][0].files as Array<{ path: string; content: string | null }>;
    const article = files.find(({ path }) => path.endsWith("/index.md"))?.content;
    const update = files.find(({ path }) => path.startsWith("content/updates/"))?.content;
    expect(article).toContain('publishedAt: "2026-09-28T00:00:00+09:00"');
    expect(article).toContain('updatedAt: "2026-09-28T00:00:00+09:00"');
    expect(JSON.parse(update ?? "{}")).toMatchObject({
      publishedAt: "2026-09-28T00:00:00+09:00",
    });
  });

  it("rejects external images without updating the pull request", async () => {
    const { PUT } = await import("../../app/api/content/posts/pull-requests/[number]/route");

    const response = await PUT(request("![image](https://example.com/image.webp)"), {
      params: Promise.resolve({ number: "42" }),
    });

    expect(response.status, JSON.stringify(await response.clone().json())).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("./images/") });
    expect(mocks.updateEditablePostPullRequest).not.toHaveBeenCalled();
  });

  it("adds newly pasted images when updating the pull request", async () => {
    const png = Uint8Array.from(Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nCEAAAAASUVORK5CYII=",
      "base64",
    ));
    const { PUT } = await import("../../app/api/content/posts/pull-requests/[number]/route");

    const response = await PUT(
      multipartRequest("![image](./images/pasted.webp)", new File([png], "pasted.png", { type: "image/png" })),
      { params: Promise.resolve({ number: "42" }) },
    );

    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    expect(mocks.updateEditablePostPullRequest.mock.calls[0][0].files).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "content/posts/sample-post/images/pasted.webp",
        content: expect.any(Buffer),
      }),
    ]));
  });

  it("removes the update entry and adds skip metadata when INFO is hidden", async () => {
    const { PUT } = await import("../../app/api/content/posts/pull-requests/[number]/route");

    const response = await PUT(multipartRequest("body", undefined, true), {
      params: Promise.resolve({ number: "42" }),
    });

    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    expect(mocks.updateEditablePostPullRequest.mock.calls[0][0]).toMatchObject({
      body: expect.stringContaining("Content-Update: skip"),
      files: expect.arrayContaining([
        expect.objectContaining({ path: "content/updates/sample-post-20260927000000.json", content: null }),
      ]),
    });
  });
});
