"use client";

import { type ReactNode, useId, useMemo, useState } from "react";
import CustomButton from "@/components/atoms/CustomButton";
import Dialog, { DialogFooterLayout } from "@/components/molecules/Dialog";
import type { TagDefinition } from "@/lib/content/types";

type TagPickerProps = {
  tags: TagDefinition[];
  selectedIds: string[];
  /** 新規タグを追加したときの一覧更新。未指定時は新規タグ作成欄を表示しない */
  onTagsChange?: (tags: TagDefinition[]) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  legend?: string;
  disabled?: boolean;
  /** 新規タグを作成できない画面で表示する案内 */
  createHint?: ReactNode;
};

export default function TagPicker({
  tags,
  selectedIds,
  onTagsChange,
  onSelectedIdsChange,
  legend = "タグ",
  disabled = false,
  createHint,
}: TagPickerProps) {
  const idPrefix = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");
  const labels = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.label])), [tags]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ja-JP");
    return tags.filter((tag) => !needle
      || tag.id.toLocaleLowerCase("ja-JP").includes(needle)
      || tag.label.toLocaleLowerCase("ja-JP").includes(needle));
  }, [query, tags]);

  function toggle(id: string) {
    onSelectedIdsChange(selectedIds.includes(id)
      ? selectedIds.filter((selected) => selected !== id)
      : [...selectedIds, id]);
  }

  function addNewTag() {
    if (!onTagsChange) return;
    const label = newLabel.trim();
    if (!label) {
      setError("表示名を入力してください。");
      return;
    }
    const temporaryId = `new-${crypto.randomUUID()}`;
    const nextTag = { id: temporaryId, label };
    onTagsChange([...tags, nextTag]);
    onSelectedIdsChange([...selectedIds, temporaryId]);
    setNewLabel("");
    setError("");
  }

  return (
    <fieldset className="tag-picker" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="tag-picker__selected">
        {selectedIds.length
          ? selectedIds.map((id) => (
              <span className="tag-picker__chip" key={id}>
                <span>{labels.get(id) ?? id}</span>
                <button type="button" aria-label={`${labels.get(id) ?? id}を外す`} onClick={() => toggle(id)}>×</button>
              </span>
            ))
          : <span className="tag-picker__empty">タグは選択されていません。</span>}
      </div>
      <CustomButton type="button" variant="neutral" disabled={disabled} onClick={() => setOpen(true)}>
        {onTagsChange ? "タグを検索・追加" : "タグを検索・選択"}
      </CustomButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={onTagsChange ? "タグを検索・追加" : "タグを検索・選択"}
        size="md"
        footer={<DialogFooterLayout trailing={<CustomButton type="button" variant="accent" onClick={() => setOpen(false)}>完了</CustomButton>} />}
      >
        <div className="tag-picker__dialog">
          <label>
            既存タグを検索
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="表示名または tag ID"
              autoFocus
            />
          </label>
          <div className="tag-picker__options" role="group" aria-label="既存タグ">
            {filtered.length ? filtered.map((tag) => (
              <label className="tag-picker__option" key={tag.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(tag.id)}
                  onChange={() => toggle(tag.id)}
                />
                <span><strong>{tag.label}</strong><small>{tag.id}</small></span>
              </label>
            )) : <p>該当するタグはありません。</p>}
          </div>
          {onTagsChange ? <section className="tag-picker__new" aria-labelledby={`${idPrefix}-new-tag-title`}>
            <h3 id={`${idPrefix}-new-tag-title`}>新規タグ</h3>
            <label>表示名<input value={newLabel} placeholder="第7世代" onChange={(event) => setNewLabel(event.target.value)} /></label>
            <p>IDは保存時に自動採番されます。</p>
            <CustomButton type="button" variant="neutral" onClick={addNewTag}>新規タグを追加</CustomButton>
            {error ? <p className="tag-picker__error" role="alert">{error}</p> : null}
          </section> : createHint ? <div className="tag-picker__new">{createHint}</div> : null}
        </div>
      </Dialog>
      <style jsx>{`
        .tag-picker { display:grid; gap:.75rem; border:0; padding:0; margin:0; }
        .tag-picker legend { margin-bottom:.5rem; font-weight:700; }
        .tag-picker__selected { display:flex; flex-wrap:wrap; gap:.5rem; min-height:2rem; }
        .tag-picker__chip { display:inline-flex; align-items:center; gap:.35rem; padding:.3rem .5rem; border:1px solid var(--color-base-70); border-radius:.5rem; }
        .tag-picker__chip button { min-width:2rem; min-height:2rem; border:0; background:transparent; color:inherit; cursor:pointer; }
        .tag-picker__empty { color:var(--color-base-70-dark); }
        .tag-picker__dialog,.tag-picker__new { display:grid; gap:1rem; }
        .tag-picker__dialog label,.tag-picker__new label { display:grid; gap:.35rem; font-weight:700; }
        .tag-picker__dialog input:not([type="checkbox"]) { width:100%; min-height:44px; padding:.55rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
        .tag-picker__options { display:grid; gap:.35rem; max-height:16rem; overflow:auto; }
        .tag-picker__option { display:flex!important; grid-template-columns:none!important; align-items:center; gap:.75rem!important; padding:.5rem; border:1px solid var(--color-base-70); border-radius:.5rem; }
        .tag-picker__option input { width:auto!important; min-height:auto!important; }
        .tag-picker__option span { display:grid; }
        .tag-picker__option small { font-weight:400; }
        .tag-picker__new { padding-top:1rem; border-top:1px solid var(--color-base-70); }
        .tag-picker__new h3 { margin:0; font-size:1rem; }
        .tag-picker__error { margin:0; color:#a1261d; }
      `}</style>
    </fieldset>
  );
}
