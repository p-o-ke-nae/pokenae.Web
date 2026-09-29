"use client";

import { cloneElement, FormEvent, type ReactElement, useEffect, useMemo, useState } from "react";
import ValidationMessage from "../../molecules/ValidationMessage";
import { toolListSchema } from "../../../lib/content/schemas";
import type { ToolContent } from "../../../lib/content/admin-config";
import type { ValidationIssue } from "../../../lib/content/canonical-validation";

type ToolKind = ToolContent["kind"];
type OptionalBoolean = "" | "true" | "false";

export type ToolDraft = {
  key: string;
  slug: string;
  displayName: string;
  summary: string;
  repository: string;
  kind: ToolKind | "";
  image: string;
  supportedOs: string[];
  tags: string[];
  docs: {
    readme: string;
    paths: string[];
  };
  release: {
    channel: string;
    manifestRequired: OptionalBoolean;
    unsignedInstaller: OptionalBoolean;
    package: string;
  };
  showInPickup: OptionalBoolean;
  priority: string;
};

export type SerializedToolDraft = Omit<ToolContent, "kind"> & {
  kind: ToolKind | "";
};

type PullRequest = {
  number: number;
  title: string;
  url: string;
  branch: string;
  headRevision: string;
};

type ToolEditorProps = {
  initial: unknown;
  baseRevision: string;
};

type ApiResponse = {
  code?: string;
  error?: string;
  issues?: ValidationIssue[];
  pullRequest?: PullRequest;
  pullRequests?: PullRequest[];
  tools?: unknown;
  value?: unknown;
  update?: unknown;
  pullRequestUrl?: string;
  headRevision?: string;
};

const emptyDocs = () => ({ readme: "", paths: [] as string[] });
const emptyRelease = () => ({
  channel: "",
  manifestRequired: "" as OptionalBoolean,
  unsignedInstaller: "" as OptionalBoolean,
  package: "",
});

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.map(text) : [];
}

function optionalBoolean(value: unknown): OptionalBoolean {
  return typeof value === "boolean" ? String(value) as OptionalBoolean : "";
}

export function normalizeTools(value: unknown): ToolDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((tool, index) => {
    const source = record(tool);
    const docs = record(source.docs);
    const release = record(source.release);
    const kind = source.kind === "windows-app" || source.kind === "library" ? source.kind : "";
    return {
      key: `${text(source.slug) || "tool"}-${index}`,
      slug: text(source.slug),
      displayName: text(source.displayName),
      summary: text(source.summary),
      repository: text(source.repository),
      kind,
      image: text(source.image),
      supportedOs: textArray(source.supportedOs),
      tags: textArray(source.tags),
      docs: {
        readme: text(docs.readme),
        paths: textArray(docs.paths),
      },
      release: {
        channel: text(release.channel),
        manifestRequired: optionalBoolean(release.manifestRequired),
        unsignedInstaller: optionalBoolean(release.unsignedInstaller),
        package: text(release.package),
      },
      showInPickup: optionalBoolean(source.showInPickup),
      priority: typeof source.priority === "number" ? String(source.priority) : "",
    };
  });
}

function nonEmpty(value: string) {
  return value.trim() ? value : undefined;
}

function serializeOptionalBoolean(value: OptionalBoolean) {
  return value === "" ? undefined : value === "true";
}

export function serializeTools(tools: readonly ToolDraft[]): SerializedToolDraft[] {
  return tools.map((tool) => {
    const supportedOs = tool.supportedOs.filter((item) => item.trim());
    const tags = tool.tags.filter((item) => item.trim());
    const docPaths = tool.docs.paths.filter((item) => item.trim());
    const docs = {
      readme: tool.docs.readme,
      paths: docPaths,
    };
    const release = {
      channel: tool.release.channel,
      manifestRequired: serializeOptionalBoolean(tool.release.manifestRequired),
      unsignedInstaller: serializeOptionalBoolean(tool.release.unsignedInstaller),
      package: nonEmpty(tool.release.package),
    };
    return {
      slug: tool.slug,
      displayName: tool.displayName,
      summary: tool.summary,
      repository: tool.repository,
      kind: tool.kind,
      image: nonEmpty(tool.image),
      supportedOs: supportedOs.length ? supportedOs : undefined,
      tags,
      docs,
      release,
      showInPickup: serializeOptionalBoolean(tool.showInPickup),
      priority: tool.priority === "" ? undefined : Number(tool.priority),
    };
  });
}

