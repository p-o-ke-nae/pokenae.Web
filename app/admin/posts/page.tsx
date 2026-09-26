import Link from "next/link";
import CustomHeader from "@/components/atoms/CustomHeader";
import { getContentSnapshot } from "@/lib/content/repository";
import { getOpenContentPullRequests } from "@/lib/github/content-writer";

export default async function AdminPostsPage() {
  const [{ posts }, pullRequests] = await Promise.all([getContentSnapshot(), getOpenContentPullRequests()]);
  return <main className="page-container"><header className="page-header"><CustomHeader>記事管理</CustomHeader><p><Link className="button-link" href="/admin/posts/new">新規記事</Link> <Link className="button-link button-link--secondary" href="/admin/posts/home">バナー・ニュース・ツール設定</Link></p></header>
    <div className="stack">{posts.map((post) => <article key={post.slug} className="notice"><strong>{post.title}</strong><p>{post.status} / {post.publishedAt}</p><Link href={`/admin/posts/${post.slug}`}>編集してPRを作成</Link></article>)}</div>
    <section className="stack"><CustomHeader level={2}>レビュー待ちPR</CustomHeader>{pullRequests.length ? pullRequests.map((pr) => <a key={pr.number} className="notice" href={pr.html_url} target="_blank" rel="noreferrer">#{pr.number} {pr.title}{pr.draft ? " (Draft)" : ""}</a>) : <p className="empty-state">レビュー待ちPRはありません。</p>}</section>
  </main>;
}
