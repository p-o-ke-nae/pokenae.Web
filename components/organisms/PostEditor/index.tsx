'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Post, TagDefinition } from "@/lib/content/types";
import type { PostWriteRequest } from "@/lib/content/schemas";
import {
  collectMarkdownImagePaths,
  createMarkdownImageLinkFromPath,
  createPastedImageFile,
  createUploadedImageFile,
  insertMarkdownAtSelection,
  toPostImagePath,
  validatePostImageFiles,
} from "@/lib/content/markdown-paste";
import SafeMarkdown from "@/components/organisms/SafeMarkdown";
import TagPicker from "@/components/molecules/TagPicker";
import MarkdownImagePicker, { type MarkdownImageCandidate } from "@/components/molecules/MarkdownImagePicker";
import { resolveRepositoryReference, type RepositoryMarkdownContext } from "@/lib/tools/readme-urls";
import { normalizePostPublishedAt, toJapanDateInputValue } from "@/lib/content/post-publication";

const blank: Post = { slug: "", title: "", summary: "", publishedAt: normalizePostPublishedAt(toJapanDateInputValue()), status: "draft", category: "blog", tags: [], relatedTags: [], priority: 0, showInPickup: false, body: "" };
const DRAFT_VERSION = 3;
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SavedPostDraft = {
  version: number;
  savedAt: string;
  post: Post;
  tagDefinitions: TagDefinition[];
  skipInfo: boolean;
};

type PendingImage = {
  file: File;
  path: string;
  previewUrl: string;
};

type PostEditorProps = {
  initial?: Post;
  baseRevision: PostWriteRequest["baseRevision"];
  pullRequestNumber?: number;
  initialTagDefinitions: TagDefinition[];
  repositoryContext?: RepositoryMarkdownContext;
};

function normalizePost(post: Post): Post {
  return {
    ...post,
    priority: post.priority ?? 0,
  };
}

