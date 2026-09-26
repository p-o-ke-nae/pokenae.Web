import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import ContentCardVertical from "@/components/molecules/ContentCardVertical";
import ContentSearchForm from "@/components/molecules/ContentSearchForm";
import { getContentSnapshot, getPublishedPosts } from "@/lib/content/repository";
import { matchesContentSearch, parseContentSearch, type ContentSearchParams } from "@/lib/content/search";

export const metadata: Metadata = { title: "ブログ", description: "pokenae のお知らせ、技術記事、ショーケース。" };

export default async function BlogPage({ searchParams }: { searchParams: Promise<ContentSearchParams> }) {
  const search = parseContentSearch(await searchParams);
  const [publishedPosts, { tagDefinitions }] = await Promise.all([getPublishedPosts(), getContentSnapshot()]);
  const posts = publishedPosts.filter((post) => matchesContentSearch(post, search));
  return <main className="page-container"><header className="page-header"><CustomHeader>ブログ</CustomHeader><p className="page-lead">開発記録、お知らせ、ショーケースを掲載しています。</p></header>
    <ContentSearchForm key={`${search.query}:${search.tagIds.join(",")}:${search.invalidTag}`} action="/blog" tags={tagDefinitions} search={search} resultCount={posts.length} />
    {posts.length ? <div className="card-grid">{posts.map((post) => <ContentCardVertical key={post.slug} id={post.slug} title={post.title} publishedAt={post.publishedAt} imageSrc={post.thumbnail ?? "/mock/card1.svg"} imageAlt="" href={`/blog/${post.slug}`} tag={post.category} />)}</div> : <p className="empty-state">条件に一致する記事はありません。</p>}
  </main>;
}
