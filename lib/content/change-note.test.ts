import { describe, expect, it } from "vitest";
import { buildContentChangeNote, buildContentInfoHref } from "./change-note";

describe("buildContentChangeNote", () => {
  it("summarizes added and updated item names", () => {
    expect(buildContentChangeNote("ツール", [
      { slug: "existing", displayName: "既存ツール", summary: "旧概要" },
    ], [
      { slug: "existing", displayName: "既存ツール", summary: "新概要" },
      { slug: "new", displayName: "新しいツール", summary: "概要" },
    ])).toBe("新しいツールを追加、既存ツールを更新");
  });

  it("summarizes removed items and falls back when nothing changed", () => {
    expect(buildContentChangeNote("Webアプリ", [
      { slug: "app", displayName: "アプリ", summary: "概要" },
    ], [])).toBe("アプリを削除");
    expect(buildContentChangeNote("ツール", [], [])).toBe("ツール一覧を更新");
  });

  it("links a single tool change to its detail page and multiple changes to the collection", () => {
    const existing = { slug: "tool", displayName: "ツール", summary: "概要" };
    expect(buildContentInfoHref("tools", [existing], [{ ...existing, summary: "変更後" }])).toBe("/tools/tool");
    expect(buildContentInfoHref("tools", [], [existing, { slug: "other", displayName: "別ツール" }])).toBe("/tools");
    expect(buildContentInfoHref("tools", [existing], [])).toBe("/tools");
  });

  it("links a single published app to its app URL and hides draft URLs behind the app list", () => {
    const app = { slug: "game-library", href: "/game-library", status: "published" };
    expect(buildContentInfoHref("apps", [], [app])).toBe("/game-library");
    expect(buildContentInfoHref("apps", [], [{ ...app, status: "draft" }])).toBe("/apps");
    expect(buildContentInfoHref("apps", [], [{ ...app, href: "https://example.com" }])).toBe("/apps");
  });

  it("does not treat JSON property order as a content change", () => {
    expect(buildContentInfoHref("tools", [
      { slug: "tool", displayName: "ツール", summary: "概要" },
    ], [
      { summary: "概要", displayName: "ツール", slug: "tool" },
    ])).toBe("/tools");
  });
});
