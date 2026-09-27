import "server-only";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { bannerListSchema, updateContentSchema } from "./schemas";
import { validateCanonicalJson, type ValidationIssue } from "./canonical-validation";
import type { ContentFileChange } from "../github/tree-changes";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export type BannerWriteResult =
  | { success: true; banners: ReturnType<typeof bannerListSchema.parse>; files: ContentFileChange[] }
  | { success: false; issues: ValidationIssue[] };

function prefixIssues(prefix: string, issues: ValidationIssue[]) {
  return issues.map((issue) => ({ ...issue, path: [prefix, ...issue.path] }));
}

function zodIssues(issues: Array<{ path: PropertyKey[]; message: string }>): ValidationIssue[] {
  return issues.map((issue) => ({
    path: ["banners", ...issue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number")],
    message: issue.message,
  }));
}

function resolveBannerImagePath(image: string): string | null {
  if (!image.startsWith(".")) return null;
  const resolved = path.posix.normalize(path.posix.join("content/home", image));
  return resolved.startsWith("content/") && !resolved.includes("\0") ? resolved : null;
}

export function validateBannerImageReferences(
  banners: ReadonlyArray<{ image: string }>,
  proposedPaths: ReadonlySet<string>,
): ValidationIssue[] {
  return banners.flatMap((banner, index) => {
    const resolved = resolveBannerImagePath(banner.image);
    if (!resolved) {
      return [{ path: ["banners", index, "image"], message: "画像は Content リポジトリ内の相対パスを指定してください。" }];
    }
    if (!proposedPaths.has(resolved)) {
      return [{ path: ["banners", index, "image"], message: `参照画像が proposed tree に存在しません: ${resolved}` }];
    }
    return [];
  });
}

async function optimizeUploads(form: FormData, banners: Array<{ id: string; image: string }>) {
  const files: ContentFileChange[] = [];
  const issues: ValidationIssue[] = [];
  const paths = new Set<string>();
  for (const [index, banner] of banners.entries()) {
    const entry = form.get(`image:${banner.id}`);
    if (!(entry instanceof File) || entry.size === 0) continue;
    if (!allowedImageTypes.has(entry.type) || entry.size > MAX_IMAGE_BYTES) {
      issues.push({ path: ["banners", index, "image"], message: "画像は5MB以下の PNG/JPEG/WebP のみ利用できます。" });
      continue;
    }
    try {
      const source = Buffer.from(await entry.arrayBuffer());
      const metadata = await sharp(source).metadata();
      if (!metadata.width || !metadata.height || metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
        issues.push({ path: ["banners", index, "image"], message: "画像寸法は4096×4096以下にしてください。" });
        continue;
      }
      const optimized = await sharp(source)
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      const safeId = banner.id.replace(/[^a-z0-9-]/g, "-").slice(0, 60) || "banner";
      const digest = createHash("sha256").update(optimized).digest("hex").slice(0, 12);
      const filePath = `content/home/images/${safeId}-${digest}.webp`;
      banner.image = `./images/${safeId}-${digest}.webp`;
      if (!paths.has(filePath)) {
        paths.add(filePath);
        files.push({ path: filePath, content: optimized });
      }
    } catch {
      issues.push({ path: ["banners", index, "image"], message: "画像を読み込めません。PNG/JPEG/WebP ファイルを確認してください。" });
    }
  }
  return { files, issues };
}

export async function prepareBannerWrite(input: {
  form: FormData;
  rawBanners: unknown;
  existingPaths: readonly string[];
  homeSchema: string;
  updateSchema: string;
  updatePath: string;
  updateId: string;
  summary: string;
  publishedAt?: string;
}): Promise<BannerWriteResult> {
  const mutable = Array.isArray(input.rawBanners)
    ? input.rawBanners.map((banner) => typeof banner === "object" && banner !== null ? { ...banner } : banner)
    : input.rawBanners;
  const uploadCandidates = Array.isArray(mutable)
    ? mutable.filter((banner): banner is { id: string; image: string } => (
      typeof banner === "object" && banner !== null
      && typeof (banner as { id?: unknown }).id === "string"
      && typeof (banner as { image?: unknown }).image === "string"
    ))
    : [];
  const uploads = await optimizeUploads(input.form, uploadCandidates);
  if (uploads.issues.length) return { success: false, issues: uploads.issues };

  const parsed = bannerListSchema.safeParse(mutable);
  if (!parsed.success) return { success: false, issues: zodIssues(parsed.error.issues) };

  const canonicalBannerIssues = prefixIssues("banners", validateCanonicalJson(input.homeSchema, parsed.data, "Banners"));
  const proposedPaths = new Set([...input.existingPaths, ...uploads.files.map((file) => file.path)]);
  const imageIssues = validateBannerImageReferences(parsed.data, proposedPaths);
  const update = updateContentSchema.safeParse({
    id: input.updateId,
    publishedAt: input.publishedAt ?? new Date().toISOString(),
    target: "home",
    summary: input.summary,
    href: "/",
    visible: true,
  });
  if (!update.success) {
    return {
      success: false,
      issues: update.error.issues.map((issue) => ({
        path: ["update", ...issue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number")],
        message: issue.message,
      })),
    };
  }
  const updateIssues = prefixIssues("update", validateCanonicalJson(input.updateSchema, update.data));
  const issues = [...canonicalBannerIssues, ...imageIssues, ...updateIssues];
  if (issues.length) return { success: false, issues };

  return {
    success: true,
    banners: parsed.data,
    files: [
      { path: "content/home/banners.json", content: `${JSON.stringify(parsed.data, null, 2)}\n` },
      { path: input.updatePath, content: `${JSON.stringify(update.data, null, 2)}\n` },
      ...uploads.files,
    ],
  };
}
