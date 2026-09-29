"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CustomButton from "@/components/atoms/CustomButton";
import Dialog, { DialogFooterLayout } from "@/components/molecules/Dialog";
import type { TagDefinition } from "@/lib/content/types";
import type { ContentSearch } from "@/lib/content/search";

type ContentSearchFormProps = {
  action: "/blog" | "/tools" | "/apps";
  tags: TagDefinition[];
  search: ContentSearch;
  resultCount: number;
  queryMode?: "title" | "keyword";
};

export default function ContentSearchForm({ action, tags, search, resultCount, queryMode = "title" }: ContentSearchFormProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(search.tagIds);
  const [draftIds, setDraftIds] = useState(search.tagIds);
  const labels = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.label])), [tags]);
  const filteredTags = useMemo(() => {
    const query = tagQuery.trim().toLocaleLowerCase("ja-JP");
    return tags.filter((tag) => (
      !query
      || tag.id.includes(query)
      || tag.label.toLocaleLowerCase("ja-JP").includes(query)
    ));
  }, [tagQuery, tags]);

  function openDialog() {
    setDraftIds(selectedIds);
    setTagQuery("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDraftIds(selectedIds);
    setDialogOpen(false);
  }

  function toggleDraft(id: string) {
    setDraftIds((current) => current.includes(id)
      ? current.filter((selected) => selected !== id)
      : [...current, id]);
  }

  function applyTags() {
    setSelectedIds(draftIds);
    setDialogOpen(false);
  }

  return <section className="content-search" aria-labelledby="content-search-title">
    <h2 id="content-search-title" className="sr-only">コンテンツを検索</h2>
    <form action={action} method="get" className="content-search__form">
      <label className="content-search__query">
        {queryMode === "keyword" ? "キーワード" : "タイトル"}
        <input name="q" type="search" defaultValue={search.query} placeholder={queryMode === "keyword" ? "タイトル・概要の一部を入力" : "タイトルの一部を入力"} />
      </label>
      <fieldset className="content-search__tag-field">
        <legend>タグ（複数選択はすべてを含む条件）</legend>
        {selectedIds.map((id) => <input key={id} type="hidden" name="tags" value={id} />)}
        <div className="content-search__selected-tags" aria-live="polite">
          {selectedIds.length
            ? selectedIds.map((id) => <span className="content-search__tag-chip" key={id}>
                <span>{labels.get(id) ?? id}</span>
                <button
                  type="button"
                  aria-label={`${labels.get(id) ?? id}を検索条件から外す`}
                  onClick={() => setSelectedIds((current) => current.filter((selected) => selected !== id))}
                >
                  ×
                </button>
              </span>)
            : <span className="content-search__no-tags">タグは指定されていません。</span>}
        </div>
        <CustomButton type="button" variant="neutral" onClick={openDialog}>タグを選択</CustomButton>
      </fieldset>
      <div className="content-search__actions">
        <CustomButton variant="accent" type="submit">検索</CustomButton>
        {(search.query || search.tagIds.length || search.invalidTag) ? <Link href={action}>条件をクリア</Link> : null}
      </div>
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title="検索するタグを選択"
        size="md"
        footer={<DialogFooterLayout
          leading={<CustomButton type="button" variant="ghost" onClick={() => setDraftIds([])}>選択を解除</CustomButton>}
          trailing={<>
            <CustomButton type="button" variant="neutral" onClick={closeDialog}>キャンセル</CustomButton>
            <CustomButton type="button" variant="accent" onClick={applyTags}>選択を反映</CustomButton>
          </>}
        />}
      >
        <div className="content-search__dialog">
          <label>
            タグを検索
            <input
              type="search"
              value={tagQuery}
              placeholder="表示名または6桁ID"
              autoFocus
              onChange={(event) => setTagQuery(event.target.value)}
            />
          </label>
          <div className="content-search__tag-options" role="group" aria-label="タグ候補">
            {filteredTags.length
              ? filteredTags.map((tag) => <label key={tag.id}>
                  <input
                    type="checkbox"
                    checked={draftIds.includes(tag.id)}
                    onChange={() => toggleDraft(tag.id)}
                  />
                  <span><strong>{tag.label}</strong><small>{tag.id}</small></span>
                </label>)
              : <p>一致するタグはありません。</p>}
          </div>
        </div>
      </Dialog>
    </form>
    <p className={search.invalidTag ? "notice notice--error" : "content-search__count"} role="status">
      {search.invalidTag ? "タグの指定が不正です。6桁のタグIDを指定してください。" : `検索結果: ${resultCount}件`}
    </p>
  </section>;
}
