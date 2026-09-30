import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  getFreshContentAdminSnapshot: vi.fn(),
  usesContentFixtures: vi.fn(),
  createContentPullRequest: vi.fn(),
  getReservedTagDefinitions: vi.fn(),
  getEditableContentPullRequest: vi.fn(),
  updateEditableContentPullRequest: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ getAdminAuthorization: mocks.getAdminAuthorization }));
vi.mock("@/lib/content/repository", () => ({
  getFreshContentAdminSnapshot: mocks.getFreshContentAdminSnapshot,
  usesContentFixtures: mocks.usesContentFixtures,
}));
vi.mock("@/lib/github/content-writer", () => ({
  createContentPullRequest: mocks.createContentPullRequest,
  getReservedTagDefinitions: mocks.getReservedTagDefinitions,
  getEditableContentPullRequest: mocks.getEditableContentPullRequest,
  updateEditableContentPullRequest: mocks.updateEditableContentPullRequest,
}));
vi.mock("@/lib/content/schemas", async () => import("./schemas"));
vi.mock("@/lib/content/admin-config", async () => import("./admin-config"));
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
    mocks.usesContentFixtures.mockReturnValue(false);
    mocks.getReservedTagDefinitions.mockResolvedValue([]);
    mocks.updateEditableContentPullRequest.mockResolvedValue({
      url: "https://example.test/pull/5",
      number: 5,
      headRevision: "2222222222222222222222222222222222222222",
    });
    mocks.getFreshContentAdminSnapshot.mockResolvedValue({
      revision: "1111111111111111111111111111111111111111",
      banners: [],
      announcements: [],
      tools: [],
      apps: [],
      tags: [{ id: "000001", label: "ポケモン" }],
      postSources: [],
      toolPaths: ["content/tools/new-tool.json"],
      appPaths: ["content/apps/old-app.json"],
      paths: ["content/home/images/existing.webp"],
      schemas: {
        home: JSON.stringify({
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
        }),
        tool: JSON.stringify({
          type: "object",
          additionalProperties: false,
          required: ["slug", "displayName", "summary", "kind", "repository", "docs", "release", "showInPickup", "priority"],
          properties: {
            slug: { type: "string" },
            displayName: { type: "string" },
            summary: { type: "string" },
            kind: { enum: ["windows-app", "library"] },
            repository: { type: "string", pattern: "^p-o-ke-nae/" },
            docs: { type: "object" },
            release: { type: "object" },
            supportedOs: { type: "array" },
            tags: { type: "array" },
            showInPickup: { type: "boolean" },
            priority: { type: "integer" },
          },
        }),
        app: JSON.stringify({
          type: "object",
          additionalProperties: false,
          required: ["slug", "displayName", "summary", "href", "image", "imageAlt", "metaLabel", "status", "order", "tags"],
          properties: {
            slug: { type: "string" },
            displayName: { type: "string" },
            summary: { type: "string" },
            href: { type: "string", pattern: "^/" },
            image: { type: ["string", "null"] },
            imageAlt: { type: "string" },
            metaLabel: { type: "string" },
            status: { enum: ["draft", "published", "archived"] },
            order: { type: "integer" },
            tags: { type: "array" },
          },
        }),
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
    });
  });

  it("rejects unauthenticated requests before reading content", async () => {
    mocks.getAdminAuthorization.mockResolvedValue({ authorized: false, status: 401 });
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(mocks.getFreshContentAdminSnapshot).not.toHaveBeenCalled();
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it("returns 503 without GitHub side effects in fixture mode", async () => {
    mocks.usesContentFixtures.mockReturnValue(true);
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "tools", value: [], baseRevision: "0000000000000000000000000000000000000000" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "CONTENT_WRITE_DISABLED",
      error: expect.stringContaining("CONTENT_SOURCE=github"),
    });

    expect(mocks.getFreshContentAdminSnapshot).not.toHaveBeenCalled();
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it("rejects an unknown kind before reading the content repository", async () => {
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "unknown",
        value: [],
        baseRevision: "0000000000000000000000000000000000000000",
      }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.getFreshContentAdminSnapshot).not.toHaveBeenCalled();
  });

  it("returns 409 before generating deletions when the base revision is stale", async () => {
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "tools", value: [], baseRevision: "2222222222222222222222222222222222222222" }),
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
      body: JSON.stringify({ kind: "tools", value: [], baseRevision: "1111111111111111111111111111111111111111" }),
    }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toMatchObject({ code: "CONTENT_CONFLICT" });
    expect(body).not.toHaveProperty("pullRequestUrl");
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: "1111111111111111111111111111111111111111",
    }));
  });

  it("returns canonical field errors without creating an invalid tool PR", async () => {
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "tools",
        baseRevision: "1111111111111111111111111111111111111111",
        value: [{
          slug: "tool",
          displayName: "Tool",
          summary: "tool",
          repository: "p-o-ke-nae/tool",
          kind: "library",
          image: "https://example.com/tool.webp",
        }],
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "CONTENT_VALIDATION_FAILED",
      issues: expect.arrayContaining([
        expect.objectContaining({ path: ["tools", 0, "image"] }),
        expect.objectContaining({ path: ["tools", 0, "docs"] }),
      ]),
    });
    expect(mocks.createContentPullRequest).not.toHaveBeenCalled();
  });

  it("creates a tool update hidden from INFO when skipInfo is requested", async () => {
    mocks.createContentPullRequest.mockResolvedValue({
      html_url: "https://example.test/pull/6",
      number: 6,
      base: { sha: "1111111111111111111111111111111111111111" },
    });
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "tools",
        baseRevision: "1111111111111111111111111111111111111111",
        skipInfo: true,
        value: [{
          slug: "new-tool",
          displayName: "New Tool",
          summary: "tool",
          repository: "p-o-ke-nae/new-tool",
          kind: "library",
          docs: { readme: "README.md", paths: [] },
          release: { channel: "stable", manifestRequired: false },
          showInPickup: false,
          priority: 0,
        }],
      }),
    }));

    expect(response.status).toBe(201);
    const files = mocks.createContentPullRequest.mock.calls[0][0].files as Array<{ path: string; content: string | null }>;
    const update = files.find((file) => /^content\/updates\/tools-\d{14}\.json$/.test(file.path));
    expect(JSON.parse(String(update?.content))).toMatchObject({ target: "tool", visible: false });
  });

  it("creates a canonical banner and update file set from multipart input", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T12:34:56.000Z"));
    mocks.createContentPullRequest.mockResolvedValue({
      html_url: "https://example.test/pull/3",
      number: 3,
      base: { sha: "1111111111111111111111111111111111111111" },
    });
    const form = new FormData();
    form.set("kind", "banners");
    form.set("baseRevision", "1111111111111111111111111111111111111111");
    form.set("changeNote", "バナーを更新");
    form.set("value", JSON.stringify([{
      id: "existing",
      image: "./images/existing.webp",
      alt: "既存画像",
      href: "/",
      order: 0,
      startsAt: "2026-09-26T00:00:00.000Z",
      endsAt: null,
    }]));

    try {
      const { POST } = await import("../../app/api/content/config/route");
      const response = await POST(new Request("http://localhost/api/content/config", { method: "POST", body: form }));

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toMatchObject({
        pullRequestUrl: "https://example.test/pull/3",
        number: 3,
      });
      expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
        branch: "content/banners-20260926123456",
        expectedRevision: "1111111111111111111111111111111111111111",
        files: expect.arrayContaining([
          expect.objectContaining({ path: "content/home/banners.json" }),
          expect.objectContaining({ path: "content/updates/banners-20260926123456.json" }),
        ]),
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("creates tag catalog files with stable IDs and labels", async () => {
    mocks.createContentPullRequest.mockResolvedValue({
      html_url: "https://example.test/pull/4",
      number: 4,
      base: { sha: "1111111111111111111111111111111111111111" },
    });
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "tags",
        baseRevision: "1111111111111111111111111111111111111111",
        value: [
          { id: "000001", label: "ポケモン" },
          { id: "", label: "第7世代" },
        ],
      }),
    }));

    expect(response.status).toBe(201);
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      files: expect.arrayContaining([
        expect.objectContaining({ path: "fixtures/tags.json", content: expect.stringContaining("000002") }),
        expect.objectContaining({ path: "fixtures/tag-labels.json", content: expect.stringContaining("第7世代") }),
      ]),
    }));
  });

  it("creates a Web app pull request with app and update files", async () => {
    mocks.createContentPullRequest.mockResolvedValue({
      html_url: "https://example.test/pull/5",
      number: 5,
      base: { sha: "1111111111111111111111111111111111111111" },
    });
    const { POST } = await import("../../app/api/content/config/route");
    const response = await POST(new Request("http://localhost/api/content/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "apps",
        baseRevision: "1111111111111111111111111111111111111111",
        skipInfo: true,
        value: [{
          slug: "new-app",
          displayName: "New App",
          summary: "New app",
          href: "/new-app",
          imageAlt: "",
          metaLabel: "Webアプリ",
          status: "draft",
          order: 0,
          tags: [],
        }],
      }),
    }));

    expect(response.status).toBe(201);
    const files = mocks.createContentPullRequest.mock.calls[0][0].files as Array<{ path: string; content: string | null }>;
    const update = files.find((file) => /^content\/updates\/apps-\d{14}\.json$/.test(file.path));
    expect(JSON.parse(String(update?.content))).toMatchObject({ target: "app", visible: false });
    expect(mocks.createContentPullRequest).toHaveBeenCalledWith(expect.objectContaining({
      branch: expect.stringMatching(/^content\/apps-\d{14}$/),
      files: expect.arrayContaining([
        expect.objectContaining({ path: "content/apps/new-app.json" }),
        { path: "content/apps/old-app.json", content: null },
        expect.objectContaining({ path: expect.stringMatching(/^content\/updates\/apps-\d{14}\.json$/) }),
      ]),
    }));
  });

  it("updates an app pull request with the requested INFO visibility", async () => {
    mocks.getEditableContentPullRequest.mockResolvedValue({
      headRevision: "1111111111111111111111111111111111111111",
      updatePath: "content/updates/apps-20260926100000.json",
      update: {
        publishedAt: "2026-09-26T10:00:00.000Z",
        summary: "既存アプリを更新",
        visible: true,
      },
      branch: "content/apps-20260926100000",
      appPaths: [],
      schemas: {
        app: JSON.stringify({ type: "object" }),
        update: JSON.stringify({ type: "object" }),
      },
    });
    const { PUT } = await import("../../app/api/content/config/pull-requests/[number]/route");
    const response = await PUT(new Request("http://localhost/api/content/config/pull-requests/5?kind=apps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "apps",
        expectedRevision: "1111111111111111111111111111111111111111",
        skipInfo: true,
        value: [{
          slug: "app",
          displayName: "App",
          summary: "Updated app",
          href: "/app",
          imageAlt: "",
          metaLabel: "Webアプリ",
          status: "published",
          order: 0,
          tags: [],
        }],
      }),
    }), { params: Promise.resolve({ number: "5" }) });

    expect(response.status).toBe(200);
    const files = mocks.updateEditableContentPullRequest.mock.calls[0][0].files as Array<{ path: string; content: string | null }>;
    const update = files.find((file) => file.path === "content/updates/apps-20260926100000.json");
    expect(JSON.parse(String(update?.content))).toMatchObject({ target: "app", visible: false });
  });
});
