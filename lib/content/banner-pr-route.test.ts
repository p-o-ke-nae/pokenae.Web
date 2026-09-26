import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  usesContentFixtures: vi.fn(),
  getEditableContentPullRequest: vi.fn(),
  getReservedTagDefinitions: vi.fn(),
  updateEditableContentPullRequest: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ getAdminAuthorization: mocks.getAdminAuthorization }));
vi.mock("@/lib/content/repository", () => ({ usesContentFixtures: mocks.usesContentFixtures }));
vi.mock("@/lib/content/schemas", async () => import("./schemas"));
vi.mock("@/lib/github/content-conflict", () => ({
  isContentConflictError: (error: unknown) => error instanceof Error && error.name === "ContentConflictError",
}));
vi.mock("@/lib/github/content-writer", () => ({
  ContentPullRequestError: class ContentPullRequestError extends Error {
    constructor(message: string, public status = 400, public code = "CONTENT_PR_INVALID") {
      super(message);
    }
  },
  getEditableContentPullRequest: mocks.getEditableContentPullRequest,
  getReservedTagDefinitions: mocks.getReservedTagDefinitions,
  updateEditableContentPullRequest: mocks.updateEditableContentPullRequest,
}));

const homeSchema = JSON.stringify({
  oneOf: [{
    title: "Banners",
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["id", "image", "alt", "href", "startsAt", "endsAt", "order"],
      properties: {
        id: { type: "string" },
        image: { type: "string" },
        alt: { type: "string" },
        href: { type: "string" },
        startsAt: { type: "string", format: "date-time" },
        endsAt: { type: ["string", "null"], format: "date-time" },
        order: { type: "integer" },
      },
    },
  }],
});
const updateSchema = JSON.stringify({
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
});
const toolSchema = JSON.stringify({
  type: "object",
  additionalProperties: false,
  required: ["slug", "displayName", "summary", "kind", "repository", "docs", "release", "tags", "showInPickup", "priority"],
  properties: {
    slug: { type: "string" },
    displayName: { type: "string" },
    summary: { type: "string" },
    kind: { enum: ["windows-app", "library"] },
    repository: { type: "string", pattern: "^p-o-ke-nae/" },
    docs: { type: "object" },
    release: { type: "object" },
    supportedOs: { type: "array" },
    tags: { type: "array", items: { type: "string", pattern: "^(?!000000)\\d{6}$" } },
    showInPickup: { type: "boolean" },
    priority: { type: "integer" },
  },
});
const announcementHomeSchema = JSON.stringify({
  oneOf: [{
    title: "Announcements",
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["id", "text", "href", "variant", "startsAt", "endsAt"],
      properties: {
        id: { type: "string" },
        text: { type: "string" },
        href: { type: "string" },
        variant: { enum: ["normal", "emphasis", "urgent"] },
        startsAt: { type: "string", format: "date-time" },
        endsAt: { type: ["string", "null"], format: "date-time" },
      },
    },
  }],
});

