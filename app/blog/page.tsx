import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import ContentCardVertical from "@/components/molecules/ContentCardVertical";
import { getPublishedPosts } from "@/lib/content/repository";

export const metadata: Metadata = { title: "ブログ", description: "pokenae のお知らせ、技術記事、ショーケース。" };

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ tag?: string; category?: string }> }) {
  const query = await searchParams;
  const posts = (await getPublishedPosts()).filter((post) => (!query.tag || post.tags.includes(query.tag)) && (!query.category || post.category === query.category));
  return <main className="page-container"><header className="page-header"><CustomHeader>ブログ</CustomHeader><p className="page-lead">開発記録、お知らせ、ショーケースを掲載しています。</p></header>
    {posts.length ? <div className="card-grid">{posts.map((post) => <ContentCardVertical key={post.slug} id={post.slug} title={post.title} date={post.publishedAt} imageSrc={post.thumbnail ?? "/mock/card1.svg"} imageAlt="" href={`/blog/${post.slug}`} tag={post.category} />)}</div> : <p className="empty-state">条件に一致する記事はありません。</p>}
  </main>;
}
