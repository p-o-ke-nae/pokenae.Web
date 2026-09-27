export const PASTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function isSupportedPastedImage(file: File) {
  return PASTED_IMAGE_TYPES.has(file.type);
}

export function createPastedImageFile(file: File, now = Date.now(), random = Math.random()) {
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice("image/".length);
  const suffix = Math.floor(random * 0xffffff).toString(36).padStart(5, "0");
  return new File([file], `pasted-${now.toString(36)}-${suffix}.${extension}`, {
    type: file.type,
    lastModified: now,
  });
}

export function createMarkdownImageLink(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `![画像](./images/${baseName}.webp)`;
}

export function insertMarkdownAtSelection(
  body: string,
  selectionStart: number,
  selectionEnd: number,
  markdown: string,
) {
  return `${body.slice(0, selectionStart)}${markdown}${body.slice(selectionEnd)}`;
}