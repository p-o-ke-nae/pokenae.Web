import { describe, expect, it } from "vitest";
import { matchesContentSearch, parseContentSearch, searchResultLabel } from "./search";

describe("content search", () => {
  it("matches a partial title and requires every selected tag", () => {
    const search = parseContentSearch({
      q: "ピカ",
      tags: ["000001", "000002"],
    });

    expect(matchesContentSearch(
      { title: "ピカチュウ図鑑", tags: ["000001", "000002", "000003"] },
      search,
    )).toBe(true);
    expect(matchesContentSearch(
      { title: "ピカチュウ図鑑", tags: ["000001"] },
      search,
    )).toBe(false);
  });

  it("matches a keyword against the title or summary when a summary is provided", () => {
    const search = parseContentSearch({ q: "セーブデータ" });

    expect(matchesContentSearch(
      { title: "ゲームライブラリ", summary: "セーブデータを管理するWebアプリ", tags: [] },
      search,
    )).toBe(true);
    expect(matchesContentSearch({ title: "ゲームライブラリ", tags: [] }, search)).toBe(false);
    expect(matchesContentSearch(
      { title: "図鑑", summary: "ポケモンの記録", tags: [] },
      search,
    )).toBe(false);
  });

  it("preserves repeated tag parameters and rejects invalid IDs", () => {
    expect(parseContentSearch({ tags: ["000002", "000001"] })).toMatchObject({
      tagIds: ["000002", "000001"],
      invalidTag: false,
    });
    const invalid = parseContentSearch({ tags: ["000001", "bad"] });
    expect(invalid.invalidTag).toBe(true);
    expect(matchesContentSearch({ title: "記事", tags: ["000001"] }, invalid)).toBe(false);
    expect(searchResultLabel(0, invalid.invalidTag)).toBe("タグの指定が不正です。");
  });

  it("normalizes duplicate tags and duplicate query values", () => {
    expect(parseContentSearch({
      q: ["  ピカ  ", "ignored"],
      tags: ["000001", "000001"],
    })).toEqual({
      query: "ピカ",
      tagIds: ["000001"],
      invalidTag: false,
    });
  });
});
