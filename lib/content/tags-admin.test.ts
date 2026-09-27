import { describe, expect, it } from "vitest";
import { allocateNextTagId, assignNewTagIds, assignNewTagsToPost, prepareTagWrite, serializeTagFiles } from "./tags-admin";

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

describe("tag admin writes", () => {
  it("serializes stable IDs separately from editable labels", () => {
    expect(serializeTagFiles([
      { id: "000002", label: "ポケモン" },
      { id: "000001", label: "第7世代" },
    ])).toEqual([
      expect.objectContaining({
        path: "fixtures/tags.json",
        content: expect.stringContaining('"000001"'),
      }),
      expect.objectContaining({
        path: "fixtures/tag-labels.json",
        content: expect.stringContaining('"000001": "第7世代"'),
      }),
    ]);
  });

  it("removes a deleted tag from tags and relatedTags in every affected post", () => {
    const result = prepareTagWrite({
      rawValue: [{ id: "000001", label: "ポケモン" }],
      currentTags: [
        { id: "000001", label: "Pokemon" },
        { id: "000002", label: "第7世代" },
      ],
      postSources: [{
        path: "content/posts/sample/index.md",
        source: `---
slug: sample
tags: ['000001', '000002']
relatedTags: ['000002']
---

本文
`,
      }],
      updateSchema,
      updatePath: "content/updates/tags-20260927000000.json",
      updateId: "tags-20260927000000",
      summary: "タグを更新",
      publishedAt: "2026-09-27T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.files).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "content/posts/sample/index.md",
        content: expect.stringMatching(/tags:\s*\n\s*- '000001'[\s\S]*relatedTags: \[\]/),
      }),
    ]));
  });

  it("rejects duplicate IDs", () => {
    const result = prepareTagWrite({
      rawValue: [
        { id: "000001", label: "ポケモン" },
        { id: "000001", label: "Pokemon" },
      ],
      currentTags: [],
      postSources: [],
      updateSchema,
      updatePath: "content/updates/tags-20260927000000.json",
      updateId: "tags-20260927000000",
      summary: "タグを更新",
    });

    expect(result).toMatchObject({
      success: false,
      issues: [expect.objectContaining({ path: ["tags", 1, "id"] })],
    });
  });

  it("allocates the next six-digit ID and includes reserved IDs", () => {
    expect(allocateNextTagId([
      [{ id: "000001" }],
      [{ id: "000004" }],
    ])).toBe("000005");
  });

  it("assigns IDs to new definitions and replaces temporary post references", () => {
    const definitions = [
      { id: "000001", label: "既存" },
      { id: "new-one", label: "新規" },
    ];
    const result = assignNewTagsToPost(
      definitions,
      { tags: ["new-one"], relatedTags: ["000001", "new-one"] },
      [{ id: "000001", label: "既存" }],
    );

    expect(result.definitions).toEqual([
      { id: "000001", label: "既存" },
      { id: "000002", label: "新規" },
    ]);
    expect(result.post).toEqual({
      tags: ["000002"],
      relatedTags: ["000001", "000002"],
    });
    expect(assignNewTagIds([
      { id: "000001", label: "既存" },
      { id: "", label: "新規" },
    ], [{ id: "000001", label: "既存" }])).toEqual([
      { id: "000001", label: "既存" },
      { id: "000002", label: "新規" },
    ]);
  });
});
