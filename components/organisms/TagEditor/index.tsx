"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import CustomButton from "@/components/atoms/CustomButton";
import type { TagDefinition } from "@/lib/content/types";
import { tagDefinitionListSchema } from "@/lib/content/schemas";
import type { ValidationIssue } from "@/lib/content/canonical-validation";
import ValidationMessage from "@/components/molecules/ValidationMessage";

type PullRequest = {
  number: number;
  title: string;
  url: string;
  branch: string;
  headRevision: string;
};

type TagDraft = TagDefinition & { key: string; isNew?: boolean };

type TagEditorProps = {
  initial: TagDefinition[];
  baseRevision: string;
};

function drafts(tags: TagDefinition[]): TagDraft[] {
  return tags.map((tag) => ({ ...tag, key: tag.id }));
}

export default function TagEditor({ initial, baseRevision }: TagEditorProps) {
  const initialDrafts = useMemo(() => drafts(initial), [initial]);
  const [tags, setTags] = useState(initialDrafts);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selected, setSelected] = useState<PullRequest | null>(null);
  const [revision, setRevision] = useState(baseRevision);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const errors = useMemo(
    () => new Map(issues.map((issue) => [issue.path.join("."), issue.message])),
    [issues],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/content/config/pull-requests?kind=tags", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { pullRequests?: PullRequest[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "タグ Pull Request 一覧を取得できませんでした。");
        if (active) setPullRequests(data.pullRequests ?? []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "タグ Pull Request 一覧を取得できませんでした。");
        setMessageIsError(true);
      });
    return () => { active = false; };
  }, []);

  function clearFeedback() {
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  function update(index: number, patch: Partial<TagDraft>) {
    setTags((current) => current.map((tag, itemIndex) => itemIndex === index ? { ...tag, ...patch } : tag));
    clearFeedback();
  }

  function add() {
    setTags((current) => [...current, {
      key: `new-${Date.now()}-${current.length}`,
      id: "",
      label: "",
      isNew: true,
    }]);
    clearFeedback();
  }

  function remove(index: number) {
    setTags((current) => current.filter((_, itemIndex) => itemIndex !== index));
    clearFeedback();
  }

  function resetToMain() {
    setSelected(null);
    setRevision(baseRevision);
    setTags(initialDrafts);
    clearFeedback();
  }

  async function loadPullRequest(number: number) {
    if (!number) return resetToMain();
    setBusy(true);
    clearFeedback();
    try {
      const response = await fetch(`/api/content/config/pull-requests/${number}?kind=tags`, { cache: "no-store" });
      const data = await response.json() as {
        pullRequest?: PullRequest;
        value?: TagDefinition[];
        issues?: ValidationIssue[];
        error?: string;
      };
      if (!response.ok || !data.pullRequest || !Array.isArray(data.value)) {
        throw new Error(data.error ?? "タグ Pull Request を取得できませんでした。");
      }
      setSelected(data.pullRequest);
      setRevision(data.pullRequest.headRevision);
      setTags(drafts(data.value));
      setIssues(data.issues ?? []);
      setMessage(data.issues?.length ? "既存の検証エラーを修正してください。" : "Pull Request を読み込みました。");
      setMessageIsError(Boolean(data.issues?.length));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "タグ Pull Request を取得できませんでした。");
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    clearFeedback();
    const value = tags.map(({ id, label, isNew }) => ({ id: isNew ? "" : id.trim(), label: label.trim() }));
    const parsed = tagDefinitionListSchema.safeParse(value.filter((tag) => tag.id));
    const invalidLabelIndex = value.findIndex((tag) => !tag.label);
    if (invalidLabelIndex >= 0) {
      setIssues([{ path: ["tags", invalidLabelIndex, "label"], message: "表示名を入力してください。" }]);
      setMessage("入力内容を確認してください。");
      setMessageIsError(true);
      setBusy(false);
      return;
    }
    const payload = value.map((tag) => ({ id: tag.id, label: tag.label }));
    if (!parsed.success) {
      setIssues(parsed.error.issues.map((issue) => ({
        path: ["tags", ...issue.path.filter((part): part is string | number => (
          typeof part === "string" || typeof part === "number"
        ))],
        message: issue.message,
      })));
      setMessage("入力内容を確認してください。");
      setMessageIsError(true);
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(
        selected ? `/api/content/config/pull-requests/${selected.number}?kind=tags` : "/api/content/config",
        {
          method: selected ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selected
            ? { kind: "tags", value: payload, expectedRevision: revision, changeNote: "タグを管理画面から更新" }
            : { kind: "tags", value: payload, baseRevision: revision, changeNote: "タグを管理画面から更新" }),
        },
      );
      const data = await response.json() as {
        code?: string;
        error?: string;
        issues?: ValidationIssue[];
        pullRequestUrl?: string;
        headRevision?: string;
      };
      if (!response.ok) {
        setIssues(data.issues ?? []);
        throw new Error(data.code === "CONTENT_CONFLICT"
          ? "コンテンツが更新されています。ページを再読込してください。"
          : data.error ?? "タグを保存できませんでした。");
      }
      if (data.headRevision) setRevision(data.headRevision);
      setMessage(selected
        ? `Pull Request を更新しました: ${data.pullRequestUrl}`
        : `Pull Request を作成しました: ${data.pullRequestUrl}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "タグを保存できませんでした。");
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="tag-editor stack" onSubmit={submit}>
      <label>
        編集対象
        <select
          value={selected?.number ?? ""}
          disabled={busy}
          onChange={(event) => void loadPullRequest(Number(event.target.value))}
        >
          <option value="">main から新規 Pull Request</option>
          {pullRequests.map((pullRequest) => (
            <option key={pullRequest.number} value={pullRequest.number}>#{pullRequest.number} {pullRequest.title}</option>
          ))}
        </select>
      </label>
      <p className="tag-editor__help">tag ID は保存時に000001〜999999から自動採番され、既存 ID は変更できません。表示名はいつでも変更でき、タグ削除時は全記事の tags / relatedTags から同じ ID を除去します。</p>
      <div className="tag-editor__list">
        {tags.map((tag, index) => {
          const idError = errors.get(`tags.${index}.id`);
          const labelError = errors.get(`tags.${index}.label`);
          return (
            <article className="tag-editor__item" key={tag.key}>
              <div><strong>tag ID</strong><p>{tag.isNew ? "保存時に自動採番" : tag.id}</p><ValidationMessage id={`tag-${index}-id-error`}>{idError}</ValidationMessage></div>
              <label>
                表示名
                <input
                  value={tag.label}
                  aria-invalid={Boolean(labelError)}
                  aria-describedby={labelError ? `tag-${index}-label-error` : undefined}
                  onChange={(event) => update(index, { label: event.target.value })}
                />
                <ValidationMessage id={`tag-${index}-label-error`}>{labelError}</ValidationMessage>
              </label>
              <CustomButton type="button" variant="ghost" onClick={() => remove(index)}>削除</CustomButton>
            </article>
          );
        })}
      </div>
      <div className="tag-editor__actions">
        <CustomButton type="button" variant="neutral" onClick={add}>タグを追加</CustomButton>
        <CustomButton type="submit" variant="accent" isLoading={busy} loadingLabel="保存中…">
          {selected ? "Pull Request を更新" : "タグ更新 Pull Request を作成"}
        </CustomButton>
      </div>
      {message ? <p className={messageIsError ? "notice notice--error" : "notice"} role={messageIsError ? "alert" : "status"}>{message}</p> : null}
      <style jsx>{`
        .tag-editor label { display:grid; gap:.35rem; font-weight:700; }
        .tag-editor input,.tag-editor select { width:100%; min-height:44px; padding:.55rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
        .tag-editor input:disabled { background:var(--color-base-70-light); color:var(--color-text-strong); opacity:.8; }
        .tag-editor__help { margin:0; }
        .tag-editor__list { display:grid; gap:.75rem; }
        .tag-editor__item { display:grid; grid-template-columns:minmax(10rem,1fr) minmax(12rem,2fr) auto; gap:.75rem; align-items:end; padding:.75rem; border:1px solid var(--color-base-70); border-radius:.5rem; }
        .tag-editor__actions { display:flex; flex-wrap:wrap; gap:.75rem; justify-content:space-between; }
        @media(max-width:760px){.tag-editor__item{grid-template-columns:1fr}.tag-editor__actions{display:grid}}
      `}</style>
    </form>
  );
}
