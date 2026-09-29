"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import ValidationMessage from "../../molecules/ValidationMessage";
import ContentItemGrid from "../ContentItemGrid";
import { collectInvalidIndexes, formatGridDateTime } from "../../../lib/content/admin-grid";
import { announcementContentSchema } from "../../../lib/content/schemas";
import type { ValidationIssue } from "../../../lib/content/canonical-validation";

const announcementListSchema = announcementContentSchema.array().superRefine((announcements, context) => {
  const ids = new Set<string>();
  announcements.forEach((announcement, index) => {
    if (ids.has(announcement.id)) {
      context.addIssue({ code: "custom", path: [index, "id"], message: "id は重複できません。" });
    }
    ids.add(announcement.id);
    if (announcement.endsAt && Date.parse(announcement.endsAt) < Date.parse(announcement.startsAt)) {
      context.addIssue({ code: "custom", path: [index, "endsAt"], message: "終了日時は開始日時以降にしてください。" });
    }
  });
});

export type AnnouncementDraft = {
  key: string;
  id: string;
  text: string;
  href: string;
  variant: "normal" | "emphasis" | "urgent";
  startsAt: string;
  endsAt: string;
};

type PullRequest = {
  number: number;
  title: string;
  url: string;
  branch: string;
  headRevision: string;
};

type AnnouncementEditorProps = {
  initial: unknown;
  baseRevision: string;
};

function toLocalDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toISOString();
}

export function normalizeAnnouncements(value: unknown): AnnouncementDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((announcement, index) => {
    const source = typeof announcement === "object" && announcement !== null
      ? announcement as Record<string, unknown>
      : {};
    const variant = source.variant;
    return {
      key: `${String(source.id ?? "announcement")}-${index}`,
      id: typeof source.id === "string" ? source.id : "",
      text: typeof source.text === "string" ? source.text : "",
      href: typeof source.href === "string" ? source.href : "",
      variant: variant === "emphasis" || variant === "urgent" ? variant : "normal",
      startsAt: toLocalDateTime(source.startsAt),
      endsAt: toLocalDateTime(source.endsAt),
    };
  });
}

export function serializeAnnouncements(announcements: AnnouncementDraft[]) {
  return announcements.map(({ id, text, href, variant, startsAt, endsAt }) => ({
    id,
    text,
    href,
    variant,
    startsAt: toIsoDateTime(startsAt),
    endsAt: endsAt ? toIsoDateTime(endsAt) : null,
  }));
}

const variantLabels: Record<AnnouncementDraft["variant"], string> = {
  normal: "通常",
  emphasis: "強調",
  urgent: "緊急",
};

function issueKey(path: Array<string | number>) {
  return path.join(".");
}

function responseMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AnnouncementEditor({ initial, baseRevision }: AnnouncementEditorProps) {
  const initialAnnouncements = useMemo(() => normalizeAnnouncements(initial), [initial]);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
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
    fetch("/api/content/config/pull-requests?kind=announcements", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { pullRequests?: PullRequest[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Pull Request 一覧を取得できませんでした。");
        if (active) setPullRequests(data.pullRequests ?? []);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(responseMessage(error, "Pull Request 一覧を取得できませんでした。"));
          setMessageIsError(true);
        }
      })
      .finally(() => {
        if (active) setLoadingList(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const errors = useMemo(
    () => new Map(issues.map((issue) => [issueKey(issue.path), issue.message])),
    [issues],
  );
  const invalidIndexes = useMemo(() => collectInvalidIndexes(issues, "announcements"), [issues]);
  const fieldError = (index: number, field: keyof AnnouncementDraft) =>
    errors.get(`announcements.${index}.${field}`) ?? errors.get(`${index}.${field}`);
  const errorId = (index: number, field: keyof AnnouncementDraft) =>
    `announcement-${index}-${field}-error`;
  const busy = saving || loadingPullRequest;

  function clearFeedback() {
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  function update(index: number, patch: Partial<AnnouncementDraft>) {
    setAnnouncements((current) => current.map((announcement, itemIndex) =>
      itemIndex === index ? { ...announcement, ...patch } : announcement));
    clearFeedback();
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= announcements.length) return;
    setAnnouncements((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    clearFeedback();
  }

  function remove(index: number) {
    setAnnouncements((current) => current.filter((_, itemIndex) => itemIndex !== index));
    clearFeedback();
  }

  function add() {
    setAnnouncements((current) => [...current, {
      key: `new-${current.length}-${Date.now()}`,
      id: "",
      text: "",
      href: "/",
      variant: "normal",
      startsAt: "",
      endsAt: "",
    }]);
    clearFeedback();
  }

  function resetToNew() {
    setSelected(null);
    setRevision(baseRevision);
    setAnnouncements(initialAnnouncements);
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
      const response = await fetch(
        `/api/content/config/pull-requests/${number}?kind=announcements`,
        { cache: "no-store" },
      );
      const data = await response.json() as {
        pullRequest?: PullRequest;
        announcements?: unknown;
        value?: unknown;
        issues?: ValidationIssue[];
        error?: string;
      };
      if (!response.ok || !data.pullRequest) {
        throw new Error(data.error ?? "Pull Request を取得できませんでした。");
      }
      setSelected(data.pullRequest);
      setRevision(data.pullRequest.headRevision);
      setAnnouncements(normalizeAnnouncements(data.announcements ?? data.value));
      setIssues(data.issues ?? []);
      setMessageIsError(Boolean(data.issues?.length));
      setMessage(data.issues?.length
        ? "既存の検証エラーを修正して保存してください。"
        : "Pull Request を読み込みました。");
    } catch (error) {
      setMessage(responseMessage(error, "Pull Request を取得できませんでした。"));
      setMessageIsError(true);
    } finally {
      setLoadingPullRequest(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    clearFeedback();
    const serialized = serializeAnnouncements(announcements);
    const local = announcementListSchema.safeParse(serialized);
    if (!local.success) {
      setIssues(local.error.issues.map((issue) => ({
        path: [
          "announcements",
          ...issue.path.filter((part): part is string | number =>
            typeof part === "string" || typeof part === "number"),
        ],
        message: issue.message,
      })));
      setMessage("入力内容を確認してください。");
      setMessageIsError(true);
      setSaving(false);
      return;
    }

    const payload = selected
      ? {
          kind: "announcements" as const,
          value: serialized,
          expectedRevision: revision,
          changeNote: "ニュースを管理画面から更新",
        }
      : {
          kind: "announcements" as const,
          value: serialized,
          baseRevision: revision,
          changeNote: "ニュースを管理画面から更新",
        };
    try {
      const response = await fetch(
        selected
          ? `/api/content/config/pull-requests/${selected.number}?kind=announcements`
          : "/api/content/config",
        {
          method: selected ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json() as {
        code?: string;
        error?: string;
        issues?: ValidationIssue[];
        pullRequestUrl?: string;
        headRevision?: string;
      };
      setIssues(data.issues ?? []);
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(data.code === "CONTENT_CONFLICT"
          ? "Pull Request が画面表示後に更新されました。再読込してください。"
          : data.code === "CONTENT_WRITE_DISABLED"
            ? data.error ?? "fixture モードでは保存できません。"
            : data.error ?? "保存に失敗しました。");
        return;
      }
      if (data.headRevision) setRevision(data.headRevision);
      setMessageIsError(false);
      const successMessage = selected ? "Pull Request を更新しました" : "Pull Request を作成しました";
      setMessage(data.pullRequestUrl ? `${successMessage}: ${data.pullRequestUrl}` : successMessage);
    } catch {
      setMessage("保存通信に失敗しました。");
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return <div className="announcement-editor stack">
    <div className="announcement-editor__source">
      <label>編集対象
        <select
          aria-label="編集するニュースのPull Request"
          value={selected?.number ?? ""}
          disabled={loadingList || busy}
          onChange={(event) => void loadPullRequest(Number(event.target.value))}
        >
          <option value="">
            {loadingList ? "Pull Request 一覧を読込中…" : "main から新しい Pull Request を作成"}
          </option>
          {pullRequests.map((pullRequest) =>
            <option key={pullRequest.number} value={pullRequest.number}>
              #{pullRequest.number} {pullRequest.title}
            </option>)}
        </select>
      </label>
      {selected &&
        <a href={selected.url} target="_blank" rel="noreferrer">選択中の Pull Request を開く</a>}
    </div>

    <ContentItemGrid
      title="ニュース一覧"
      itemLabel="ニュース"
      rows={announcements.map((announcement) => ({
        key: announcement.key,
        id: announcement.id,
        text: announcement.text,
        variant: variantLabels[announcement.variant],
        startsAt: formatGridDateTime(announcement.startsAt),
        endsAt: formatGridDateTime(announcement.endsAt),
      }))}
      columns={[
        { key: "id", header: "ID", width: "9rem" },
        { key: "text", header: "本文", width: "16rem" },
        { key: "variant", header: "種別", width: "4.5rem" },
        { key: "startsAt", header: "開始日時", width: "9.5rem" },
        { key: "endsAt", header: "終了日時", width: "9.5rem" },
      ]}
      invalidIndexes={invalidIndexes}
      disabled={busy}
      onAdd={add}
      onMove={move}
      onRemove={remove}
      renderEditor={(index) => {
        const announcement = announcements[index];
        return <fieldset className="announcement-editor__card" disabled={busy}>
          <div className="announcement-editor__grid">
            <label>
              ID
              <input
                required
                pattern="[a-z0-9-]+"
                value={announcement.id}
                aria-invalid={Boolean(fieldError(index, "id"))}
                aria-describedby={fieldError(index, "id") ? errorId(index, "id") : undefined}
                onChange={(event) => update(index, { id: event.target.value })}
              />
              <ValidationMessage id={errorId(index, "id")}>{fieldError(index, "id")}</ValidationMessage>
            </label>
            <label>
              表示種別
              <select
                value={announcement.variant}
                aria-invalid={Boolean(fieldError(index, "variant"))}
                aria-describedby={fieldError(index, "variant") ? errorId(index, "variant") : undefined}
                onChange={(event) => update(index, {
                  variant: event.target.value as AnnouncementDraft["variant"],
                })}
              >
                <option value="normal">通常</option>
                <option value="emphasis">強調</option>
                <option value="urgent">緊急</option>
              </select>
              <ValidationMessage id={errorId(index, "variant")}>{fieldError(index, "variant")}</ValidationMessage>
            </label>
            <label className="announcement-editor__wide">
              本文
              <input
                required
                value={announcement.text}
                aria-invalid={Boolean(fieldError(index, "text"))}
                aria-describedby={fieldError(index, "text") ? errorId(index, "text") : undefined}
                onChange={(event) => update(index, { text: event.target.value })}
              />
              <ValidationMessage id={errorId(index, "text")}>{fieldError(index, "text")}</ValidationMessage>
            </label>
            <label className="announcement-editor__wide">
              リンク先
              <input
                value={announcement.href}
                aria-invalid={Boolean(fieldError(index, "href"))}
                aria-describedby={fieldError(index, "href") ? errorId(index, "href") : undefined}
                onChange={(event) => update(index, { href: event.target.value })}
              />
              <ValidationMessage id={errorId(index, "href")}>{fieldError(index, "href")}</ValidationMessage>
            </label>
            <label>
              開始日時
              <input
                required
                type="datetime-local"
                value={announcement.startsAt}
                aria-invalid={Boolean(fieldError(index, "startsAt"))}
                aria-describedby={fieldError(index, "startsAt") ? errorId(index, "startsAt") : undefined}
                onChange={(event) => update(index, { startsAt: event.target.value })}
              />
              <ValidationMessage id={errorId(index, "startsAt")}>{fieldError(index, "startsAt")}</ValidationMessage>
            </label>
            <label>
              終了日時（任意）
              <input
                type="datetime-local"
                value={announcement.endsAt}
                aria-invalid={Boolean(fieldError(index, "endsAt"))}
                aria-describedby={fieldError(index, "endsAt") ? errorId(index, "endsAt") : undefined}
                onChange={(event) => update(index, { endsAt: event.target.value })}
              />
              <ValidationMessage id={errorId(index, "endsAt")}>{fieldError(index, "endsAt")}</ValidationMessage>
            </label>
          </div>
        </fieldset>;
      }}
    />

    <form onSubmit={submit} className="stack" noValidate aria-busy={busy || loadingList}>
      <button type="submit" className="button-link" disabled={busy || loadingList}>
        {saving ? "保存中…" : loadingPullRequest ? "読込中…" : selected ? "同じ Pull Request を更新" : "Pull Request を作成"}
      </button>
      {(loadingList || loadingPullRequest || saving) &&
        <p role="status" aria-live="polite" className="notice">
          {saving
            ? "ニュースを保存しています。"
            : loadingPullRequest
              ? "Pull Request を読み込んでいます。"
              : "Pull Request 一覧を読み込んでいます。"}
        </p>}
      {message &&
        <p
          role={messageIsError ? "alert" : "status"}
          aria-live="polite"
          className={messageIsError ? "notice notice--error" : "notice"}
        >
          {message}
        </p>}
    </form>

    <style>{`
      .announcement-editor__source { display:flex; flex-wrap:wrap; gap:1rem; align-items:end; }
      .announcement-editor__source label { display:grid; gap:.35rem; flex:1 1 320px; font-weight:700; }
      .announcement-editor select,.announcement-editor input { width:100%; min-height:44px; padding:.55rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
      .announcement-editor__card { display:grid; gap:1rem; padding:1rem; border:1px solid var(--color-base-70); border-radius:.35rem; background:#fff; }
      .announcement-editor__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
      .announcement-editor__grid label { display:grid; align-content:start; gap:.3rem; font-weight:700; }
      .announcement-editor__wide { grid-column:1/-1; }
      .announcement-editor .validation-message { color:#751b16; font-size:.9rem; font-weight:400; }
      @media(max-width:760px){.announcement-editor__grid{grid-template-columns:1fr}.announcement-editor__wide{grid-column:auto}}
    `}</style>
  </div>;
}
