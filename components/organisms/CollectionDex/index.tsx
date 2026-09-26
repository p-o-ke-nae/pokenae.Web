'use client';

import { useMemo, useState } from "react";
import type { CollectionDexRecord } from "@/lib/content/types";

const fixtureRecords: CollectionDexRecord[] = [
  { number: 1, name: "フシギダネ", region: "カントー", status: "未収集" },
  { number: 25, name: "ピカチュウ", region: "カントー", status: "収集済み" },
  { number: 152, name: "チコリータ", region: "ジョウト", status: "収集中" },
  { number: 252, name: "キモリ", region: "ホウエン", status: "収集済み" },
  { number: 387, name: "ナエトル", region: "シンオウ", status: "収集中" },
];

export default function CollectionDex({ records = fixtureRecords }: { records?: CollectionDexRecord[] }) {
  const [region, setRegion] = useState("すべて");
  const [status, setStatus] = useState("すべて");
  const [selected, setSelected] = useState<CollectionDexRecord | null>(null);
  const regions = ["すべて", ...new Set(records.map((record) => record.region))];
  const statuses = ["すべて", ...new Set(records.map((record) => record.status))];
  const filtered = useMemo(
    () => records.filter((record) => (region === "すべて" || record.region === region) && (status === "すべて" || record.status === status)),
    [records, region, status],
  );

  return (
    <section className="dex" aria-labelledby="collection-dex-title">
      <h2 id="collection-dex-title">CollectionDex</h2>
      <div className="dex__filters">
        <label>地方
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {regions.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>状態
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <p aria-live="polite">{filtered.length} 件</p>
      <div className="dex__grid">
        {filtered.map((record) => (
          <button key={record.number} type="button" onClick={() => setSelected(record)} className="dex__card" style={{ borderLeftColor: record.color }}>
            <span>No. {record.number}</span><strong>{record.name}</strong><small>{record.region}・{record.status}</small>
          </button>
        ))}
      </div>
      {selected && (
        <div className="dex__dialog-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="dex-dialog-title" className="dex__dialog" onMouseDown={(event) => event.stopPropagation()}>
            <h3 id="dex-dialog-title">{selected.name}</h3>
            <p>全国図鑑 No. {selected.number}</p><p>{selected.region} / {selected.status}</p>{selected.location && <p>配置: {selected.location}</p>}
            <button type="button" onClick={() => setSelected(null)}>閉じる</button>
          </div>
        </div>
      )}
      <style>{`
        .dex { margin:1.5rem 0; padding:1rem; border:1px solid var(--color-base-70); background:var(--color-base-70-light); }
        .dex__filters { display:flex; flex-wrap:wrap; gap:1rem; }
        .dex__filters label { display:grid; gap:.25rem; font-weight:700; }
        .dex__filters select { min-height:44px; padding:.4rem; }
        .dex__grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:.75rem; }
        .dex__card { min-height:110px; display:grid; text-align:left; padding:.75rem; border:1px solid var(--color-base-70-dark); border-left:6px solid #8c858f; background:white; border-radius:.3rem; }
        .dex__card--収集中 { border-left-color:#d89300; }
        .dex__card--収集済み { border-left-color:#36814a; }
        .dex__dialog-backdrop { position:fixed; inset:0; z-index:100; display:grid; place-items:center; padding:1rem; background:rgba(0,0,0,.45); }
        .dex__dialog { width:min(100%,420px); padding:1.5rem; background:#fff; border-radius:.4rem; box-shadow:0 15px 45px rgba(0,0,0,.3); }
      `}</style>
    </section>
  );
}
