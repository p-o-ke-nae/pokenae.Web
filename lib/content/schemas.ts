import { z } from "zod";

const optionalUrl = z.string().url().or(z.string().startsWith("/")).or(z.string().startsWith(".")).optional();
const nullableOptionalUrl = z.string().url().or(z.string().startsWith("/")).or(z.string().startsWith(".")).nullable()
  .transform((value) => value ?? undefined).optional();
const contentDate = z.string().datetime({ offset: true }).or(z.string().date());
const contentDateTime = z.string().datetime({ offset: true });
export const gitCommitShaSchema = z.string().regex(/^[0-9a-fA-F]{40}$/).transform((revision) => revision.toLowerCase());
export const tagIdSchema = z.string().regex(/^(?!000000)\d{6}$/, "tag ID は000001〜999999の6桁数字で指定してください。");
export const tagDefinitionSchema = z.object({
  id: tagIdSchema,
  label: z.string().trim().min(1).max(80),
}).strict();
export const tagDefinitionListSchema = z.array(tagDefinitionSchema).superRefine((tags, context) => {
  const ids = new Set<string>();
  tags.forEach((tag, index) => {
    if (ids.has(tag.id)) {
      context.addIssue({ code: "custom", path: [index, "id"], message: "tag ID は重複できません。" });
    }
    ids.add(tag.id);
  });
});

export const postFrontmatterSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  publishedAt: contentDate,
  updatedAt: contentDate.optional(),
  status: z.enum(["draft", "published"]),
  category: z.string().min(1),
  tags: z.array(tagIdSchema).default([]),
  relatedTags: z.array(tagIdSchema).default([]),
  priority: z.number().int().min(0).default(0),
  thumbnail: nullableOptionalUrl,
  legacyUrl: nullableOptionalUrl,
  changeNote: z.string().optional(),
  showInPickup: z.boolean().default(false),
  embed: z.object({ component: z.literal("CollectionDex"), data: z.string().startsWith("./") }).optional(),
});

export const postWriteRequestSchema = z.object({
  baseRevision: gitCommitShaSchema,
  post: postFrontmatterSchema,
  body: z.string().trim().min(1),
});

export type PostWriteRequest = z.infer<typeof postWriteRequestSchema>;

export const postUnpublishRequestSchema = z.object({
  baseRevision: gitCommitShaSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const toolContentSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayName: z.string().min(1),
  summary: z.string().min(1),
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  kind: z.enum(["windows-app", "library"]),
  image: optionalUrl,
  supportedOs: z.array(z.string()).optional(),
  docs: z.object({ readme: z.string().optional(), paths: z.array(z.string()).optional() }).optional(),
  release: z.object({ channel: z.string().optional(), manifestRequired: z.boolean().optional(), unsignedInstaller: z.boolean().optional(), package: z.string().optional() }).optional(),
  tags: z.array(tagIdSchema).default([]),
  showInPickup: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export const toolListSchema = z.array(toolContentSchema).superRefine((tools, context) => {
  const slugs = new Set<string>();
  tools.forEach((tool, index) => {
    if (slugs.has(tool.slug)) {
      context.addIssue({ code: "custom", path: [index, "slug"], message: "slug は重複できません。" });
    }
    slugs.add(tool.slug);
  });
});

export const toolSchema = toolContentSchema.transform((value) => ({
  slug: value.slug,
  name: value.displayName,
  summary: value.summary,
  repository: value.repository,
  kind: value.kind,
  image: value.image,
  supportedOs: value.supportedOs,
  packageUrl: value.release?.package ? `https://github.com/${value.repository}/packages` : undefined,
  docsPath: value.docs?.readme,
  releaseChannel: value.release?.channel,
  tags: value.tags,
  showInPickup: value.showInPickup,
  priority: value.priority,
}));

export const appContentSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayName: z.string().min(1),
  summary: z.string().min(1),
  href: z.string().startsWith("/"),
  image: nullableOptionalUrl,
  imageAlt: z.string(),
  metaLabel: z.string().min(1),
  status: z.enum(["draft", "published", "archived"]),
  order: z.number().int().min(0),
  tags: z.array(tagIdSchema).default([]),
}).strict();

export const appSchema = appContentSchema.transform((value) => ({
  slug: value.slug,
  name: value.displayName,
  summary: value.summary,
  href: value.href,
  image: value.image,
  imageAlt: value.imageAlt,
  metaLabel: value.metaLabel,
  status: value.status,
  order: value.order,
  tags: value.tags,
}));

export const bannerContentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  image: z.string().min(1),
  alt: z.string().min(1),
  href: z.string(),
  order: z.number().int().min(0),
  startsAt: contentDateTime,
  endsAt: contentDateTime.nullable(),
}).strict();
export const bannerListSchema = z.array(bannerContentSchema).superRefine((banners, context) => {
  const ids = new Set<string>();
  banners.forEach((banner, index) => {
    if (ids.has(banner.id)) {
      context.addIssue({ code: "custom", path: [index, "id"], message: "id は重複できません。" });
    }
    ids.add(banner.id);
    if (banner.endsAt && Date.parse(banner.endsAt) < Date.parse(banner.startsAt)) {
      context.addIssue({ code: "custom", path: [index, "endsAt"], message: "終了日時は開始日時以降にしてください。" });
    }
  });
});
export const bannerSchema = bannerContentSchema.transform((value) => ({
  ...value,
  endsAt: value.endsAt ?? undefined,
}));

export const announcementContentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  text: z.string().min(1),
  href: z.string(),
  variant: z.enum(["normal", "emphasis", "urgent"]),
  startsAt: contentDateTime,
  endsAt: contentDateTime.nullable(),
}).strict();
export const announcementSchema = announcementContentSchema.transform((value) => ({
  ...value,
  endsAt: value.endsAt ?? undefined,
  severity: value.variant,
}));

export const updateContentSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publishedAt: contentDateTime,
  target: z.enum(["post", "tool", "app", "home", "navigation"]),
  summary: z.string().min(1).max(200),
  href: z.string(),
  visible: z.boolean(),
}).strict();
export const updateSchema = updateContentSchema.transform((value) => ({ ...value, skipInfo: !value.visible }));

export const releaseManifestSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  tag: z.string().min(1),
  product: z.string().min(1),
  architecture: z.enum(["x64", "arm64", "x86"]),
  minimumWindowsVersion: z.string().min(1),
  installer: z.string().regex(/\.msi$/i),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  publishedAt: z.string(),
  releaseUrl: z.string().url(),
});

export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;
