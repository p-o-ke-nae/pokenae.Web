import { describe, expect, it } from "vitest";
import { appContentSchema, bannerListSchema, gitCommitShaSchema, postFrontmatterSchema, releaseManifestSchema, tagIdSchema, updateContentSchema } from "./schemas";

describe("content schemas", () => {
  it("accepts a safe published post", () => {
    expect(postFrontmatterSchema.parse({
      slug: "sample-post", title: "記事", summary: "概要", publishedAt: "2026-09-26",
      status: "published", category: "blog", tags: [], relatedTags: [], priority: 1, showInPickup: false,
    }).slug).toBe("sample-post");
  });

  it("accepts null optional URLs from content frontmatter", () => {
    expect(postFrontmatterSchema.parse({
      slug: "sample-post", title: "記事", summary: "概要", publishedAt: "2026-09-26",
      status: "published", category: "blog", tags: [], relatedTags: [], priority: 1,
      thumbnail: null, legacyUrl: null, showInPickup: false,
    })).toMatchObject({ thumbnail: undefined, legacyUrl: undefined });
  });

  it("rejects unknown showcase components and malformed release hashes", () => {
    expect(() => postFrontmatterSchema.parse({
      slug: "sample", title: "記事", summary: "概要", publishedAt: "2026-09-26",
      status: "published", category: "showcase", tags: [], relatedTags: [], priority: 1, showInPickup: false, embed: "ArbitraryCode",
    })).toThrow();
    expect(() => releaseManifestSchema.parse({
      version: "1.2.3", tag: "v1.2.3", product: "Tool", architecture: "x64",
      minimumWindowsVersion: "10", installer: "tool.msi", sha256: "bad",
      publishedAt: "2026-09-26", releaseUrl: "https://github.com/example/repo/releases/tag/v1.2.3",
    })).toThrow();
  });

  it("normalizes a 40-character hexadecimal commit SHA", () => {
    expect(gitCommitShaSchema.parse("ABCDEF0123456789ABCDEF0123456789ABCDEF01"))
      .toBe("abcdef0123456789abcdef0123456789abcdef01");
  });

  it("accepts canonical update fields and rejects dates, targets, and extra properties outside the contract", () => {
    const base = { id: "update", target: "navigation" as const, summary: "更新", href: "/", visible: true };
    expect(updateContentSchema.parse({ ...base, publishedAt: "2026-09-26T12:00:00Z" }).publishedAt)
      .toBe("2026-09-26T12:00:00Z");
    expect(updateContentSchema.parse({ ...base, publishedAt: "2026-09-26T12:00:00Z", target: "app" }).target)
      .toBe("app");
    expect(() => updateContentSchema.parse({ ...base, publishedAt: "2026-09-26" })).toThrow();
    expect(() => updateContentSchema.parse({ ...base, publishedAt: "2026/09/26" })).toThrow();
    expect(() => updateContentSchema.parse({ ...base, publishedAt: "2026-09-26T12:00:00Z", extra: true })).toThrow();
    expect(() => updateContentSchema.parse({ ...base, publishedAt: "2026-09-26T12:00:00Z", target: "site" })).toThrow();
  });

  it("requires canonical banner dates and rejects duplicates or reversed date ranges", () => {
    const banner = {
      id: "banner",
      image: "./images/banner.webp",
      alt: "バナー",
      href: "/",
      order: 0,
      startsAt: "2026-09-26T00:00:00Z",
      endsAt: null,
    };
    expect(bannerListSchema.parse([banner])).toEqual([banner]);
    expect(() => bannerListSchema.parse([{ ...banner, startsAt: undefined }])).toThrow();
    expect(() => bannerListSchema.parse([banner, banner])).toThrow();
    expect(() => bannerListSchema.parse([{ ...banner, endsAt: "2026-09-25T00:00:00Z" }])).toThrow();
  });

  it.each([
    "",
    "not-a-commit",
    "abcdef0123456789abcdef0123456789abcdef0g",
    "abcdef0123456789abcdef0123456789abcdef01 ",
  ])("rejects invalid commit SHA %j", (revision) => {
    expect(gitCommitShaSchema.safeParse(revision).success).toBe(false);
  });

  it("accepts only tag IDs from 000001 through 999999", () => {
    expect(tagIdSchema.parse("000001")).toBe("000001");
    expect(tagIdSchema.parse("999999")).toBe("999999");
    for (const value of ["000000", "0001", "1000000", "tag001"]) {
      expect(tagIdSchema.safeParse(value).success).toBe(false);
    }
  });

  it("accepts the canonical Content app contract and rejects legacy fields", () => {
    const app = {
      slug: "game-library",
      displayName: "ゲームライブラリ",
      summary: "ゲームを管理します。",
      metaLabel: "Google アカウント対応",
      image: "/mock/thumb3.svg",
      imageAlt: "",
      href: "/game-library",
      status: "published",
      order: 1,
      tags: ["000001"],
    };

    expect(appContentSchema.parse(app)).toEqual(app);
    expect(appContentSchema.safeParse({ ...app, showInPickup: false }).success).toBe(false);
  });
});
