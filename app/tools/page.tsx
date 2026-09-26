import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import ContentCardVertical from "@/components/molecules/ContentCardVertical";
import ContentSearchForm from "@/components/molecules/ContentSearchForm";
import { getContentSnapshot } from "@/lib/content/repository";
import { matchesContentSearch, parseContentSearch, type ContentSearchParams } from "@/lib/content/search";

export const metadata: Metadata = { title: "ツール開発室" };

export default async function ToolsPage({ searchParams }: { searchParams: Promise<ContentSearchParams> }) {
  const search = parseContentSearch(await searchParams);
  const { tools: allTools, tagDefinitions } = await getContentSnapshot();
  const tools = allTools.filter((tool) => matchesContentSearch({ title: tool.name, tags: tool.tags }, search));
  return <main className="page-container"><header className="page-header"><CustomHeader>ツール開発室</CustomHeader><p className="page-lead">Windows アプリと、開発者向けライブラリを公開しています。</p></header>
    <ContentSearchForm key={`${search.query}:${search.tagIds.join(",")}:${search.invalidTag}`} action="/tools" tags={tagDefinitions} search={search} resultCount={tools.length} />
    {tools.length ? <div className="card-grid">{tools.map((tool) => <ContentCardVertical key={tool.slug} id={tool.slug} title={tool.name} metaLabel={tool.kind === "library" ? "開発者向けライブラリ" : "Windows アプリ"} imageSrc={tool.image ?? "/mock/thumb1.svg"} imageAlt="" href={`/tools/${tool.slug}`} tag={tool.kind === "library" ? "LIBRARY" : "APP"} />)}</div> : <p className="empty-state">条件に一致するツールはありません。</p>}
  </main>;
}
