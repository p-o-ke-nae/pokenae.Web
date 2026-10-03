"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ValidationMessage from "../../molecules/ValidationMessage";
import ContentItemGrid from "../ContentItemGrid";
import { bannerListSchema } from "../../../lib/content/schemas";
import type { ValidationIssue } from "../../../lib/content/canonical-validation";
import { collectInvalidIndexes, formatGridDateTime } from "../../../lib/content/admin-grid";

type BannerDraft = {
  key: string;
  id: string;
  image: string;
  alt: string;
  href: string;
  order: number;
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

type BannerEditorProps = {
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

export function normalizeBanners(value: unknown): BannerDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((banner, index) => {
    const source = typeof banner === "object" && banner !== null ? banner as Record<string, unknown> : {};
    return {
      key: `${String(source.id ?? "banner")}-${index}`,
      id: typeof source.id === "string" ? source.id : "",
      image: typeof source.image === "string" ? source.image : "",
      alt: typeof source.alt === "string" ? source.alt : "",
      href: typeof source.href === "string" ? source.href : "",
      order: typeof source.order === "number" ? source.order : index,
      startsAt: toLocalDateTime(source.startsAt),
      endsAt: toLocalDateTime(source.endsAt),
    };
  });
}

export function serializeBanners(banners: BannerDraft[]) {
  return banners.map((banner) => ({
    id: banner.id,
    image: banner.image,
    alt: banner.alt,
    href: banner.href,
    order: banner.order,
    startsAt: banner.startsAt ? new Date(banner.startsAt).toISOString() : "",
    endsAt: banner.endsAt ? new Date(banner.endsAt).toISOString() : null,
  }));
}

function issueKey(path: Array<string | number>) {
  return path.join(".");
}

export default function BannerEditor({ initial, baseRevision }: BannerEditorProps) {
  const initialBanners = useMemo(() => normalizeBanners(initial), [initial]);
  const [banners, setBanners] = useState(initialBanners);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selected, setSelected] = useState<PullRequest | null>(null);
  const [revision, setRevision] = useState(baseRevision);
  const [uploads, setUploads] = useState<Record<string, File>>({});
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPullRequest, setLoadingPullRequest] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/content/config/pull-requests?kind=banners", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { pullRequests?: PullRequest[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Pull Request 一覧を取得できませんでした。");
        if (active) setPullRequests(data.pullRequests ?? []);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Pull Request 一覧を取得できませんでした。");
          setMessageIsError(true);
        }
      });
    return () => { active = false; };
  }, []);

  const errors = useMemo(() => new Map(issues.map((issue) => [issueKey(issue.path), issue.message])), [issues]);
  const invalidIndexes = useMemo(() => collectInvalidIndexes(issues, "banners"), [issues]);
  const fieldError = (index: number, field: keyof BannerDraft) => errors.get(`banners.${index}.${field}`);
  const errorId = (index: number, field: keyof BannerDraft) => `banner-${index}-${field}-error`;

  function update(index: number, patch: Partial<BannerDraft>) {
    setBanners((current) => current.map((banner, bannerIndex) => bannerIndex === index ? { ...banner, ...patch } : banner));
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    setBanners((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((banner, order) => ({ ...banner, order }));
    });
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  function remove(index: number) {
    setBanners((current) => current
      .filter((_, itemIndex) => itemIndex !== index)
      .map((banner, order) => ({ ...banner, order })));
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  function add() {
    setBanners((current) => [...current, {
      key: `new-${current.length}-${Date.now()}`,
      id: "",
      image: "",
      alt: "",
      href: "/",
      order: current.length,
      startsAt: "",
      endsAt: "",
    }]);
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  function resetToNew() {
    setSelected(null);
    setRevision(baseRevision);
    setBanners(initialBanners);
    setUploads({});
    setIssues([]);
    setMessage("");
    setMessageIsError(false);
  }

  async function loadPullRequest(number: number) {
    if (!number) return resetToNew();
    setLoadingPullRequest(true);
    setMessage("");
    setMessageIsError(false);
    try {
      const response = await fetch(`/api/content/config/pull-requests/${number}?kind=banners`, { cache: "no-store" });
      const data = await response.json() as { pullRequest?: PullRequest; banners?: unknown; issues?: ValidationIssue[]; error?: string };
      if (!response.ok || !data.pullRequest) throw new Error(data.error ?? "Pull Request を取得できませんでした。");
      setSelected(data.pullRequest);
      setRevision(data.pullRequest.headRevision);
      setBanners(normalizeBanners(data.banners));
      setUploads({});
      setIssues(data.issues ?? []);
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
    setMessage("");
    setMessageIsError(false);
    const serialized = serializeBanners(banners);
    const validationPayload = serialized.map((banner, index) => (
      uploads[banners[index].key] && !banner.image ? { ...banner, image: "./images/upload.webp" } : banner
    ));
    const local = bannerListSchema.safeParse(validationPayload);
    if (!local.success) {
      setIssues(local.error.issues.map((issue) => ({
        path: ["banners", ...issue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number")],
        message: issue.message,
      })));
      setMessage("入力内容を確認してください。");
      setMessageIsError(true);
      setSaving(false);
      return;
    }
    const form = new FormData();
    form.set("changeNote", "バナーを管理画面から更新");
    if (selected) {
      form.set("banners", JSON.stringify(serialized));
      form.set("expectedRevision", revision);
    } else {
      form.set("kind", "banners");
      form.set("value", JSON.stringify(serialized));
      form.set("baseRevision", revision);
    }
    banners.forEach((banner) => {
      const upload = uploads[banner.key];
      if (upload) form.append(`image:${banner.id}`, upload);
    });
    try {
      const response = await fetch(
        selected ? `/api/content/config/pull-requests/${selected.number}?kind=banners` : "/api/content/config",
        { method: selected ? "PUT" : "POST", body: form },
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
          : data.error ?? "保存に失敗しました。");
        return;
      }
      if (data.headRevision) setRevision(data.headRevision);
      setUploads({});
      setMessageIsError(false);
      setMessage(`${selected ? "Pull Request を更新しました" : "Pull Request を作成しました"}: ${data.pullRequestUrl}`);
    } catch {
      setMessage("保存通信に失敗しました。");
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return <div className="banner-editor stack">
    <div className="banner-editor__source">
      <label>編集対象
        <select
          aria-label="編集するPull Request"
          value={selected?.number ?? ""}
          disabled={loadingPullRequest || saving}
          onChange={(event) => void loadPullRequest(Number(event.target.value))}
        >
          <option value="">main から新しい Pull Request を作成</option>
          {pullRequests.map((pullRequest) => <option key={pullRequest.number} value={pullRequest.number}>#{pullRequest.number} {pullRequest.title}</option>)}
        </select>
      </label>
      {selected && <a href={selected.url} target="_blank" rel="noreferrer">選択中の Pull Request を開く</a>}
    </div>
    <ContentItemGrid
      title="バナー一覧"
      itemLabel="バナー"
      rows={banners.map((banner) => ({
        key: banner.key,
        id: banner.id,
        alt: banner.alt,
        startsAt: formatGridDateTime(banner.startsAt),
        endsAt: formatGridDateTime(banner.endsAt),
      }))}
      columns={[
        { key: "id", header: "ID", width: "9rem" },
        { key: "alt", header: "代替テキスト", width: "14rem" },
        { key: "startsAt", header: "開始日時", width: "9.5rem" },
        { key: "endsAt", header: "終了日時", width: "9.5rem" },
      ]}
      invalidIndexes={invalidIndexes}
      disabled={saving || loadingPullRequest}
      onAdd={add}
      onMove={move}
      onRemove={remove}
      getDialogTitle={(index) => `バナー ${index + 1}${banners[index]?.id ? `: ${banners[index].id}` : ""}`}
      renderEditor={(index) => {
        const banner = banners[index];
        return <div className="banner-editor__card">
        <div className="banner-editor__grid">
          <label>ID<input required pattern="[a-z0-9-]+" value={banner.id} aria-invalid={Boolean(fieldError(index, "id"))} aria-describedby={fieldError(index, "id") ? errorId(index, "id") : undefined} onChange={(event) => update(index, { id: event.target.value })} /><ValidationMessage id={errorId(index, "id")}>{fieldError(index, "id")}</ValidationMessage></label>
          <label>表示順<input required min={0} type="number" value={banner.order} aria-invalid={Boolean(fieldError(index, "order"))} aria-describedby={fieldError(index, "order") ? errorId(index, "order") : undefined} onChange={(event) => update(index, { order: Number(event.target.value) })} /><ValidationMessage id={errorId(index, "order")}>{fieldError(index, "order")}</ValidationMessage></label>
          <label className="banner-editor__wide">代替テキスト<input required value={banner.alt} aria-invalid={Boolean(fieldError(index, "alt"))} aria-describedby={fieldError(index, "alt") ? errorId(index, "alt") : undefined} onChange={(event) => update(index, { alt: event.target.value })} /><ValidationMessage id={errorId(index, "alt")}>{fieldError(index, "alt")}</ValidationMessage></label>
          <label className="banner-editor__wide">リンク先<input required value={banner.href} aria-invalid={Boolean(fieldError(index, "href"))} aria-describedby={fieldError(index, "href") ? errorId(index, "href") : undefined} onChange={(event) => update(index, { href: event.target.value })} /><ValidationMessage id={errorId(index, "href")}>{fieldError(index, "href")}</ValidationMessage></label>
          <label>開始日時<input required type="datetime-local" value={banner.startsAt} aria-invalid={Boolean(fieldError(index, "startsAt"))} aria-describedby={fieldError(index, "startsAt") ? errorId(index, "startsAt") : undefined} onChange={(event) => update(index, { startsAt: event.target.value })} /><ValidationMessage id={errorId(index, "startsAt")}>{fieldError(index, "startsAt")}</ValidationMessage></label>
          <label>終了日時（任意）<input type="datetime-local" value={banner.endsAt} aria-invalid={Boolean(fieldError(index, "endsAt"))} aria-describedby={fieldError(index, "endsAt") ? errorId(index, "endsAt") : undefined} onChange={(event) => update(index, { endsAt: event.target.value })} /><ValidationMessage id={errorId(index, "endsAt")}>{fieldError(index, "endsAt")}</ValidationMessage></label>
          <label className="banner-editor__wide">画像パス<input required value={banner.image} aria-invalid={Boolean(fieldError(index, "image"))} aria-describedby={fieldError(index, "image") ? errorId(index, "image") : undefined} onChange={(event) => update(index, { image: event.target.value })} /><ValidationMessage id={errorId(index, "image")}>{fieldError(index, "image")}</ValidationMessage></label>
          <label className="banner-editor__wide">画像を置換（PNG/JPEG/WebP・5MB以下）
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setUploads((current) => ({ ...current, [banner.key]: file }));
            }} />
            {uploads[banner.key] ? <span className="banner-editor__upload">置換予定: {uploads[banner.key].name}</span> : null}
          </label>
        </div>
      </div>;
      }}
    />
    <form onSubmit={submit} className="stack" noValidate>
      <button type="submit" className="button-link" disabled={saving || loadingPullRequest}>{saving ? "保存中…" : selected ? "同じ Pull Request を更新" : "Pull Request を作成"}</button>
      {message && <p role={messageIsError ? "alert" : "status"} className={messageIsError ? "notice notice--error" : "notice"}>{message}</p>}
    </form>
    <style>{`
      .banner-editor__source { display:flex; flex-wrap:wrap; gap:1rem; align-items:end; }
      .banner-editor__source label { display:grid; gap:.35rem; flex:1 1 320px; font-weight:700; }
      .banner-editor select,.banner-editor input { width:100%; min-height:44px; padding:.55rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
      .banner-editor__card { display:grid; gap:1rem; min-width:0; }
      .banner-editor__upload { font-weight:400; font-size:.9rem; }
      .banner-editor__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
      .banner-editor__grid label { display:grid; align-content:start; gap:.3rem; font-weight:700; }
      .banner-editor__wide { grid-column:1/-1; }
      .validation-message { color:#751b16; font-size:.9rem; font-weight:400; }
      @media(max-width:760px){.banner-editor__grid{grid-template-columns:1fr}.banner-editor__wide{grid-column:auto}}
    `}</style>
  </div>;
}
