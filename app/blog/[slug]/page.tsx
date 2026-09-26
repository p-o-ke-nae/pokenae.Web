import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomHeader from "@/components/atoms/CustomHeader";
import SafeMarkdown from "@/components/organisms/SafeMarkdown";
import { getCollectionDexRecords, getPublishedPost, getPublishedPosts } from "@/lib/content/repository";

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
  const records = post.embed?.component === "CollectionDex" ? await getCollectionDexRecords(post) : [];
  return <main className="page-container"><article>
    <header className="page-header"><CustomHeader>{post.title}</CustomHeader><p className="page-lead">{post.summary}</p><p><span className="pill">{post.category}</span> <time dateTime={post.publishedAt}>{post.publishedAt}</time></p></header>
    <SafeMarkdown source={post.body} allowedEmbed={post.category === "showcase" ? post.embed?.component : undefined} collectionRecords={records} />
  </article></main>;
}
