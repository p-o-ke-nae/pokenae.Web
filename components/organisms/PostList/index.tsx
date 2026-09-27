'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import DataTable, { type DataTableColumn } from '@/components/molecules/DataTable';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import type { Post } from '@/lib/content/types';

type PostTableRow = Post & Record<string, unknown>;

export default function PostList({ posts, baseRevision }: { posts: Post[]; baseRevision: string }) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isRefreshing, startTransition] = useTransition();

  async function unpublishPost(post: Post) {
    if (post.status !== 'published' || !window.confirm(`「${post.title}」を非公開にしますか？`)) return;
    setPendingSlug(post.slug);
    setMessage('');
    try {
      const response = await fetch('/api/content/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseRevision, slug: post.slug }),
      });
      const data = await response.json() as { error?: string; pullRequestUrl?: string };
      if (!response.ok) {
        setMessage(data.error ?? '非公開化PRの作成に失敗しました。');
        return;
      }
      setMessage(`非公開化PRを作成しました: ${data.pullRequestUrl ?? 'GitHubで確認してください。'}`);
      startTransition(() => router.refresh());
    } catch {
      setMessage('非公開化PRの作成に失敗しました。');
    } finally {
      setPendingSlug(null);
    }
  }

  const sortedPosts = [...posts].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  const columns: DataTableColumn<PostTableRow>[] = [
    { key: 'title', header: 'タイトル' },
    { key: 'status', header: '状態' },
    { key: 'publishedAt', header: '公開日時' },
    {
      key: 'slug',
      header: '操作',
      width: '13rem',
      render: (_, post) => (
        <ResponsiveActionGroup className="post-list__actions">
          <a className="button-link" href={`/admin/posts/${post.slug}`}>編集してPRを作成</a>
          {post.status === 'published' && <button type="button" className="button-link button-link--secondary" disabled={pendingSlug !== null || isRefreshing} onClick={() => void unpublishPost(post)}>
            {pendingSlug === post.slug ? '非公開化PRを作成中...' : '非公開化'}
          </button>}
        </ResponsiveActionGroup>
      ),
    },
  ];

  return <>
    <style jsx global>{`
      .post-list__actions > .button-link {
        width: 100%;
      }
    `}</style>
    {message && <p className="notice" role="status" aria-live="polite">{message}</p>}
    <DataTable<PostTableRow>
      columns={columns}
      data={sortedPosts}
      rowKey="slug"
      title="記事一覧"
      paginated
      pageSize={20}
      pageSizeOptions={[20, 50, 100]}
    />
  </>;
}