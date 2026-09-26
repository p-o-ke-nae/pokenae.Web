import type { MetadataRoute } from "next";
import { getContentSnapshot, getPublishedPosts } from "@/lib/content/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pokenae.com";
  const [posts, snapshot] = await Promise.all([getPublishedPosts(), getContentSnapshot()]);
  const paths = ["", "/tools", "/apps", "/blog", "/contact", "/game-library"];
  return [
    ...paths.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const })),
    ...posts.map((post) => ({ url: `${base}/blog/${post.slug}`, lastModified: post.updatedAt ?? post.publishedAt })),
    ...snapshot.tools.map((tool) => ({ url: `${base}/tools/${tool.slug}`, changeFrequency: "daily" as const })),
  ];
}
