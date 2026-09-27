import { describe, expect, it } from "vitest";
import {
  getPostUpdatePublishedAt,
  isPublishedPost,
  normalizePostPublishedAt,
  preparePostForWrite,
  toJapanDateInputValue,
} from "./post-publication";

const basePost = {
  slug: "sample-post",
  title: "記事",
  summary: "概要",
  publishedAt: "2026-09-27",
  status: "published" as const,
  category: "blog",
  tags: [],
  relatedTags: [],
  priority: 0,
  showInPickup: false,
};

describe("post publication dates", () => {
  it("uses the calendar date in Japan for the editor default", () => {
    expect(toJapanDateInputValue(new Date("2026-09-27T14:59:59Z"))).toBe("2026-09-27");
    expect(toJapanDateInputValue(new Date("2026-09-27T15:00:00Z"))).toBe("2026-09-28");
  });

  it("normalizes a valid date to midnight in Japan", () => {
    expect(normalizePostPublishedAt("2026-09-28")).toBe("2026-09-28T00:00:00+09:00");
  });

  it.each(["2026-02-30", "2026/09/28", "not-a-date"])(
    "leaves invalid or unsupported input for schema validation: %s",
    (value) => {
      expect(normalizePostPublishedAt(value)).toBe(value);
    },
  );

  it("removes updatedAt while an existing post is scheduled for the future", () => {
    const result = preparePostForWrite({
      ...basePost,
      publishedAt: "2026-09-28",
      updatedAt: "2026-09-27T00:00:00Z",
    }, true, new Date("2026-09-27T02:00:00Z"));

    expect(result).toMatchObject({
      publishedAt: "2026-09-28T00:00:00+09:00",
    });
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("sets updatedAt to the edit time after publication", () => {
    expect(preparePostForWrite({
      ...basePost,
      publishedAt: "2026-09-27",
    }, true, new Date("2026-09-27T02:00:00Z"))).toMatchObject({
      publishedAt: "2026-09-27T00:00:00+09:00",
      updatedAt: "2026-09-27T02:00:00.000Z",
    });
  });

  it("does not add updatedAt to a newly created post", () => {
    const result = preparePostForWrite({
      ...basePost,
      publishedAt: "2026-09-27",
    }, false, new Date("2026-09-27T02:00:00Z"));

    expect(result).toMatchObject({
      publishedAt: "2026-09-27T00:00:00+09:00",
    });
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("schedules INFO at publication time instead of creating an early link", () => {
    const now = new Date("2026-09-27T02:00:00Z");
    expect(getPostUpdatePublishedAt("2026-09-28T00:00:00+09:00", now))
      .toBe("2026-09-28T00:00:00+09:00");
    expect(getPostUpdatePublishedAt("2026-09-27T00:00:00+09:00", now))
      .toBe("2026-09-27T02:00:00.000Z");
  });

  it("publishes only published-status posts at or after their publication time", () => {
    const publication = "2026-09-28T00:00:00+09:00";
    expect(isPublishedPost({ status: "published", publishedAt: publication }, Date.parse("2026-09-27T14:59:59Z"))).toBe(false);
    expect(isPublishedPost({ status: "published", publishedAt: publication }, Date.parse("2026-09-27T15:00:00Z"))).toBe(true);
    expect(isPublishedPost({ status: "draft", publishedAt: publication }, Date.parse("2026-09-28T00:00:00Z"))).toBe(false);
  });

  it("treats legacy date-only values as midnight in Japan", () => {
    expect(isPublishedPost(
      { status: "published", publishedAt: "2026-09-28" },
      Date.parse("2026-09-27T14:59:59Z"),
    )).toBe(false);
    expect(isPublishedPost(
      { status: "published", publishedAt: "2026-09-28" },
      Date.parse("2026-09-27T15:00:00Z"),
    )).toBe(true);
  });
});
