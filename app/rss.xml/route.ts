import { getPublishedPosts } from "@/lib/content/repository";

function xml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pokenae.com";
  const posts = await getPublishedPosts();
  const items = posts.map((post) => `<item><title>${xml(post.title)}</title><link>${base}/blog/${post.slug}</link><guid>${base}/blog/${post.slug}</guid><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate><description>${xml(post.summary)}</description></item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>pokenae</title><link>${base}</link><description>pokenae updates</description>${items}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
