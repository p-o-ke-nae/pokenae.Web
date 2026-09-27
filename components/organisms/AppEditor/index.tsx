"use client";

import { cloneElement, type FormEvent, type ReactElement, useEffect, useMemo, useState } from "react";
import ValidationMessage from "../../molecules/ValidationMessage";
import { appListSchema } from "../../../lib/content/schemas";
import type { AppContent } from "../../../lib/content/admin-config";
import type { ValidationIssue } from "../../../lib/content/canonical-validation";

type AppStatus = AppContent["status"];

export type AppDraft = {
  key: string;
  slug: string;
  displayName: string;
  summary: string;
  href: string;
  image: string;
  imageAlt: string;
  metaLabel: string;
  status: AppStatus;
  order: string;
  tags: string;
};

type PullRequest = {
  number: number;
  title: string;
  url: string;
  branch: string;
  headRevision: string;
};

type ApiResponse = {
  code?: string;
  error?: string;
  issues?: ValidationIssue[];
  pullRequest?: PullRequest;
  pullRequests?: PullRequest[];
  value?: unknown;
  pullRequestUrl?: string;
  headRevision?: string;
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizeApps(value: unknown): AppDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((app, index) => {
    const source = record(app);
    const status = source.status === "published" || source.status === "archived" ? source.status : "draft";
    return {
      key: `${text(source.slug) || "app"}-${index}`,
      slug: text(source.slug),
      displayName: text(source.displayName),
      summary: text(source.summary),
      href: text(source.href),
      image: text(source.image),
      imageAlt: text(source.imageAlt),
      metaLabel: text(source.metaLabel),
      status,
      order: typeof source.order === "number" ? String(source.order) : "",
      tags: Array.isArray(source.tags) ? source.tags.filter((tag): tag is string => typeof tag === "string").join(", ") : "",
    };
  });
}

export function serializeApps(apps: readonly AppDraft[]): AppContent[] {
  return apps.map((app) => ({
    slug: app.slug.trim(),
    displayName: app.displayName.trim(),
    summary: app.summary.trim(),
    href: app.href.trim(),
    image: app.image.trim() || null,
    imageAlt: app.imageAlt,
    metaLabel: app.metaLabel.trim(),
    status: app.status,
    order: app.order.trim() === "" ? Number.NaN : Number(app.order),
    tags: app.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
  }));
}

function newApp(index: number): AppDraft {
  return {
    key: `new-${index}-${Date.now()}`,
    slug: "",
    displayName: "",
    summary: "",
    href: "/",
    image: "",
    imageAlt: "",
    metaLabel: "Webアプリ",
    status: "draft",
    order: String(index),
    tags: "",
  };
}

function issueKey(path: Array<string | number>) {
  return path.join(".");
}

