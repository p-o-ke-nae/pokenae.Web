import { describe, expect, it } from "vitest";
import {
  collectMarkdownImagePaths,
  createMarkdownImageLink,
  createMarkdownImageLinkFromPath,
  createPastedImageFile,
  createUploadedImageFile,
  insertMarkdownAtSelection,
  isSupportedPastedImage,
  MAX_POST_IMAGE_BYTES,
  toPostImagePath,
  validatePostImageFiles,
} from "./markdown-paste";

describe("markdown paste helpers", () => {
  it("creates a pasted image filename and markdown link", () => {
    const source = new File(["image"], "clipboard.png", { type: "image/png" });
    const pasted = createPastedImageFile(source, 1000, 0.5);

    expect(pasted.name).toMatch(/^pasted-rs-[a-z0-9]{5}\.png$/);
    expect(createMarkdownImageLink(pasted.name)).toMatch(/^!\[画像\]\(\.\/images\/pasted-rs-[a-z0-9]{5}\.webp\)$/);
  });

  it("accepts only the image types supported by the posts API", () => {
    expect(isSupportedPastedImage(new File([], "image.png", { type: "image/png" }))).toBe(true);
    expect(isSupportedPastedImage(new File([], "image.gif", { type: "image/gif" }))).toBe(false);
  });

  it("inserts markdown at the selected range", () => {
    expect(insertMarkdownAtSelection("before after", 7, 12, "![画像](./images/image.webp)"))
      .toBe("before ![画像](./images/image.webp)");
  });

  it("creates safe unique names for uploaded images that match the saved path", () => {
    const uploaded = createUploadedImageFile(new File(["image"], "My Screen Shot.jpeg", { type: "image/jpeg" }), 1000, 0.5);
    expect(uploaded.name).toMatch(/^My-Screen-Shot-[a-z0-9]{5}\.jpg$/);
    expect(toPostImagePath(uploaded.name)).toBe(`./images/${uploaded.name.replace(/\.jpg$/, "")}.webp`);

    const japanese = createUploadedImageFile(new File(["image"], "スクリーンショット.png", { type: "image/png" }), 1000, 0.5);
    expect(japanese.name).toMatch(/^image-rs-[a-z0-9]{5}\.png$/);
  });

  it("collects referenced post images without duplicates", () => {
    const body = [
      "![A](./images/a.webp)",
      "![B](./images/b.webp \"title\")",
      "![A again](./images/a.webp)",
      "![external](https://example.com/c.png)",
    ].join("\n");
    expect(collectMarkdownImagePaths(body)).toEqual(["./images/a.webp", "./images/b.webp"]);
  });

  it("creates markdown links from paths with safe alt text", () => {
    expect(createMarkdownImageLinkFromPath("./images/a.webp", "図[1]")).toBe("![図1](./images/a.webp)");
  });

  it("validates image type and size", () => {
    const png = new File(["x"], "a.png", { type: "image/png" });
    const gif = new File(["x"], "a.gif", { type: "image/gif" });
    const large = new File([new Uint8Array(MAX_POST_IMAGE_BYTES + 1)], "b.png", { type: "image/png" });
    expect(validatePostImageFiles([png])).toEqual({ valid: [png], message: "" });
    expect(validatePostImageFiles([png, gif]).message).toContain("PNG/JPEG/WebP");
    expect(validatePostImageFiles([png, large])).toEqual({ valid: [png], message: "追加する画像は5MB以下にしてください。" });
  });
});