export default function PostEditor({ initial = blank, baseRevision, pullRequestNumber, initialTagDefinitions, repositoryContext }: PostEditorProps) {
  const normalizedInitial = useMemo<Post>(() => ({
    ...normalizePost(initial),
    changeNote: initial.title ? `${initial.title}${initial.slug ? "を更新しました" : "を追加しました"}` : "",
  }), [initial]);
  const [post, setPost] = useState(normalizedInitial);
  const [tagDefinitions, setTagDefinitions] = useState(initialTagDefinitions);
  const [skipInfo, setSkipInfo] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [availableDraft, setAvailableDraft] = useState<SavedPostDraft | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const draftRestoredRef = useRef(false);
  const draftSaveMountedRef = useRef(false);
  const generatedChangeNoteRef = useRef(normalizedInitial.changeNote);
  const changeNoteEditedRef = useRef(false);
  const draftStorageKey = `pokenae.post-editor.${initial.slug || "new"}`;
  const previewUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, []);

  const referencedImagePaths = useMemo(() => collectMarkdownImagePaths(post.body), [post.body]);
  const localImages = useMemo(
    () => Object.fromEntries(pendingImages.map((image) => [image.path, image.previewUrl])),
    [pendingImages],
  );
  const imageCandidates = useMemo<MarkdownImageCandidate[]>(() => {
    const pendingPaths = new Set(pendingImages.map((image) => image.path));
    return [
      ...pendingImages.map((image) => ({ path: image.path, previewUrl: image.previewUrl, label: image.path.slice("./images/".length), pending: true })),
      ...referencedImagePaths
        .filter((path) => !pendingPaths.has(path))
        .map((path) => ({ path, previewUrl: resolveRepositoryReference(path, repositoryContext, "image"), label: path.slice("./images/".length), pending: false })),
    ];
  }, [pendingImages, referencedImagePaths, repositoryContext]);
  const attachedImages = pendingImages.filter((image) => referencedImagePaths.includes(image.path));

  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;

    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedPostDraft;
      const savedAt = Date.parse(parsed.savedAt);
      if (parsed.version !== DRAFT_VERSION || !Number.isFinite(savedAt) || Date.now() - savedAt > DRAFT_TTL_MS) {
        window.localStorage.removeItem(draftStorageKey);
        return;
      }
      const normalizedDraft = { ...parsed, post: normalizePost(parsed.post), skipInfo: parsed.skipInfo ?? false };
      if (JSON.stringify(normalizedDraft.post) !== JSON.stringify(normalizedInitial)) {
        window.setTimeout(() => setAvailableDraft(normalizedDraft), 0);
      }
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, normalizedInitial]);

  useEffect(() => {
    if (!draftSaveMountedRef.current) {
      draftSaveMountedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const draft: SavedPostDraft = { version: DRAFT_VERSION, savedAt, post, tagDefinitions, skipInfo };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setDraftSavedAt(savedAt);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draftStorageKey, post, tagDefinitions, skipInfo]);

  function handleTitleChange(title: string) {
    const suffix = initial.slug ? "を更新しました" : "を追加しました";
    setPost((current) => {
      const nextChangeNote = title ? `${title}${suffix}` : "";
      const changeNote = !changeNoteEditedRef.current && current.changeNote === generatedChangeNoteRef.current
        ? nextChangeNote
        : current.changeNote;
      generatedChangeNoteRef.current = nextChangeNote;
      return { ...current, title, changeNote };
    });
  }

  function clearDraft() {
    window.localStorage.removeItem(draftStorageKey);
    setAvailableDraft(null);
    setDraftSavedAt(null);
  }

  function restoreDraft() {
    if (!availableDraft) return;
    setPost(availableDraft.post);
    setTagDefinitions(availableDraft.tagDefinitions);
    setSkipInfo(availableDraft.skipInfo);
    const suffix = initial.slug ? "を更新しました" : "を追加しました";
    const generatedDraftNote = availableDraft.post.title ? `${availableDraft.post.title}${suffix}` : "";
    changeNoteEditedRef.current = availableDraft.post.changeNote !== generatedDraftNote;
    generatedChangeNoteRef.current = generatedDraftNote;
    setAvailableDraft(null);
    setMessage("下書きを復元しました。未保存の画像は「画像を挿入」から再度追加してください。");
  }

  const addImages = useCallback((files: File[], prepare: (file: File) => File) => {
    const { valid, message: validationMessage } = validatePostImageFiles(files);
    if (validationMessage) setMessage(validationMessage);
    const prepared = valid.map((file) => {
      const renamed = prepare(file);
      const previewUrl = URL.createObjectURL(renamed);
      previewUrlsRef.current.add(previewUrl);
      return { file: renamed, path: toPostImagePath(renamed.name), previewUrl };
    });
    if (prepared.length) setPendingImages((current) => [...current, ...prepared]);
    return prepared;
  }, []);

  function insertAtCursor(markdown: string) {
    const textarea = bodyRef.current;
    const selectionStart = textarea?.selectionStart ?? post.body.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    setPost((current) => ({ ...current, body: insertMarkdownAtSelection(current.body, selectionStart, selectionEnd, markdown) }));
    window.requestAnimationFrame(() => {
      const cursor = selectionStart + markdown.length;
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  }

  function removePendingImage(path: string) {
    setPendingImages((current) => current.filter((image) => {
      if (image.path !== path) return true;
      URL.revokeObjectURL(image.previewUrl);
      previewUrlsRef.current.delete(image.previewUrl);
      return false;
    }));
  }

  function handleEditorPaste(event: React.ClipboardEvent<HTMLFormElement>) {
    const images = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (images.length === 0) return;

    event.preventDefault();
    const prepared = addImages(images, (file) => createPastedImageFile(file));
    if (prepared.length === 0) return;
    if (event.target === bodyRef.current) {
      insertAtCursor(prepared.map((image) => createMarkdownImageLinkFromPath(image.path)).join("\n"));
    } else {
      setMessage(`画像 ${prepared.length}件を候補に追加しました。「画像を挿入」から本文に挿入できます。`);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage("");
    const { body, ...frontmatter } = post;
    const payload = { baseRevision, post: frontmatter, body } satisfies PostWriteRequest;
    const form = new FormData(event.currentTarget);
    form.set("post", JSON.stringify(payload.post));
    form.set("body", payload.body);
    form.set("baseRevision", payload.baseRevision);
    form.set("tagDefinitions", JSON.stringify(tagDefinitions));
    form.set("skipInfo", String(skipInfo));
    attachedImages.forEach(({ file }) => form.append("images", file, file.name));
    const response = pullRequestNumber
      ? await fetch(`/api/content/posts/pull-requests/${pullRequestNumber}`, { method: "PUT", body: form })
      : await fetch("/api/content/posts", { method: "POST", body: form });
    const data = await response.json() as { code?: string; error?: string; pullRequestUrl?: string };
    if (response.ok) clearDraft();
    setMessage(response.ok
      ? pullRequestNumber ? "Pull Requestを更新しました。" : `Pull Requestを作成しました: ${data.pullRequestUrl}`
      : data.code === "CONTENT_CONFLICT"
        ? "公開コンテンツが画面表示後に更新されました。ページを再読込してから編集し直してください。"
        : data.code === "CONTENT_WRITE_DISABLED"
          ? data.error ?? "現在のコンテンツソース設定では Pull Request を作成できません。"
          : data.error ?? "保存に失敗しました。");
    setSaving(false);
  }
  return <form className="post-editor" onSubmit={submit} onPaste={handleEditorPaste}>
    {availableDraft && <div className="post-editor__draft" role="status">
      <p>前回の下書き（{new Date(availableDraft.savedAt).toLocaleString("ja-JP")}）があります。</p>
      <div className="post-editor__draft-actions">
        <button type="button" onClick={restoreDraft}>復元</button>
        <button type="button" onClick={clearDraft}>破棄</button>
      </div>
    </div>}
    <label>slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={post.slug} onChange={(event) => setPost({ ...post, slug: event.target.value })} /></label>
    <label>タイトル<input required value={post.title} onChange={(event) => handleTitleChange(event.target.value)} /></label>
    <label>概要<textarea required value={post.summary} onChange={(event) => setPost({ ...post, summary: event.target.value })} /></label>
    <div className="post-editor__row"><label>公開日<input type="date" required value={post.publishedAt.slice(0, 10)} onChange={(event) => setPost({ ...post, publishedAt: event.target.value ? normalizePostPublishedAt(event.target.value) : "" })} /></label><label>状態<select value={post.status} onChange={(event) => setPost({ ...post, status: event.target.value as Post["status"] })}><option value="draft">下書き</option><option value="published">公開</option></select></label></div>
    <label>表示優先度<input type="number" min="0" step="1" value={post.priority} onChange={(event) => setPost({ ...post, priority: Number(event.target.value || 0) })} /></label>
    <p className="post-editor__hint">大きい値ほど先に表示されます。既定値は 0 です。通常運用では 0 のままで問題ありません。</p>
    <label>カテゴリ<input required value={post.category} onChange={(event) => setPost({ ...post, category: event.target.value })} /></label>
    <TagPicker
      tags={tagDefinitions}
      selectedIds={post.tags}
      onTagsChange={setTagDefinitions}
      onSelectedIdsChange={(tags) => setPost((current) => ({ ...current, tags }))}
    />
    <label>変更概要<input value={post.changeNote ?? ""} onChange={(event) => { changeNoteEditedRef.current = true; setPost({ ...post, changeNote: event.target.value }); }} /></label>
    <div className="post-editor__workspace">
      <div className="post-editor__body-field">
        <div className="post-editor__toolbar">
          <label htmlFor={`${draftStorageKey}-body`}>Markdown本文</label>
          <MarkdownImagePicker
            candidates={imageCandidates}
            disabled={saving}
            onInsert={(path, alt) => insertAtCursor(createMarkdownImageLinkFromPath(path, alt))}
            onFilesSelected={(files) => {
              const prepared = addImages(files, (file) => createUploadedImageFile(file));
              if (prepared.length) setMessage(`画像 ${prepared.length}件を候補に追加しました。`);
            }}
            onRemove={removePendingImage}
          />
        </div>
        <textarea id={`${draftStorageKey}-body`} ref={bodyRef} className="post-editor__body" required value={post.body} onChange={(event) => setPost({ ...post, body: event.target.value })} />
        <p className="post-editor__hint post-editor__hint--flush">画像は本文へ貼り付けるとその位置に挿入されます。「画像を挿入」から端末の画像を追加し、候補を選んで挿入することもできます。</p>
      </div>
      <section aria-label="プレビュー" className="post-editor__preview"><strong>プレビュー</strong><SafeMarkdown source={post.body} allowedEmbed={post.category === "showcase" ? post.embed?.component : undefined} repositoryContext={repositoryContext} localImages={localImages} /></section>
    </div>
    {pendingImages.length > 0 && <p role="status">本文で参照している画像 {attachedImages.length}件を保存時に添付します（候補 {pendingImages.length}件）。</p>}
    <label className="post-editor__check"><input type="checkbox" checked={skipInfo} onChange={(event) => setSkipInfo(event.target.checked)} />INFOに表示しない</label>
    <label className="post-editor__check"><input type="checkbox" checked={post.showInPickup} onChange={(event) => setPost({ ...post, showInPickup: event.target.checked })} />PICKUPに表示</label>
    <button type="submit" disabled={saving}>{saving ? "PRを保存中…" : pullRequestNumber ? "Pull Requestを更新" : "ブランチ・コミット・PRを作成"}</button>
    {draftSavedAt && <p className="post-editor__draft-status" role="status">下書きを保存しました（{new Date(draftSavedAt).toLocaleTimeString("ja-JP")}）。</p>}
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
      .post-editor__draft { display:grid; gap:.5rem; padding:.75rem; border:1px solid var(--color-accent-25-strong); background:color-mix(in srgb, var(--color-accent-25-strong) 10%, white); }
      .post-editor__draft-actions { display:flex; gap:.5rem; align-items:center; }
      .post-editor__draft-actions button { min-height:44px; padding:.5rem .75rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
      .post-editor__draft-status { margin:0; color:var(--color-base-70-dark); font-size:.875rem; }
      .post-editor__hint { margin:-.5rem 0 0; color:var(--color-base-70-dark); font-size:.875rem; }
      .post-editor__hint--flush { margin:0; }
      .post-editor__body-field { display:grid; gap:.3rem; min-width:0; }
      .post-editor__toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.5rem; }
      .post-editor button { min-height:48px; border:0; border-radius:.3rem; background:var(--color-accent-25-strong); color:#fff; font-weight:700; }
      @media(max-width:760px){.post-editor__row,.post-editor__workspace{grid-template-columns:1fr}}
    `}</style>
  </form>;
}