describe("banner pull request route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAdminAuthorization.mockResolvedValue({
      authorized: true,
      status: 200,
      session: { user: { email: "admin@example.com" } },
    });
    mocks.usesContentFixtures.mockReturnValue(false);
    mocks.getReservedTagDefinitions.mockResolvedValue([]);
  });

  it("returns field issues for the PR #2 regression payload", async () => {
    mocks.getEditableContentPullRequest.mockResolvedValue({
      number: 2,
      title: "banner",
      url: "https://example.test/2",
      branch: "content/banners-20260926103844",
      kind: "banners",
      headRevision: "2222222222222222222222222222222222222222",
      baseRevision: "1111111111111111111111111111111111111111",
      updatePath: "content/updates/banners-20260926103844.json",
      value: [{ id: "welcome2", image: "/mock/slide1.svg", alt: "banner", href: "/", order: 2 }],
      update: {
        id: "banners-20260926103844",
        publishedAt: "2026-09-26T10:38:44.347Z",
        target: "home",
        summary: "更新",
      },
      paths: [],
      toolPaths: [],
      schemas: { home: homeSchema, tool: toolSchema, update: updateSchema },
    });
    const { GET } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await GET(new Request("http://localhost?kind=banners"), { params: Promise.resolve({ number: "2" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.issues.map((issue: { path: Array<string | number> }) => issue.path)).toEqual(expect.arrayContaining([
      ["banners", 0, "startsAt"],
      ["banners", 0, "endsAt"],
      ["banners", 0, "image"],
      ["update", "href"],
      ["update", "visible"],
    ]));
  });

  it("rejects unauthenticated reads before GitHub access", async () => {
    mocks.getAdminAuthorization.mockResolvedValue({ authorized: false, status: 401 });
    const { GET } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await GET(new Request("http://localhost?kind=banners"), { params: Promise.resolve({ number: "2" }) });

    expect(response.status).toBe(401);
    expect(mocks.getEditableContentPullRequest).not.toHaveBeenCalled();
  });

  it("rejects malformed pull request numbers before GitHub access", async () => {
    const { GET } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await GET(new Request("http://localhost?kind=banners"), { params: Promise.resolve({ number: "2x" }) });

    expect(response.status).toBe(400);
    expect(mocks.getEditableContentPullRequest).not.toHaveBeenCalled();
  });

  it("rejects fixture writes before parsing the request", async () => {
    mocks.usesContentFixtures.mockReturnValue(true);
    const { PUT } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await PUT(new Request("http://localhost?kind=banners", { method: "PUT" }), {
      params: Promise.resolve({ number: "2" }),
    });

    expect(response.status).toBe(503);
    expect(mocks.getEditableContentPullRequest).not.toHaveBeenCalled();
    expect(mocks.updateEditableContentPullRequest).not.toHaveBeenCalled();
  });

  it("returns 409 before preparing a write when the loaded head is stale", async () => {
    mocks.getEditableContentPullRequest.mockResolvedValue({
      headRevision: "3333333333333333333333333333333333333333",
    });
    const form = new FormData();
    form.set("expectedRevision", "2222222222222222222222222222222222222222");
    form.set("kind", "banners");
    form.set("banners", "[]");
    const { PUT } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await PUT(new Request("http://localhost?kind=banners", { method: "PUT", body: form }), {
      params: Promise.resolve({ number: "2" }),
    });

    expect(response.status).toBe(409);
    expect(mocks.updateEditableContentPullRequest).not.toHaveBeenCalled();
  });

  it("updates the same pull request with canonical banner files", async () => {
    mocks.getEditableContentPullRequest.mockResolvedValue({
      number: 2,
      title: "banner",
      url: "https://example.test/2",
      branch: "content/banners-20260926103844",
      kind: "banners",
      headRevision: "2222222222222222222222222222222222222222",
      baseRevision: "1111111111111111111111111111111111111111",
      updatePath: "content/updates/banners-20260926103844.json",
      value: [],
      update: {},
      paths: ["content/home/images/existing.webp"],
      toolPaths: [],
      schemas: { home: homeSchema, tool: toolSchema, update: updateSchema },
    });
    mocks.updateEditableContentPullRequest.mockResolvedValue({
      number: 2,
      url: "https://example.test/2",
      headRevision: "3333333333333333333333333333333333333333",
    });
    const form = new FormData();
    form.set("expectedRevision", "2222222222222222222222222222222222222222");
    form.set("kind", "banners");
    form.set("changeNote", "不正バナーを修正");
    form.set("banners", JSON.stringify([{
      id: "fixed",
      image: "./images/existing.webp",
      alt: "修正済み",
      href: "/",
      order: 0,
      startsAt: "2026-09-26T00:00:00.000Z",
      endsAt: null,
    }]));
    const { PUT } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await PUT(new Request("http://localhost?kind=banners", { method: "PUT", body: form }), {
      params: Promise.resolve({ number: "2" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      number: 2,
      pullRequestUrl: "https://example.test/2",
      headRevision: "3333333333333333333333333333333333333333",
    });
    expect(mocks.updateEditableContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      number: 2,
      kind: "banners",
      expectedRevision: "2222222222222222222222222222222222222222",
      files: expect.arrayContaining([
        expect.objectContaining({ path: "content/home/banners.json" }),
        expect.objectContaining({ path: "content/updates/banners-20260926103844.json" }),
      ]),
    }));
  });

  it("loads and updates an announcements pull request with its explicit kind", async () => {
    const value = [{
      id: "maintenance",
      text: "メンテナンス",
      href: "/info",
      variant: "emphasis",
      startsAt: "2026-09-26T00:00:00.000Z",
      endsAt: null,
    }];
    mocks.getEditableContentPullRequest.mockResolvedValue({
      number: 4,
      title: "announcements",
      url: "https://example.test/4",
      branch: "content/announcements-20260926103844",
      kind: "announcements",
      headRevision: "2222222222222222222222222222222222222222",
      baseRevision: "1111111111111111111111111111111111111111",
      updatePath: "content/updates/announcements-20260926103844.json",
      value,
      update: {
        id: "announcements-20260926103844",
        publishedAt: "2026-09-26T10:38:44.000Z",
        target: "home",
        summary: "告知を更新",
        href: "/",
        visible: true,
      },
      paths: ["content/home/announcements.json"],
      toolPaths: [],
      schemas: { home: announcementHomeSchema, tool: toolSchema, update: updateSchema },
    });
    mocks.updateEditableContentPullRequest.mockResolvedValue({
      number: 4,
      url: "https://example.test/4",
      headRevision: "3333333333333333333333333333333333333333",
    });
    const { GET, PUT } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const getResponse = await GET(new Request("http://localhost?kind=announcements"), {
      params: Promise.resolve({ number: "4" }),
    });
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toMatchObject({ kind: "announcements", value, issues: [] });

    const putResponse = await PUT(new Request("http://localhost?kind=announcements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "announcements",
        expectedRevision: "2222222222222222222222222222222222222222",
        value,
        changeNote: "告知を修正",
      }),
    }), { params: Promise.resolve({ number: "4" }) });

    expect(putResponse.status).toBe(200);
    expect(mocks.updateEditableContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      kind: "announcements",
      files: expect.arrayContaining([
        expect.objectContaining({ path: "content/home/announcements.json" }),
        expect.objectContaining({
          path: "content/updates/announcements-20260926103844.json",
          content: expect.stringContaining('"publishedAt": "2026-09-26T10:38:44.000Z"'),
        }),
      ]),
    }));
  });

  it("updates tools and emits deletions for removed tool files", async () => {
    mocks.getEditableContentPullRequest.mockResolvedValue({
      number: 5,
      title: "tools",
      url: "https://example.test/5",
      branch: "content/tools-20260926103844",
      kind: "tools",
      headRevision: "2222222222222222222222222222222222222222",
      baseRevision: "1111111111111111111111111111111111111111",
      updatePath: "content/updates/tools-20260926103844.json",
      value: [],
      update: {
        id: "tools-20260926103844",
        publishedAt: "2026-09-26T10:38:44.000Z",
        target: "tool",
        summary: "ツールを更新",
        href: "/tools",
        visible: true,
      },
      paths: ["content/tools/keep.json", "content/tools/remove.json"],
      toolPaths: ["content/tools/keep.json", "content/tools/remove.json"],
      schemas: { home: homeSchema, tool: toolSchema, update: updateSchema },
    });
    mocks.updateEditableContentPullRequest.mockResolvedValue({
      number: 5,
      url: "https://example.test/5",
      headRevision: "3333333333333333333333333333333333333333",
    });
    const value = [{
      slug: "keep",
      displayName: "Keep",
      summary: "kept",
      repository: "p-o-ke-nae/keep",
      kind: "library",
      docs: { readme: "README.md", paths: [] },
      release: { channel: "stable", manifestRequired: false },
      tags: [],
      showInPickup: false,
      priority: 0,
    }];
    const { PUT } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await PUT(new Request("http://localhost?kind=tools", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "tools",
        expectedRevision: "2222222222222222222222222222222222222222",
        value,
      }),
    }), { params: Promise.resolve({ number: "5" }) });

    expect(response.status).toBe(200);
    expect(mocks.updateEditableContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      kind: "tools",
      files: expect.arrayContaining([
        { path: "content/tools/remove.json", content: null },
        expect.objectContaining({ path: "content/tools/keep.json" }),
        expect.objectContaining({ path: "content/updates/tools-20260926103844.json" }),
      ]),
    }));
  });

  it("does not update a tool pull request that violates the canonical schema", async () => {
    mocks.getEditableContentPullRequest.mockResolvedValue({
      number: 5,
      title: "tools",
      url: "https://example.test/5",
      branch: "content/tools-20260926103844",
      kind: "tools",
      headRevision: "2222222222222222222222222222222222222222",
      baseRevision: "1111111111111111111111111111111111111111",
      updatePath: "content/updates/tools-20260926103844.json",
      value: [],
      update: {
        id: "tools-20260926103844",
        publishedAt: "2026-09-26T10:38:44.000Z",
        target: "tool",
        summary: "ツールを更新",
        href: "/tools",
        visible: true,
      },
      paths: ["content/tools/tool.json"],
      toolPaths: ["content/tools/tool.json"],
      schemas: { home: homeSchema, tool: toolSchema, update: updateSchema },
    });
    const { PUT } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await PUT(new Request("http://localhost?kind=tools", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "tools",
        expectedRevision: "2222222222222222222222222222222222222222",
        value: [{
          slug: "tool",
          displayName: "Tool",
          summary: "tool",
          repository: "p-o-ke-nae/tool",
          kind: "library",
          image: "./images/tool.webp",
        }],
      }),
    }), { params: Promise.resolve({ number: "5" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "CONTENT_VALIDATION_FAILED",
      issues: expect.arrayContaining([
        expect.objectContaining({ path: ["tools", 0, "image"] }),
      ]),
    });
    expect(mocks.updateEditableContentPullRequest).not.toHaveBeenCalled();
  });

  it("rejects a body kind that does not match the requested kind", async () => {
    const { PUT } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await PUT(new Request("http://localhost?kind=tools", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "announcements",
        expectedRevision: "2222222222222222222222222222222222222222",
        value: [],
      }),
    }), { params: Promise.resolve({ number: "5" }) });

    expect(response.status).toBe(400);
    expect(mocks.getEditableContentPullRequest).not.toHaveBeenCalled();
  });
});
