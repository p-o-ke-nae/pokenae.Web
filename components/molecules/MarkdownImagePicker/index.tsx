"use client";

import { useState } from "react";
import CustomButton from "@/components/atoms/CustomButton";
import Dialog, { DialogFooterLayout } from "@/components/molecules/Dialog";

export type MarkdownImageCandidate = {
  /** Markdown に挿入するパス（./images/...） */
  path: string;
  /** サムネイル表示用 URL */
  previewUrl?: string;
  /** 候補の表示名 */
  label: string;
  /** 保存時に添付する未保存の画像か */
  pending: boolean;
};

export type MarkdownImagePickerProps = {
  candidates: MarkdownImageCandidate[];
  onInsert: (path: string, alt: string) => void;
  onFilesSelected: (files: File[]) => void;
  onRemove?: (path: string) => void;
  disabled?: boolean;
};

export default function MarkdownImagePicker({ candidates, onInsert, onFilesSelected, onRemove, disabled = false }: MarkdownImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState("画像");

  function insert(path: string) {
    onInsert(path, alt.trim() || "画像");
    setOpen(false);
  }

  return (
    <>
      <CustomButton type="button" variant="neutral" disabled={disabled} onClick={() => setOpen(true)}>
        画像を挿入
      </CustomButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="画像を挿入"
        size="lg"
        footer={<DialogFooterLayout trailing={<CustomButton type="button" variant="neutral" onClick={() => setOpen(false)}>閉じる</CustomButton>} />}
      >
        <div className="markdown-image-picker">
          <label>
            端末から画像を追加（PNG/JPEG/WebP・各5MB以下）
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length) onFilesSelected(files);
                event.target.value = "";
              }}
            />
          </label>
          <p className="markdown-image-picker__hint">クリップボードの画像は、このダイアログや記事エディタ上で貼り付け（Ctrl+V / ⌘+V）しても候補に追加できます。</p>
          <label>
            代替テキスト
            <input value={alt} onChange={(event) => setAlt(event.target.value)} />
          </label>
          {candidates.length ? (
            <ul className="markdown-image-picker__list" aria-label="画像の候補">
              {candidates.map((candidate) => (
                <li key={candidate.path} className="markdown-image-picker__item">
                  <button type="button" className="markdown-image-picker__select" onClick={() => insert(candidate.path)} aria-label={`${candidate.label}を本文に挿入`}>
                    {candidate.previewUrl
                      // 候補画像は保存前の Blob URL を含み寸法も不明なため img で表示する。
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={candidate.previewUrl} alt="" loading="lazy" />
                      : <span className="markdown-image-picker__placeholder" aria-hidden="true">画像</span>}
                    <span className="markdown-image-picker__label">{candidate.label}</span>
                    <small>{candidate.pending ? "保存時に添付" : "保存済み"}</small>
                  </button>
                  {candidate.pending && onRemove ? (
                    <button type="button" className="markdown-image-picker__remove" onClick={() => onRemove(candidate.path)} aria-label={`${candidate.label}を候補から外す`}>
                      候補から外す
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : <p className="markdown-image-picker__empty">画像の候補はありません。端末から追加するか、画像を貼り付けてください。</p>}
        </div>
      </Dialog>
      <style jsx>{`
        .markdown-image-picker { display:grid; gap:1rem; }
        .markdown-image-picker label { display:grid; gap:.35rem; font-weight:700; }
        .markdown-image-picker input { width:100%; min-height:44px; padding:.55rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); }
        .markdown-image-picker__hint,.markdown-image-picker__empty { margin:0; color:var(--color-base-70-dark); font-size:.875rem; }
        .markdown-image-picker__list { display:grid; grid-template-columns:repeat(auto-fill,minmax(10rem,1fr)); gap:.75rem; margin:0; padding:0; list-style:none; }
        .markdown-image-picker__item { display:grid; gap:.35rem; }
        .markdown-image-picker__select { display:grid; gap:.35rem; padding:.5rem; border:1px solid var(--color-base-70); border-radius:.35rem; background:#fff; color:var(--foreground); text-align:left; cursor:pointer; }
        .markdown-image-picker__select:hover,.markdown-image-picker__select:focus-visible { border-color:var(--color-accent-25-strong); }
        .markdown-image-picker__select img,.markdown-image-picker__placeholder { width:100%; aspect-ratio:16/9; object-fit:contain; background:var(--color-base-70-light); }
        .markdown-image-picker__placeholder { display:grid; place-items:center; color:var(--color-base-70-dark); }
        .markdown-image-picker__label { overflow-wrap:anywhere; font-size:.875rem; font-weight:700; }
        .markdown-image-picker__select small { color:var(--color-base-70-dark); }
        .markdown-image-picker__remove { min-height:44px; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); cursor:pointer; }
      `}</style>
    </>
  );
}