export default function AppEditor({ initial, baseRevision }: { initial: unknown; baseRevision: string }) {
  const initialApps = useMemo(() => normalizeApps(initial), [initial]);
  const [apps, setApps] = useState(initialApps);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selected, setSelected] = useState<PullRequest | null>(null);
  const [revision, setRevision] = useState(baseRevision);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPullRequest, setLoadingPullRequest] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/content/config/pull-requests?kind=apps", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as ApiResponse;
        if (!response.ok) throw new Error(data.error ?? "Pull Request 一覧を取得できませんでした。");
        if (active) setPullRequests(data.pullRequests ?? []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Pull Request 一覧を取得できませんでした。");
        setMessageIsError(true);
      })
      .finally(() => {
        if (active) setLoadingList(false);
      });
    return () => { active = false; };
  }, []);

  const errors = useMemo(
    () => new Map(issues.map((issue) => [issueKey(issue.path), issue.message])),
    [issues],
  );
  const fieldError = (index: number, field: string) =>
    errors.get(`apps.${index}.${field}`)
    ?? [...errors].find(([path]) => path.startsWith(`apps.${index}.${field}.`))?.[1];
  const errorId = (index: number, field: string) => `app-${index}-${field}-error`;
  const busy = saving || loadingPullRequest;

  function clearFeedback() {
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  function update(index: number, patch: Partial<AppDraft>) {
    setApps((current) => current.map((app, appIndex) => appIndex === index ? { ...app, ...patch } : app));
    clearFeedback();
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= apps.length) return;
    setApps((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((app, order) => ({ ...app, order: String(order) }));
    });
    clearFeedback();
  }

  function resetToMain() {
    setSelected(null);
    setRevision(baseRevision);
    setApps(initialApps);
    clearFeedback();
  }

  async function loadPullRequest(number: number) {
    if (!number) return resetToMain();
    setLoadingPullRequest(true);
    clearFeedback();
    try {
      const response = await fetch(`/api/content/config/pull-requests/${number}?kind=apps`, { cache: "no-store" });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.pullRequest || !Array.isArray(data.value)) {
        throw new Error(data.error ?? "Pull Request を取得できませんでした。");
      }
      setSelected(data.pullRequest);
      setRevision(data.pullRequest.headRevision);
      setApps(normalizeApps(data.value));
      setIssues(data.issues ?? []);
      setMessage(data.issues?.length ? "既存の検証エラーを修正してください。" : "Pull Request を読み込みました。");
      setMessageIsError(Boolean(data.issues?.length));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pull Request を取得できませんでした。");
      setMessageIsError(true);
    } finally {
      setLoadingPullRequest(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    clearFeedback();
    const serialized = serializeApps(apps);
    const parsed = appListSchema.safeParse(serialized);
    if (!parsed.success) {
      setIssues(parsed.error.issues.map((issue) => ({
        path: ["apps", ...issue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number")],
        message: issue.message,
      })));
      setMessage("入力内容を確認してください。");
      setMessageIsError(true);
      setSaving(false);
      return;
    }

    const payload = selected
      ? { kind: "apps", value: parsed.data, expectedRevision: revision, changeNote: "Webアプリを管理画面から更新" }
      : { kind: "apps", value: parsed.data, baseRevision: revision, changeNote: "Webアプリを管理画面から更新" };
    try {
      const response = await fetch(
        selected ? `/api/content/config/pull-requests/${selected.number}?kind=apps` : "/api/content/config",
        { method: selected ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const data = await response.json() as ApiResponse;
      setIssues(data.issues ?? []);
      if (!response.ok) {
        setMessage(data.code === "CONTENT_CONFLICT"
          ? "Pull Request が画面表示後に更新されました。再読込してください。"
          : data.error ?? "保存に失敗しました。");
        setMessageIsError(true);
        return;
      }
      if (data.headRevision) setRevision(data.headRevision);
      setMessage(`${selected ? "Pull Request を更新しました" : "Pull Request を作成しました"}: ${data.pullRequestUrl ?? ""}`);
    } catch {
      setMessage("保存通信に失敗しました。");
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-editor stack">
      <div className="app-editor__source">
        <label>
          編集対象
          <select
            aria-label="編集するPull Request"
            value={selected?.number ?? ""}
            disabled={busy || loadingList}
            onChange={(event) => void loadPullRequest(Number(event.target.value))}
          >
            <option value="">{loadingList ? "Pull Request を読込中…" : "main から新しい Pull Request を作成"}</option>
            {pullRequests.map((pullRequest) => (
              <option key={pullRequest.number} value={pullRequest.number}>#{pullRequest.number} {pullRequest.title}</option>
            ))}
          </select>
        </label>
        {selected ? <a href={selected.url} target="_blank" rel="noreferrer">選択中の Pull Request を開く</a> : null}
      </div>

      <form className="stack" aria-busy={busy} noValidate onSubmit={submit}>
        {apps.map((app, index) => (
          <fieldset key={app.key} className="app-editor__card" disabled={busy}>
            <legend>Webアプリ {index + 1}{app.displayName ? `: ${app.displayName}` : ""}</legend>
            <div className="app-editor__grid">
              <Field label="slug" error={fieldError(index, "slug")} errorId={errorId(index, "slug")}>
                <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={app.slug} onChange={(event) => update(index, { slug: event.target.value })} />
              </Field>
              <Field label="表示名" error={fieldError(index, "displayName")} errorId={errorId(index, "displayName")}>
                <input required value={app.displayName} onChange={(event) => update(index, { displayName: event.target.value })} />
              </Field>
              <Field wide label="概要" error={fieldError(index, "summary")} errorId={errorId(index, "summary")}>
                <textarea required rows={3} value={app.summary} onChange={(event) => update(index, { summary: event.target.value })} />
              </Field>
              <Field label="アプリURL" error={fieldError(index, "href")} errorId={errorId(index, "href")}>
                <input required value={app.href} onChange={(event) => update(index, { href: event.target.value })} />
              </Field>
              <Field label="メタラベル" error={fieldError(index, "metaLabel")} errorId={errorId(index, "metaLabel")}>
                <input required value={app.metaLabel} onChange={(event) => update(index, { metaLabel: event.target.value })} />
              </Field>
              <Field label="画像URL / 既存パス（任意）" error={fieldError(index, "image")} errorId={errorId(index, "image")}>
                <input value={app.image} onChange={(event) => update(index, { image: event.target.value })} />
              </Field>
              <Field label="画像の代替テキスト" error={fieldError(index, "imageAlt")} errorId={errorId(index, "imageAlt")}>
                <input value={app.imageAlt} onChange={(event) => update(index, { imageAlt: event.target.value })} />
              </Field>
              <Field label="公開状態" error={fieldError(index, "status")} errorId={errorId(index, "status")}>
                <select value={app.status} onChange={(event) => update(index, { status: event.target.value as AppStatus })}>
                  <option value="draft">下書き</option>
                  <option value="published">公開</option>
                  <option value="archived">アーカイブ</option>
                </select>
              </Field>
              <Field label="表示順" error={fieldError(index, "order")} errorId={errorId(index, "order")}>
                <input type="number" min="0" step="1" required value={app.order} onChange={(event) => update(index, { order: event.target.value })} />
              </Field>
              <Field wide label="タグID（カンマ区切り）" error={fieldError(index, "tags")} errorId={errorId(index, "tags")}>
                <input value={app.tags} placeholder="000001, 000002" onChange={(event) => update(index, { tags: event.target.value })} />
              </Field>
            </div>
            <div className="app-editor__actions" aria-label={`Webアプリ ${index + 1} の操作`}>
              <button type="button" className="button-link button-link--secondary" disabled={index === 0} onClick={() => move(index, -1)}>上へ</button>
              <button type="button" className="button-link button-link--secondary" disabled={index === apps.length - 1} onClick={() => move(index, 1)}>下へ</button>
              <button type="button" className="button-link button-link--secondary" onClick={() => {
                setApps((current) => current.filter((_, appIndex) => appIndex !== index));
                clearFeedback();
              }}>削除</button>
            </div>
          </fieldset>
        ))}
        <button type="button" className="button-link button-link--secondary" disabled={busy} onClick={() => {
          setApps((current) => [...current, newApp(current.length)]);
          clearFeedback();
        }}>Webアプリを追加</button>
        <button type="submit" className="button-link" disabled={busy}>
          {saving ? "保存中…" : loadingPullRequest ? "読込中…" : selected ? "同じ Pull Request を更新" : "Pull Request を作成"}
        </button>
        {message ? <p className={messageIsError ? "notice notice--error" : "notice"} role={messageIsError ? "alert" : "status"}>{message}</p> : null}
      </form>

      <style jsx>{`
        .app-editor__source { display:flex; flex-wrap:wrap; gap:1rem; align-items:end; }
        .app-editor__source label { display:grid; gap:.35rem; flex:1 1 320px; font-weight:700; }
        .app-editor input,.app-editor select,.app-editor textarea { width:100%; min-height:44px; padding:.55rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
        .app-editor textarea { resize:vertical; }
        .app-editor__card { display:grid; gap:1rem; padding:1rem; border:1px solid var(--color-base-70); border-radius:.35rem; background:#fff; }
        .app-editor__card > legend { padding:0 .4rem; font-weight:700; }
        .app-editor__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
        .app-editor__field { display:grid; align-content:start; gap:.3rem; font-weight:700; }
        .app-editor__wide { grid-column:1/-1; }
        .app-editor__actions { display:flex; flex-wrap:wrap; gap:.5rem; }
        .app-editor .validation-message { color:#751b16; font-size:.9rem; font-weight:400; }
        @media(max-width:760px){.app-editor__grid{grid-template-columns:1fr}.app-editor__wide{grid-column:auto}}
      `}</style>
    </div>
  );
}

function Field({
  label,
  error,
  errorId,
  wide,
  children,
}: {
  label: string;
  error?: string;
  errorId: string;
  wide?: boolean;
  children: ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  return (
    <label className={`app-editor__field${wide ? " app-editor__wide" : ""}`}>
      {label}
      {cloneElement(children, { "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined })}
      <ValidationMessage id={errorId}>{error}</ValidationMessage>
    </label>
  );
}
