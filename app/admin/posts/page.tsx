import Link from "next/link";
import CustomHeader from "@/components/atoms/CustomHeader";
import AdminContentNavigation from "@/components/molecules/AdminContentNavigation";
import ResponsiveActionGroup from "@/components/molecules/ResponsiveActionGroup";
import PostList from "@/components/organisms/PostList";
import { getFreshContentSnapshotWithRevision } from "@/lib/content/repository";
import { getOpenContentPullRequests } from "@/lib/github/content-writer";

export default async function AdminPostsPage() {
  const [{ revision, content }, pullRequests] = await Promise.all([getFreshContentSnapshotWithRevision(), getOpenContentPullRequests()]);
  return <main className="page-container stack">
    <AdminContentNavigation current="/admin/posts" />
    <header className="page-header"><CustomHeader>記事管理</CustomHeader><p className="page-lead">ブログ記事を編集します。変更はPull Requestとして保存されます。</p><ResponsiveActionGroup>
      <Link className="button-link" href="/admin/posts/new">新規記事</Link>
    </ResponsiveActionGroup></header>
    <PostList posts={content.posts} baseRevision={revision} />
    <section className="stack"><CustomHeader level={2}>レビュー待ちPR</CustomHeader>{pullRequests.length ? pullRequests.map((pr) => {
      const isPostPullRequest = /^content\/[a-z0-9]+(?:-[a-z0-9]+)*-\d{14}$/.test(pr.head.ref);
      return <article key={pr.number} className="notice"><strong>#{pr.number} {pr.title}{pr.draft ? " (Draft)" : ""}</strong><p><a href={pr.html_url} target="_blank" rel="noreferrer">GitHubで確認</a>{isPostPullRequest ? <> <Link href={`/admin/posts/pull-requests/${pr.number}`}>管理画面で修正</Link></> : null}</p></article>;
    }) : <p className="empty-state">レビュー待ちPRはありません。</p>}</section>
  </main>;
}
