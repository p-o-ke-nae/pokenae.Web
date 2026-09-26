import { z } from "zod";

const optionalUrl = z.string().url().or(z.string().startsWith("/")).or(z.string().startsWith(".")).optional();
const nullableDate = z.string().nullable().optional();

export const postFrontmatterSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  publishedAt: z.string().datetime({ offset: true }).or(z.string().date()),
  updatedAt: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  status: z.enum(["draft", "published"]),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  relatedTags: z.array(z.string()).default([]),
  priority: z.number().int().min(0).default(0),
  thumbnail: optionalUrl,
  legacyUrl: optionalUrl,
  changeNote: z.string().optional(),
  showInPickup: z.boolean().default(false),
  embed: z.object({ component: z.literal("CollectionDex"), data: z.string().startsWith("./") }).optional(),
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
  showInPickup: z.boolean().optional(),
  priority: z.number().int().optional(),
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
  showInPickup: value.showInPickup,
  priority: value.priority,
}));

export const bannerContentSchema = z.object({
  id: z.string().min(1),
  image: z.string().url().or(z.string().startsWith("/")).or(z.string().startsWith(".")),
  alt: z.string().min(1),
  href: optionalUrl,
  order: z.number().int(),
  startsAt: nullableDate,
  endsAt: nullableDate,
});
export const bannerSchema = bannerContentSchema.transform((value) => ({
  ...value,
  startsAt: value.startsAt ?? undefined,
  endsAt: value.endsAt ?? undefined,
}));

export const announcementContentSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  href: optionalUrl,
  variant: z.enum(["normal", "highlight", "urgent"]).default("normal"),
  startsAt: nullableDate,
  endsAt: nullableDate,
});
export const announcementSchema = announcementContentSchema.transform((value) => ({
  ...value,
  startsAt: value.startsAt ?? undefined,
  endsAt: value.endsAt ?? undefined,
  severity: value.variant,
}));

export const updateContentSchema = z.object({
  id: z.string().min(1),
  publishedAt: z.string(),
  target: z.enum(["post", "tool", "home", "site"]),
  summary: z.string().min(1),
  href: optionalUrl,
  skipInfo: z.boolean().optional(),
  visible: z.boolean().optional(),
});
export const updateSchema = updateContentSchema.transform((value) => ({ ...value, skipInfo: value.skipInfo ?? value.visible === false }));

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
