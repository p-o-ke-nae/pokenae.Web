import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import ContentCardVertical from "@/components/molecules/ContentCardVertical";
import { getContentSnapshot } from "@/lib/content/repository";

export const metadata: Metadata = { title: "ツール開発室" };

export default async function ToolsPage() {
  const { tools } = await getContentSnapshot();
  return <main className="page-container"><header className="page-header"><CustomHeader>ツール開発室</CustomHeader><p className="page-lead">Windows アプリと、開発者向けライブラリを公開しています。</p></header>
    <div className="card-grid">{tools.map((tool) => <ContentCardVertical key={tool.slug} id={tool.slug} title={tool.name} date={tool.kind === "library" ? "開発者向けライブラリ" : "Windows アプリ"} imageSrc={tool.image ?? "/mock/thumb1.svg"} imageAlt="" href={`/tools/${tool.slug}`} tag={tool.kind === "library" ? "LIBRARY" : "APP"} />)}</div>
  </main>;
}
