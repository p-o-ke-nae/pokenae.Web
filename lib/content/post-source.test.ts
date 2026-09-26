import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import {
  normalizePostImageReference,
  normalizePostImageReferences,
  PostImageReferenceError,
  serializePostSource,
} from "./post-source";

const post = {
  slug: "sample-post",
  title: "Sample",
  summary: "Summary",
  publishedAt: "2026-09-27",
  status: "draft" as const,
  category: "blog",
  tags: [],
  relatedTags: [],
  priority: 0,
  showInPickup: false,
};
const revision = "0123456789abcdef0123456789abcdef01234567";
const rawImage = `https://raw.githubusercontent.com/p-o-ke-nae/pokenae.Content/${revision}/content/posts/sample-post/images/pasted-image.webp`;

describe("post source image normalization", () => {
  it("normalizes raw URLs for the same Content post in thumbnail and Markdown", () => {
    expect(normalizePostImageReferences(
      { ...post, thumbnail: rawImage },
      `before\n\n![image](${rawImage})\n`,
    )).toEqual({
      post: { ...post, thumbnail: "./images/pasted-image.webp" },
      body: "before\n\n![image](./images/pasted-image.webp)\n",
    });
  });

  it("preserves canonical relative references and Markdown titles", () => {
    expect(normalizePostImageReferences(
      { ...post, thumbnail: "./images/thumbnail.webp" },
      '![image](<./images/pasted-image.webp> "title")',
    )).toMatchObject({
      post: { thumbnail: "./images/thumbnail.webp" },
      body: '![image](<./images/pasted-image.webp> "title")',
    });
  });

  it.each([
    "https://example.com/image.webp",
    `https://raw.githubusercontent.com/p-o-ke-nae/other/${revision}/content/posts/sample-post/images/image.webp`,
    `https://raw.githubusercontent.com/p-o-ke-nae/pokenae.Content/${revision}/content/posts/other-post/images/image.webp`,
    "./images/../secret.webp",
    "./images/",
    "./other/image.webp",
  ])("rejects a non-canonical image reference: %s", (reference) => {
    expect(() => normalizePostImageReference(reference, post.slug)).toThrow(PostImageReferenceError);
  });

  it("omits unset legacyUrl and normalizes old draft image URLs when serializing", () => {
    const source = serializePostSource(
      { ...post, legacyUrl: undefined, thumbnail: rawImage },
      `![image](${rawImage})`,
    );
    const parsed = matter(source);

    expect(parsed.data).not.toHaveProperty("legacyUrl");
    expect(parsed.data.thumbnail).toBe("./images/pasted-image.webp");
    expect(parsed.content.trim()).toBe("![image](./images/pasted-image.webp)");
  });

  it("omits an empty ChangeNote from frontmatter", () => {
    const source = serializePostSource({ ...post, changeNote: "" }, "body");
    expect(matter(source).data).not.toHaveProperty("changeNote");
  });
});
