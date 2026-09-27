import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import ContentCardHorizontal from "@/components/molecules/ContentCardHorizontal";
import ContentSearchForm from "@/components/molecules/ContentSearchForm";
import { getContentSnapshot } from "@/lib/content/repository";
import { matchesContentSearch, parseContentSearch, type ContentSearchParams } from "@/lib/content/search";

export const metadata: Metadata = { title: "Webアプリ" };

export default async function AppsPage({ searchParams }: { searchParams: Promise<ContentSearchParams> }) {
  const search = parseContentSearch(await searchParams);
  const { apps: allApps, tagDefinitions } = await getContentSnapshot();
  const apps = allApps.filter((app) => (
    app.status === "published"
    && matchesContentSearch({ title: app.name, tags: app.tags }, search)
  ));
  return <main className="page-container"><header className="page-header"><CustomHeader>Webアプリ</CustomHeader><p className="page-lead">Google OAuth2 で安全に認証し、pokenae の API を利用するWebアプリです。</p></header>
    <ContentSearchForm key={`${search.query}:${search.tagIds.join(",")}:${search.invalidTag}`} action="/apps" tags={tagDefinitions} search={search} resultCount={apps.length} />
    {apps.length ? <div className="stack">{apps.map((app) => <ContentCardHorizontal key={app.slug} id={app.slug} title={app.name} description={app.summary} metaLabel={app.metaLabel ?? "Webアプリ"} imageSrc={app.image ?? "/pokenaeLogo.png"} imageAlt={app.imageAlt} href={app.href} />)}</div> : <p className="empty-state">条件に一致するWebアプリはありません。</p>}
  </main>;
}