function issueKey(path: Array<string | number>) {
  return path.join(".");
}

function withToolsPrefix(issue: ValidationIssue): ValidationIssue {
  return issue.path[0] === "tools" ? issue : { ...issue, path: ["tools", ...issue.path] };
}

export function readToolsPayload(data: { tools?: unknown; value?: unknown }): unknown[] {
  const value = data.tools ?? data.value;
  if (!Array.isArray(value)) throw new Error("Pull Request のツールデータが不正です。");
  return value;
}

function newTool(index: number): ToolDraft {
  return {
    key: `new-${index}-${Date.now()}`,
    slug: "",
    displayName: "",
    summary: "",
    repository: "",
    kind: "",
    image: "",
    supportedOs: [],
    tags: [],
    docs: emptyDocs(),
    release: emptyRelease(),
    showInPickup: "",
    priority: "",
  };
}

export default function ToolEditor({ initial, baseRevision }: ToolEditorProps) {
  const initialTools = useMemo(() => normalizeTools(initial), [initial]);
  const [tools, setTools] = useState(initialTools);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selected, setSelected] = useState<PullRequest | null>(null);
  const [revision, setRevision] = useState(baseRevision);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPullRequests, setLoadingPullRequests] = useState(true);
  const [loadingPullRequest, setLoadingPullRequest] = useState(false);
  const [skipInfo, setSkipInfo] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/content/config/pull-requests?kind=tools", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as ApiResponse;
        if (!response.ok) throw new Error(data.error ?? "Pull Request 一覧を取得できませんでした。");
        if (active) setPullRequests(data.pullRequests ?? []);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Pull Request 一覧を取得できませんでした。");
          setMessageIsError(true);
        }
      })
      .finally(() => {
        if (active) setLoadingPullRequests(false);
      });
    return () => { active = false; };
  }, []);

  const errors = useMemo(
    () => new Map(issues.map((issue) => [issueKey(issue.path), issue.message])),
    [issues],
  );
  const fieldError = (index: number, field: string) => errors.get(`tools.${index}.${field}`);
  const errorId = (index: number, field: string) => `tool-${index}-${field.replaceAll(".", "-")}-error`;

  function clearFeedback() {
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  function update(index: number, patch: Partial<ToolDraft>) {
    setTools((current) => current.map((tool, toolIndex) => toolIndex === index ? { ...tool, ...patch } : tool));
    clearFeedback();
  }

  function moveTool(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= tools.length) return;
    setTools((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    clearFeedback();
  }

  function removeTool(index: number) {
    setTools((current) => current.filter((_, toolIndex) => toolIndex !== index));
    clearFeedback();
  }

  function updateArray(index: number, field: "supportedOs" | "tags" | "docs.paths", itemIndex: number, value: string) {
    const tool = tools[index];
    const values = field === "supportedOs" ? tool.supportedOs : field === "tags" ? tool.tags : tool.docs.paths;
    const next = values.map((item, currentIndex) => currentIndex === itemIndex ? value : item);
    update(index, field === "supportedOs"
      ? { supportedOs: next }
      : field === "tags"
        ? { tags: next }
        : { docs: { ...tool.docs, paths: next } });
  }

  function addArrayItem(index: number, field: "supportedOs" | "tags" | "docs.paths") {
    const tool = tools[index];
    update(index, field === "supportedOs"
      ? { supportedOs: [...tool.supportedOs, ""] }
      : field === "tags"
        ? { tags: [...tool.tags, ""] }
        : { docs: { ...tool.docs, paths: [...tool.docs.paths, ""] } });
  }

  function removeArrayItem(index: number, field: "supportedOs" | "tags" | "docs.paths", itemIndex: number) {
    const tool = tools[index];
    const values = field === "supportedOs" ? tool.supportedOs : field === "tags" ? tool.tags : tool.docs.paths;
    const next = values.filter((_, currentIndex) => currentIndex !== itemIndex);
    update(index, field === "supportedOs"
      ? { supportedOs: next }
      : field === "tags"
        ? { tags: next }
        : { docs: { ...tool.docs, paths: next } });
  }

  function moveArrayItem(index: number, field: "supportedOs" | "tags" | "docs.paths", itemIndex: number, direction: -1 | 1) {
    const tool = tools[index];
    const values = field === "supportedOs" ? tool.supportedOs : field === "tags" ? tool.tags : tool.docs.paths;
    const target = itemIndex + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[itemIndex], next[target]] = [next[target], next[itemIndex]];
    update(index, field === "supportedOs"
      ? { supportedOs: next }
      : field === "tags"
        ? { tags: next }
        : { docs: { ...tool.docs, paths: next } });
  }

  function resetToNew() {
    setSelected(null);
    setRevision(baseRevision);
    setTools(initialTools);
    setSkipInfo(false);
    clearFeedback();
  }

  async function loadPullRequest(number: number) {
    if (!number) {
      resetToNew();
      return;
    }
    setLoadingPullRequest(true);
    clearFeedback();
    try {
      const response = await fetch(`/api/content/config/pull-requests/${number}?kind=tools`, { cache: "no-store" });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.pullRequest) throw new Error(data.error ?? "Pull Request を取得できませんでした。");
      setSelected(data.pullRequest);
      setRevision(data.pullRequest.headRevision);
      setTools(normalizeTools(readToolsPayload(data)));
      setSkipInfo(record(data.update).visible === false);
      setIssues((data.issues ?? []).map(withToolsPrefix));
      setMessageIsError(Boolean(data.issues?.length));
      setMessage(data.issues?.length ? "既存の検証エラーを修正して保存してください。" : "Pull Request を読み込みました。");
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
    const serialized = serializeTools(tools);
    const local = toolListSchema.safeParse(serialized);
    if (!local.success) {
      setIssues(local.error.issues.map((issue) => ({
        path: ["tools", ...issue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number")],
        message: issue.message,
      })));
      setMessage("入力内容を確認してください。");
      setMessageIsError(true);
      setSaving(false);
      return;
    }

    const body = selected
      ? { kind: "tools", value: local.data, expectedRevision: revision, changeNote: "ツールを管理画面から更新", skipInfo }
      : { kind: "tools", value: local.data, baseRevision: revision, changeNote: "ツールを管理画面から更新", skipInfo };
    try {
      const response = await fetch(
        selected ? `/api/content/config/pull-requests/${selected.number}?kind=tools` : "/api/content/config",
        { method: selected ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      const data = await response.json() as ApiResponse;
      setIssues((data.issues ?? []).map(withToolsPrefix));
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(data.code === "CONTENT_CONFLICT"
          ? "Pull Request が画面表示後に更新されました。再読込してください。"
          : data.error ?? "保存に失敗しました。");
        return;
      }
      if (data.headRevision) setRevision(data.headRevision);
      setMessage(`${selected ? "Pull Request を更新しました" : "Pull Request を作成しました"}: ${data.pullRequestUrl ?? ""}`);
      setMessageIsError(false);
    } catch {
      setMessage("保存通信に失敗しました。");
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || loadingPullRequest;

  return <div className="tool-editor stack">
    <div className="tool-editor__source">
      <label>編集対象
        <select
          aria-label="編集するPull Request"
          value={selected?.number ?? ""}
          disabled={busy || loadingPullRequests}
          onChange={(event) => void loadPullRequest(Number(event.target.value))}
        >
          <option value="">{loadingPullRequests ? "Pull Request を読込中…" : "main から新しい Pull Request を作成"}</option>
          {pullRequests.map((pullRequest) => <option key={pullRequest.number} value={pullRequest.number}>#{pullRequest.number} {pullRequest.title}</option>)}
        </select>
      </label>
      {selected && <a href={selected.url} target="_blank" rel="noreferrer">選択中の Pull Request を開く</a>}
    </div>

    <form onSubmit={submit} className="stack" aria-busy={busy} noValidate>
      {tools.map((tool, index) => <fieldset key={tool.key} className="tool-editor__card" disabled={busy}>
        <legend>ツール {index + 1}{tool.displayName ? `: ${tool.displayName}` : ""}</legend>
        <div className="tool-editor__grid">
          <Field label="slug" error={fieldError(index, "slug")} errorId={errorId(index, "slug")}>
            <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={tool.slug} onChange={(event) => update(index, { slug: event.target.value })} />
          </Field>
          <Field label="表示名" error={fieldError(index, "displayName")} errorId={errorId(index, "displayName")}>
            <input required value={tool.displayName} onChange={(event) => update(index, { displayName: event.target.value })} />
          </Field>
          <Field wide label="概要" error={fieldError(index, "summary")} errorId={errorId(index, "summary")}>
            <textarea required rows={3} value={tool.summary} onChange={(event) => update(index, { summary: event.target.value })} />
          </Field>
          <Field label="リポジトリ (owner/name)" error={fieldError(index, "repository")} errorId={errorId(index, "repository")}>
            <input required pattern="[\w.-]+/[\w.-]+" value={tool.repository} onChange={(event) => update(index, { repository: event.target.value })} />
          </Field>
          <Field label="種別" error={fieldError(index, "kind")} errorId={errorId(index, "kind")}>
            <select required value={tool.kind} onChange={(event) => update(index, { kind: event.target.value as ToolKind | "" })}>
              <option value="">選択してください</option>
              <option value="windows-app">Windows アプリ</option>
              <option value="library">ライブラリ</option>
            </select>
          </Field>
          <Field wide label="画像 URL / 既存パス（任意）" error={fieldError(index, "image")} errorId={errorId(index, "image")}>
            <input type="text" value={tool.image} onChange={(event) => update(index, { image: event.target.value })} />
          </Field>
          <p className="tool-editor__schema-note tool-editor__wide">
            画像はURLまたは既存パスで指定します。入力欄は保持しますが、現在のpokenae.Content canonical schemaが
            imageを許可していない場合は、Pull Requestを作成せずこの項目にエラーを表示します。
          </p>

          <ArrayField
            label="対応 OS"
            required={tool.kind === "windows-app"}
            values={tool.supportedOs}
            path="supportedOs"
            toolIndex={index}
            fieldError={fieldError}
            errorId={errorId}
            onAdd={() => addArrayItem(index, "supportedOs")}
            onChange={(itemIndex, value) => updateArray(index, "supportedOs", itemIndex, value)}
            onMove={(itemIndex, direction) => moveArrayItem(index, "supportedOs", itemIndex, direction)}
            onRemove={(itemIndex) => removeArrayItem(index, "supportedOs", itemIndex)}
          />
          <ArrayField
            label="タグID"
            values={tool.tags}
            path="tags"
            toolIndex={index}
            fieldError={fieldError}
            errorId={errorId}
            onAdd={() => addArrayItem(index, "tags")}
            onChange={(itemIndex, value) => updateArray(index, "tags", itemIndex, value)}
            onMove={(itemIndex, direction) => moveArrayItem(index, "tags", itemIndex, direction)}
            onRemove={(itemIndex) => removeArrayItem(index, "tags", itemIndex)}
          />

          <fieldset className="tool-editor__group tool-editor__wide">
            <legend>ドキュメント（canonical schemaで必須）</legend>
            <ValidationMessage id={errorId(index, "docs")}>{fieldError(index, "docs")}</ValidationMessage>
            <Field label="README パス" error={fieldError(index, "docs.readme")} errorId={errorId(index, "docs.readme")}>
              <input value={tool.docs.readme} onChange={(event) => update(index, { docs: { ...tool.docs, readme: event.target.value } })} />
            </Field>
            <ArrayField
              label="ドキュメントパス"
              required
              values={tool.docs.paths}
              path="docs.paths"
              toolIndex={index}
              fieldError={fieldError}
              errorId={errorId}
              onAdd={() => addArrayItem(index, "docs.paths")}
              onChange={(itemIndex, value) => updateArray(index, "docs.paths", itemIndex, value)}
              onMove={(itemIndex, direction) => moveArrayItem(index, "docs.paths", itemIndex, direction)}
              onRemove={(itemIndex) => removeArrayItem(index, "docs.paths", itemIndex)}
            />
          </fieldset>

          <fieldset className="tool-editor__group tool-editor__wide">
            <legend>リリース（canonical schemaで必須）</legend>
            <ValidationMessage id={errorId(index, "release")}>{fieldError(index, "release")}</ValidationMessage>
            <div className="tool-editor__grid">
              <Field label="チャンネル" error={fieldError(index, "release.channel")} errorId={errorId(index, "release.channel")}>
                <input value={tool.release.channel} onChange={(event) => update(index, { release: { ...tool.release, channel: event.target.value } })} />
              </Field>
              <Field label="パッケージ" error={fieldError(index, "release.package")} errorId={errorId(index, "release.package")}>
                <input value={tool.release.package} onChange={(event) => update(index, { release: { ...tool.release, package: event.target.value } })} />
              </Field>
              <OptionalBooleanField label="マニフェスト必須" value={tool.release.manifestRequired} error={fieldError(index, "release.manifestRequired")} errorId={errorId(index, "release.manifestRequired")} onChange={(value) => update(index, { release: { ...tool.release, manifestRequired: value } })} />
              <OptionalBooleanField label="未署名インストーラー" value={tool.release.unsignedInstaller} error={fieldError(index, "release.unsignedInstaller")} errorId={errorId(index, "release.unsignedInstaller")} onChange={(value) => update(index, { release: { ...tool.release, unsignedInstaller: value } })} />
            </div>
          </fieldset>

          <OptionalBooleanField label="ピックアップ表示（必須）" value={tool.showInPickup} error={fieldError(index, "showInPickup")} errorId={errorId(index, "showInPickup")} onChange={(value) => update(index, { showInPickup: value })} />
          <Field label="優先度（必須、0〜1000）" error={fieldError(index, "priority")} errorId={errorId(index, "priority")}>
            <input type="number" step="1" value={tool.priority} onChange={(event) => update(index, { priority: event.target.value })} />
          </Field>
        </div>
        <div className="tool-editor__actions">
          <button type="button" className="button-link button-link--secondary" disabled={index === 0} onClick={() => moveTool(index, -1)}>上へ</button>
          <button type="button" className="button-link button-link--secondary" disabled={index === tools.length - 1} onClick={() => moveTool(index, 1)}>下へ</button>
          <button type="button" className="button-link button-link--secondary" onClick={() => removeTool(index)}>削除</button>
        </div>
      </fieldset>)}
      <button type="button" className="button-link button-link--secondary" disabled={busy} onClick={() => {
        setTools((current) => [...current, newTool(current.length)]);
        clearFeedback();
      }}>ツールを追加</button>
      <label className="tool-editor__check">
        <input type="checkbox" checked={skipInfo} disabled={busy} onChange={(event) => { setSkipInfo(event.target.checked); clearFeedback(); }} />
        INFOに表示しない
      </label>
      <button type="submit" className="button-link" disabled={busy}>{saving ? "保存中…" : loadingPullRequest ? "読込中…" : selected ? "同じ Pull Request を更新" : "Pull Request を作成"}</button>
      {message && <p role={messageIsError ? "alert" : "status"} className={messageIsError ? "notice notice--error" : "notice"}>{message}</p>}
    </form>

    <style>{`
      .tool-editor__source { display:flex; flex-wrap:wrap; gap:1rem; align-items:end; }
      .tool-editor__source label { display:grid; gap:.35rem; flex:1 1 320px; font-weight:700; }
      .tool-editor input,.tool-editor select,.tool-editor textarea { width:100%; min-height:44px; padding:.55rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
      .tool-editor textarea { resize:vertical; }
      .tool-editor .tool-editor__check { display:flex; align-items:center; gap:.5rem; font-weight:700; }
      .tool-editor .tool-editor__check input { width:auto; min-height:0; }
      .tool-editor__card,.tool-editor__group { display:grid; gap:1rem; padding:1rem; border:1px solid var(--color-base-70); border-radius:.35rem; background:#fff; }
      .tool-editor__card > legend,.tool-editor__group > legend { padding:0 .4rem; font-weight:700; }
      .tool-editor__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
      .tool-editor__field { display:grid; align-content:start; gap:.3rem; font-weight:700; }
      .tool-editor__wide { grid-column:1/-1; }
      .tool-editor__schema-note { margin:0; color:var(--color-base-30-dark); font-size:.9rem; }
      .tool-editor__array { display:grid; gap:.6rem; }
      .tool-editor__array-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:.5rem; align-items:start; }
      .tool-editor__array-actions,.tool-editor__actions { display:flex; flex-wrap:wrap; gap:.5rem; }
      .tool-editor__array-actions .button-link { min-height:44px; padding:.45rem .7rem; }
      .tool-editor .validation-message { color:#751b16; font-size:.9rem; font-weight:400; }
      @media(max-width:760px){.tool-editor__grid{grid-template-columns:1fr}.tool-editor__wide{grid-column:auto}.tool-editor__array-row{grid-template-columns:1fr}}
    `}</style>
  </div>;
}

type FieldProps = {
  label: string;
  error?: string;
  errorId: string;
  wide?: boolean;
  children: ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>;
};

function Field({ label, error, errorId, wide, children }: FieldProps) {
  return <label className={`tool-editor__field${wide ? " tool-editor__wide" : ""}`}>
    {label}
    {cloneElement(children, { "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined })}
    <ValidationMessage id={errorId}>{error}</ValidationMessage>
  </label>;
}

type OptionalBooleanFieldProps = {
  label: string;
  value: OptionalBoolean;
  error?: string;
  errorId: string;
  onChange: (value: OptionalBoolean) => void;
};

function OptionalBooleanField({ label, value, error, errorId, onChange }: OptionalBooleanFieldProps) {
  return <Field label={label} error={error} errorId={errorId}>
    <select value={value} onChange={(event) => onChange(event.target.value as OptionalBoolean)}>
      <option value="">未設定</option>
      <option value="true">はい</option>
      <option value="false">いいえ</option>
    </select>
  </Field>;
}

type ArrayFieldProps = {
  label: string;
  required?: boolean;
  values: string[];
  path: "supportedOs" | "tags" | "docs.paths";
  toolIndex: number;
  fieldError: (index: number, field: string) => string | undefined;
  errorId: (index: number, field: string) => string;
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
};

function ArrayField({ label, required, values, path, toolIndex, fieldError, errorId, onAdd, onChange, onMove, onRemove }: ArrayFieldProps) {
  return <fieldset className="tool-editor__group tool-editor__wide">
    <legend>{label}（{required ? "必須" : "任意"}）</legend>
    <div className="tool-editor__array">
      {values.map((value, index) => {
        const field = `${path}.${index}`;
        const error = fieldError(toolIndex, field);
        const id = errorId(toolIndex, field);
        return <div className="tool-editor__array-row" key={`${path}-${index}`}>
          <Field label={`${label} ${index + 1}`} error={error} errorId={id}>
            <input value={value} onChange={(event) => onChange(index, event.target.value)} />
          </Field>
          <div className="tool-editor__array-actions" aria-label={`${label} ${index + 1} の操作`}>
            <button type="button" className="button-link button-link--secondary" disabled={index === 0} onClick={() => onMove(index, -1)}>上へ</button>
            <button type="button" className="button-link button-link--secondary" disabled={index === values.length - 1} onClick={() => onMove(index, 1)}>下へ</button>
            <button type="button" className="button-link button-link--secondary" onClick={() => onRemove(index)}>削除</button>
          </div>
        </div>;
      })}
      <button type="button" className="button-link button-link--secondary" onClick={onAdd}>{label}を追加</button>
      <ValidationMessage id={errorId(toolIndex, path)}>{fieldError(toolIndex, path)}</ValidationMessage>
    </div>
  </fieldset>;
}
