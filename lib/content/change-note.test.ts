import { describe, expect, it } from "vitest";
import { buildContentChangeNote } from "./change-note";

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
});
