export const PASTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;

export function isSupportedPastedImage(file: File) {
  return PASTED_IMAGE_TYPES.has(file.type);
}

function imageExtension(type: string) {
  return type === "image/jpeg" ? "jpg" : type.slice("image/".length);
}

function randomSuffix(random: number) {
  return Math.floor(random * 0xffffff).toString(36).padStart(5, "0");
}

export function createPastedImageFile(file: File, now = Date.now(), random = Math.random()) {
  const extension = imageExtension(file.type);
  const suffix = randomSuffix(random);
  return new File([file], `pasted-${now.toString(36)}-${suffix}.${extension}`, {
    type: file.type,
    lastModified: now,
  });
}

/**
 * 端末から選択した画像を、保存 API と同じ規則で安全なファイル名に変換する。
 * 既存画像の上書きを避けるため、末尾に短い乱数を付ける。
 */
export function createUploadedImageFile(file: File, now = Date.now(), random = Math.random()) {
  const extension = imageExtension(file.type);
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const safeBase = /[a-zA-Z0-9]/.test(base) ? base : `image-${now.toString(36)}`;
  return new File([file], `${safeBase}-${randomSuffix(random)}.${extension}`, {
    type: file.type,
    lastModified: now,
  });
}

/** 保存 API が WebP に変換して配置する画像の Markdown 上のパス */
export function toPostImagePath(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "image";
  return `./images/${baseName}.webp`;
}

export function createMarkdownImageLink(fileName: string, alt = "画像") {
  return createMarkdownImageLinkFromPath(toPostImagePath(fileName), alt);
}

export function createMarkdownImageLinkFromPath(path: string, alt = "画像") {
  return `![${alt.replace(/[[\]\\]/g, "")}](${path})`;
}

/** 本文で参照している記事画像（./images/...）のパスを出現順に重複なく返す。 */
export function collectMarkdownImagePaths(body: string) {
  const paths = new Set<string>();
  for (const match of body.matchAll(/!\[[^\]]*\]\((\.\/images\/[^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    paths.add(match[1]);
  }
  return [...paths];
}

export type ImageFileValidation = {
  valid: File[];
  message: string;
};

export function validatePostImageFiles(files: readonly File[]): ImageFileValidation {
  const supported = files.filter(isSupportedPastedImage);
  const valid = supported.filter((file) => file.size <= MAX_POST_IMAGE_BYTES);
  const message = supported.length !== files.length
    ? "追加できる画像は PNG/JPEG/WebP のみです。"
    : valid.length !== supported.length
      ? "追加する画像は5MB以下にしてください。"
      : "";
  return { valid, message };
}

export function insertMarkdownAtSelection(
  body: string,
  selectionStart: number,
  selectionEnd: number,
  markdown: string,
) {
  return `${body.slice(0, selectionStart)}${markdown}${body.slice(selectionEnd)}`;
}
