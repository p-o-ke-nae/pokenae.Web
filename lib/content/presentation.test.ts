import { describe, expect, it } from "vitest";
import { contentFixture } from "./fixtures";
import {
  formatContentDate,
  groupContentUpdatesByDate,
  selectInfoUpdates,
  selectPickupItems,
  selectRelatedItems,
  shouldShowUpdatedDate,
  shouldShowPublicSidebar,
  toPublicContentItems,
} from "./presentation";

describe("content presentation", () => {
  it.each([
    ["2026-09-26", "2026-09-26"],
    ["2026-09-26T23:59:59Z", "2026-09-26"],
    ["2026-09-26T00:15:00+09:00", "2026-09-26"],
  ])("formats %s without timezone date shifting", (input, expected) => {
    expect(formatContentDate(input)).toBe(expected);
  });

  it.each(["", "2026/09/26", "2026-02-30", "not-a-date"])(
    "rejects invalid content date %j",
    (input) => {
      expect(() => formatContentDate(input)).toThrow(TypeError);
    },
  );

  it.each([
    ["2026-09-26", undefined, false],
    ["2026-09-26", "2026-09-25T23:59:59Z", false],
    ["2026-09-26", "2026-09-26T12:00:00Z", true],
    ["2026-09-26", "2026-09-27", true],
    ["2026-09-26", "not-a-date", false],
  ])("shows an update date only after publication: %s / %s", (publishedAt, updatedAt, expected) => {
    expect(shouldShowUpdatedDate(publishedAt, updatedAt)).toBe(expected);
  });

  it("groups updates by their displayed date while preserving input order", () => {
    const updates = [
      { id: "latest", publishedAt: "2026-09-26T23:30:00Z", target: "navigation" as const, summary: "最新" },
      { id: "same-date", publishedAt: "2026-09-26T08:00:00+09:00", target: "home" as const, summary: "同日" },
      { id: "previous", publishedAt: "2026-09-25", target: "tool" as const, summary: "前日" },
    ];

    expect(groupContentUpdatesByDate(updates)).toEqual([
      { date: "2026-09-26", updates: [updates[0], updates[1]] },
      { date: "2026-09-25", updates: [updates[2]] },
    ]);
  });

  it("selects visible post, tool, and app updates for INFO in reverse chronological order", () => {
    const updates = [
      { id: "banner", publishedAt: "2026-09-26T12:00:00Z", target: "home" as const, summary: "バナーを更新" },
      { id: "blog", publishedAt: "2026-09-25T12:00:00Z", target: "post" as const, summary: "ブログを追加" },
      { id: "navigation", publishedAt: "2026-09-27T12:00:00Z", target: "navigation" as const, summary: "ナビゲーションを更新" },
      { id: "tool", publishedAt: "2026-09-26T18:00:00Z", target: "tool" as const, summary: "Webアプリを更新" },
      { id: "app", publishedAt: "2026-09-27T18:00:00Z", target: "app" as const, summary: "アプリを更新" },
      { id: "hidden-post", publishedAt: "2026-09-28T12:00:00Z", target: "post" as const, summary: "非表示ブログ", skipInfo: true },
      { id: "hidden-app", publishedAt: "2026-09-29T12:00:00Z", target: "app" as const, summary: "非表示アプリ", skipInfo: true },
    ];

    expect(selectInfoUpdates(updates, Date.parse("2026-09-30T00:00:00Z")).map((item) => item.id)).toEqual(["app", "tool", "blog"]);
  });

  it("keeps scheduled post updates hidden until their publication time", () => {
    const updates = [{
      id: "scheduled-post",
      publishedAt: "2026-09-28T00:00:00+09:00",
      target: "post" as const,
      summary: "予約記事",
    }];

    expect(selectInfoUpdates(updates, Date.parse("2026-09-27T14:59:59Z"))).toEqual([]);
    expect(selectInfoUpdates(updates, Date.parse("2026-09-27T15:00:00Z"))).toEqual(updates);
  });

  it("orders pickup items by priority and applies the requested limit", () => {
    const items = toPublicContentItems(contentFixture);
    expect(selectPickupItems(items, 2).map((item) => item.id)).toEqual([
      "post:site-renewal",
      "tool:blink-observer-tool",
    ]);
    expect(selectPickupItems(items)).toHaveLength(4);
  });

  it("excludes scheduled posts from public content until publication", () => {
    const scheduledPost = {
      ...contentFixture.posts[0],
      slug: "scheduled",
      publishedAt: "2026-09-28T00:00:00+09:00",
      status: "published" as const,
    };
    const snapshot = { ...contentFixture, posts: [scheduledPost] };

    expect(toPublicContentItems(snapshot, Date.parse("2026-09-27T14:59:59Z"))).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ id: "post:scheduled" })]),
    );
    expect(toPublicContentItems(snapshot, Date.parse("2026-09-27T15:00:00Z"))).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "post:scheduled" })]),
    );
  });

  it("prioritizes matching tags, excludes the current item, and fills with recent items", () => {
    const items = toPublicContentItems(contentFixture);
    const related = selectRelatedItems(items, "/blog/collection-dex", 3);
    expect(related).toHaveLength(3);
    expect(related.map((item) => item.href)).not.toContain("/blog/collection-dex");
    expect(related[0]?.href).toBe("/game-library");
  });

  it("shows the sidebar only on selected public routes", () => {
    expect(shouldShowPublicSidebar("/")).toBe(false);
    expect(shouldShowPublicSidebar("/blog")).toBe(true);
    expect(shouldShowPublicSidebar("/blog/site-renewal/")).toBe(true);
    expect(shouldShowPublicSidebar("/contact")).toBe(true);
    expect(shouldShowPublicSidebar("/admin/posts")).toBe(false);
    expect(shouldShowPublicSidebar("/game-library")).toBe(false);
  });
});
