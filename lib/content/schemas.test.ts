import { describe, expect, it } from "vitest";
import { postFrontmatterSchema, releaseManifestSchema } from "./schemas";

describe("content schemas", () => {
  it("accepts a safe published post", () => {
    expect(postFrontmatterSchema.parse({
      slug: "sample-post", title: "記事", summary: "概要", publishedAt: "2026-09-26",
      status: "published", category: "blog", tags: [], relatedTags: [], priority: 1, showInPickup: false,
    }).slug).toBe("sample-post");
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
});
