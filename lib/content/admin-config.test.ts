import { describe, expect, it } from "vitest";
import { buildToolContentChanges, prepareAnnouncementWrite, prepareAppWrite, prepareToolWrite } from "./admin-config";

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
const appSchema = JSON.stringify({
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
    order: { type: "integer", minimum: 0 },
    tags: { type: "array" },
  },
});

describe("buildToolContentChanges", () => {
  it("adds sha:null-compatible deletion changes for removed slugs", () => {
    const changes = buildToolContentChanges(
      ["content/tools/keep.json", "content/tools/remove.json"],
      [{
        slug: "keep",
        displayName: "Keep",
        summary: "kept tool",
        repository: "p-o-ke-nae/keep",
        kind: "library",
        docs: { readme: "README.md", paths: ["docs/"] },
        release: { channel: "stable", manifestRequired: false, package: "Keep" },
        tags: [],
        showInPickup: false,
        priority: 0,
      }],
    );

    expect(changes.find((change) => change.path === "content/tools/remove.json")).toEqual({
      path: "content/tools/remove.json",
      content: null,
    });
    expect(changes.find((change) => change.path === "content/tools/keep.json")?.content).toContain('"paths": [');
  });

  it("prepares canonical announcements and preserves update publication time", () => {
    const result = prepareAnnouncementWrite({
      rawValue: [{
        id: "notice",
        text: "Notice",
        href: "/info",
        variant: "normal",
        startsAt: "2026-09-26T00:00:00.000Z",
        endsAt: null,
      }],
      homeSchema: JSON.stringify({
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
      }),
      updateSchema,
      updatePath: "content/updates/announcements-20260926100000.json",
      updateId: "announcements-20260926100000",
      summary: "告知を修正",
      publishedAt: "2026-09-26T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "content/home/announcements.json" }),
      expect.objectContaining({
        path: "content/updates/announcements-20260926100000.json",
        content: expect.stringContaining('"publishedAt": "2026-09-26T10:00:00.000Z"'),
      }),
    ]));
  });

  it("prepares tool updates with removed-file deletions", () => {
    const result = prepareToolWrite({
      rawValue: [{
        slug: "keep",
        displayName: "Keep",
        summary: "kept tool",
        repository: "p-o-ke-nae/keep",
        kind: "library",
        docs: { readme: "README.md", paths: [] },
        release: { channel: "stable", manifestRequired: false },
        showInPickup: false,
        priority: 0,
      }],
      currentPaths: ["content/tools/keep.json", "content/tools/remove.json"],
      toolSchema,
      updateSchema,
      updatePath: "content/updates/tools-20260926100000.json",
      updateId: "tools-20260926100000",
      summary: "ツールを修正",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.files).toEqual(expect.arrayContaining([
      { path: "content/tools/remove.json", content: null },
      expect.objectContaining({ path: "content/tools/keep.json" }),
      expect.objectContaining({ path: "content/updates/tools-20260926100000.json" }),
    ]));
  });

  it("hides tool updates from INFO when visible is false", () => {
    const result = prepareToolWrite({
      rawValue: [{
        slug: "hidden",
        displayName: "Hidden",
        summary: "hidden from info",
        repository: "p-o-ke-nae/hidden",
        kind: "library",
        docs: { readme: "README.md", paths: [] },
        release: { channel: "stable", manifestRequired: false },
        showInPickup: false,
        priority: 0,
      }],
      currentPaths: [],
      toolSchema,
      updateSchema,
      updatePath: "content/updates/tools-20260926100000.json",
      updateId: "tools-20260926100000",
      summary: "ツールを修正",
      visible: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    const update = result.files.find((file) => file.path === "content/updates/tools-20260926100000.json");
    expect(JSON.parse(String(update?.content))).toMatchObject({ target: "tool", visible: false });
  });

  it("rejects duplicate tool slugs before building file changes", () => {
    const tool = {
      slug: "duplicate",
      displayName: "Duplicate",
      summary: "duplicate tool",
      repository: "owner/duplicate",
      kind: "library" as const,
    };
    const result = prepareToolWrite({
      rawValue: [tool, tool],
      currentPaths: [],
      toolSchema,
      updateSchema,
      updatePath: "content/updates/tools-20260926100000.json",
      updateId: "tools-20260926100000",
      summary: "ツールを修正",
    });

    expect(result).toEqual({
      success: false,
      issues: [{ path: ["tools", 1, "slug"], message: "slug は重複できません。" }],
    });
  });

  it("rejects image and missing required fields using the canonical tool schema", () => {
    const result = prepareToolWrite({
      rawValue: [{
        slug: "tool",
        displayName: "Tool",
        summary: "tool",
        repository: "p-o-ke-nae/tool",
        kind: "library",
        image: "https://example.com/tool.webp",
      }],
      currentPaths: [],
      toolSchema,
      updateSchema,
      updatePath: "content/updates/tools-20260926100000.json",
      updateId: "tools-20260926100000",
      summary: "ツールを修正",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      ["tools", 0, "image"],
      ["tools", 0, "docs"],
      ["tools", 0, "release"],
      ["tools", 0, "showInPickup"],
      ["tools", 0, "priority"],
    ]));
  });

  it("prepares app updates and deletes removed app files", () => {
    const result = prepareAppWrite({
      rawValue: [{
        slug: "keep",
        displayName: "Keep",
        summary: "kept app",
        href: "/keep",
        imageAlt: "",
        metaLabel: "Webアプリ",
        status: "published",
        order: 0,
        tags: ["000001"],
      }],
      currentPaths: ["content/apps/keep.json", "content/apps/remove.json"],
      appSchema,
      updateSchema,
      updatePath: "content/updates/apps-20260926100000.json",
      updateId: "apps-20260926100000",
      summary: "Webアプリを修正",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.files).toEqual(expect.arrayContaining([
      { path: "content/apps/remove.json", content: null },
      expect.objectContaining({ path: "content/apps/keep.json", content: expect.stringContaining('"image": null') }),
      expect.objectContaining({
        path: "content/updates/apps-20260926100000.json",
        content: expect.stringContaining('"target": "app"'),
      }),
    ]));
  });
});
