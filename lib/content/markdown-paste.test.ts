import { describe, expect, it } from "vitest";
import { createMarkdownImageLink, createPastedImageFile, insertMarkdownAtSelection, isSupportedPastedImage } from "./markdown-paste";

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
});