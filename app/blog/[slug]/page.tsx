import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomHeader from "@/components/atoms/CustomHeader";
import SafeMarkdown from "@/components/organisms/SafeMarkdown";
import ContentTagLinks from "@/components/molecules/ContentTagLinks";
import { getCollectionDexRecords, getContentSnapshot, getPublishedPost, getPublishedPosts } from "@/lib/content/repository";
import { formatContentDate, shouldShowUpdatedDate } from "@/lib/content/presentation";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPublishedPosts()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  return post ? { title: post.title, description: post.summary } : {};
}

export default async function BlogDetailPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const [records, { tagDefinitions }] = await Promise.all([
    post.embed?.component === "CollectionDex" ? getCollectionDexRecords(post) : [],
    getContentSnapshot(),
  ]);
  return <main className="page-container"><article>
    <header className="page-header"><CustomHeader>{post.title}</CustomHeader><p className="page-lead">{post.summary}</p><p><span className="pill">{post.category}</span>{" "}公開日: <time dateTime={post.publishedAt}>{formatContentDate(post.publishedAt)}</time>{shouldShowUpdatedDate(post.publishedAt, post.updatedAt) && <>{" / "}更新日: <time dateTime={post.updatedAt}>{formatContentDate(post.updatedAt)}</time></>}</p></header>
    <SafeMarkdown source={post.body} allowedEmbed={post.category === "showcase" ? post.embed?.component : undefined} collectionRecords={records} />
    <ContentTagLinks tagIds={post.tags} tagDefinitions={tagDefinitions} listPath="/blog" />
  </article></main>;
}
