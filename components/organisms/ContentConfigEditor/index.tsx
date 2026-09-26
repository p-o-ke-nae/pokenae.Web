'use client';

import { FormEvent, useState } from "react";

export default function ContentConfigEditor({ kind, initial, baseRevision }: { kind: "banners" | "announcements" | "tools"; initial: unknown; baseRevision: string }) {
  const [json, setJson] = useState(JSON.stringify(initial, null, 2));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/content/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, value: JSON.parse(json), baseRevision, changeNote: `${kind}を管理画面から更新` }) });
      const data = await response.json() as { code?: string; error?: string; pullRequestUrl?: string };
      setMessage(response.ok
        ? `Pull Request: ${data.pullRequestUrl}`
        : data.code === "CONTENT_CONFLICT"
          ? "公開コンテンツが画面表示後に更新されました。ページを再読込してから編集し直してください。"
          : data.error ?? "保存に失敗しました。");
    } catch { setMessage("JSON構文を確認してください。"); }
    setSaving(false);
  }
  return <form onSubmit={submit} className="stack"><textarea aria-label={`${kind} JSON`} value={json} onChange={(event) => setJson(event.target.value)} style={{ minHeight: 320, width: "100%", fontFamily: "monospace", padding: ".75rem" }} /><button type="submit" disabled={saving} className="button-link">{saving ? "作成中…" : "PRを作成"}</button>{message && <p role="status" className="notice">{message}</p>}</form>;
}
