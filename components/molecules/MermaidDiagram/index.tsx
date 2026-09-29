"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Mermaid } from "mermaid";
import { clampMermaidZoom, MERMAID_MAX_ZOOM, MERMAID_MIN_ZOOM, MERMAID_ZOOM_STEP } from "@/lib/content/markdown-mermaid";

let mermaidLoader: Promise<Mermaid> | null = null;
let renderSequence = 0;

function loadMermaid() {
  mermaidLoader ??= import("mermaid").then(({ default: mermaid }) => {
    // strict: クリックイベントや HTML ラベルを無効化し、SVG を DOMPurify で無害化する。
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });
    return mermaid;
  });
  return mermaidLoader;
}

export type MermaidDiagramProps = {
  source: string;
};

export default function MermaidDiagram({ source }: MermaidDiagramProps) {
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const canvasRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let active = true;
    // プレビュー入力中の再描画を抑えるため、少し待ってから描画する。
    const timer = window.setTimeout(async () => {
      renderSequence += 1;
      const renderId = `mermaid-${baseId}-${renderSequence}`;
      try {
        const mermaid = await loadMermaid();
        const result = await mermaid.render(renderId, source);
        if (!active) return;
        setSvg(result.svg);
        setError("");
      } catch (renderError) {
        document.getElementById(`d${renderId}`)?.remove();
        if (!active) return;
        setSvg("");
        setError(renderError instanceof Error ? renderError.message : "図を描画できませんでした。");
      }
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [baseId, source]);

  useEffect(() => {
    const element = canvasRef.current?.querySelector("svg");
    if (!element) return;
    const naturalWidth = element.viewBox?.baseVal?.width || element.getBoundingClientRect().width;
    element.style.height = "auto";
    if (zoom === 1 || !naturalWidth) {
      element.style.width = "100%";
      element.style.maxWidth = naturalWidth ? `${naturalWidth}px` : "100%";
    } else {
      element.style.width = `${Math.round(naturalWidth * zoom)}px`;
      element.style.maxWidth = "none";
    }
  }, [svg, zoom]);

  if (error) {
    return (
      <div className="mermaid-diagram mermaid-diagram--error" role="alert">
        <p>Mermaid の図を描画できませんでした。</p>
        <pre>{source}</pre>
        <style jsx>{`
          .mermaid-diagram--error { margin:1rem 0; padding:.75rem; border:1px solid #751b16; border-radius:.3rem; }
          .mermaid-diagram--error p { margin:0 0 .5rem; color:#751b16; font-weight:700; }
        `}</style>
      </div>
    );
  }

  return (
    <figure className="mermaid-diagram">
      <div className="mermaid-diagram__toolbar" role="toolbar" aria-label="図の表示倍率">
        <button type="button" aria-label="縮小" disabled={!svg || zoom <= MERMAID_MIN_ZOOM} onClick={() => setZoom((current) => clampMermaidZoom(current - MERMAID_ZOOM_STEP))}>－</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="拡大" disabled={!svg || zoom >= MERMAID_MAX_ZOOM} onClick={() => setZoom((current) => clampMermaidZoom(current + MERMAID_ZOOM_STEP))}>＋</button>
        <button type="button" disabled={!svg || zoom === 1} onClick={() => setZoom(1)}>リセット</button>
      </div>
      <div
        ref={canvasRef}
        className="mermaid-diagram__canvas"
        aria-busy={!svg}
        // mermaid は securityLevel: strict で SVG を DOMPurify により無害化して返す。
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {!svg ? <p className="mermaid-diagram__loading">図を描画しています…</p> : null}
      <style jsx>{`
        .mermaid-diagram { display:grid; gap:.5rem; margin:1rem 0; padding:.75rem; border:1px solid var(--color-base-70); border-radius:.3rem; background:#fff; }
        .mermaid-diagram__toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:.5rem; }
        .mermaid-diagram__toolbar button { min-width:44px; min-height:44px; padding:.25rem .75rem; border:1px solid var(--color-base-70-dark); border-radius:.25rem; background:#fff; color:var(--foreground); font-weight:700; cursor:pointer; }
        .mermaid-diagram__toolbar button:disabled { opacity:.5; cursor:default; }
        .mermaid-diagram__toolbar output { min-width:3.5rem; text-align:center; font-variant-numeric:tabular-nums; }
        .mermaid-diagram__canvas { overflow:auto; max-height:80vh; }
        .mermaid-diagram__loading { margin:0; color:var(--color-base-70-dark); font-size:.875rem; }
      `}</style>
    </figure>
  );
}
