'use client';

import { FormEvent, useState } from "react";
import type { Post } from "@/lib/content/types";
import SafeMarkdown from "@/components/organisms/SafeMarkdown";

const blank: Post = { slug: "", title: "", summary: "", publishedAt: new Date().toISOString().slice(0, 10), status: "draft", category: "blog", tags: [], relatedTags: [], priority: 0, showInPickup: false, body: "" };

export default function PostEditor({ initial = blank }: { initial?: Post }) {
  const [post, setPost] = useState(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage("");
    const form = new FormData(event.currentTarget);
    form.set("post", JSON.stringify({ ...post, body: undefined }));
    form.set("body", post.body);
    const response = await fetch("/api/content/posts", { method: "POST", body: form });
    const data = await response.json() as { error?: string; pullRequestUrl?: string };
    setMessage(response.ok ? `Pull Request を作成しました: ${data.pullRequestUrl}` : data.error ?? "保存に失敗しました。");
    setSaving(false);
  }
  return <form className="post-editor" onSubmit={submit}>
    <label>slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={post.slug} onChange={(event) => setPost({ ...post, slug: event.target.value })} /></label>
    <label>タイトル<input required value={post.title} onChange={(event) => setPost({ ...post, title: event.target.value })} /></label>
    <label>概要<textarea required value={post.summary} onChange={(event) => setPost({ ...post, summary: event.target.value })} /></label>
    <div className="post-editor__row"><label>公開日<input type="date" required value={post.publishedAt.slice(0, 10)} onChange={(event) => setPost({ ...post, publishedAt: event.target.value })} /></label><label>状態<select value={post.status} onChange={(event) => setPost({ ...post, status: event.target.value as Post["status"] })}><option value="draft">下書き</option><option value="published">公開</option></select></label></div>
    <label>カテゴリ<input required value={post.category} onChange={(event) => setPost({ ...post, category: event.target.value })} /></label>
    <label>タグ（カンマ区切り）<input value={post.tags.join(",")} onChange={(event) => setPost({ ...post, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label>
    <label>変更概要<input value={post.changeNote ?? ""} onChange={(event) => setPost({ ...post, changeNote: event.target.value })} /></label>
    <div className="post-editor__workspace"><label>Markdown本文<textarea className="post-editor__body" required value={post.body} onChange={(event) => setPost({ ...post, body: event.target.value })} /></label><section aria-label="プレビュー" className="post-editor__preview"><strong>プレビュー</strong><SafeMarkdown source={post.body} allowedEmbed={post.category === "showcase" ? post.embed?.component : undefined} /></section></div>
    <label>添付画像（PNG/JPEG/WebP・各5MB以下）<input name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple /></label>
    <label className="post-editor__check"><input type="checkbox" checked={post.showInPickup} onChange={(event) => setPost({ ...post, showInPickup: event.target.checked })} />PICKUPに表示</label>
    <button type="submit" disabled={saving}>{saving ? "PRを作成中…" : "ブランチ・コミット・PRを作成"}</button>
    {message && <p role="status" className="notice">{message}</p>}
    <style>{`
      .post-editor { display:grid; gap:1rem; }
      .post-editor label { display:grid; gap:.3rem; font-weight:700; }
      .post-editor input,.post-editor textarea,.post-editor select { width:100%; min-height:44px; padding:.55rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
      .post-editor__body { min-height:380px!important; font-family:var(--font-geist-mono),monospace; }
      .post-editor__workspace { display:grid; grid-template-columns:1fr 1fr; gap:1rem; align-items:start; }
      .post-editor__preview { min-width:0; min-height:430px; padding:1rem; border:1px solid var(--color-base-70); background:#fff; }
      .post-editor__row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      .post-editor__check { display:flex!important; align-items:center; grid-template-columns:auto 1fr; }
      .post-editor__check input { width:auto; }
      .post-editor button { min-height:48px; border:0; border-radius:.3rem; background:var(--color-accent-25-strong); color:#fff; font-weight:700; }
      @media(max-width:760px){.post-editor__row,.post-editor__workspace{grid-template-columns:1fr}}
    `}</style>
  </form>;
}
