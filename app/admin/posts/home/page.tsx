import CustomHeader from "@/components/atoms/CustomHeader";
import ContentConfigEditor from "@/components/organisms/ContentConfigEditor";
import { getContentSnapshot } from "@/lib/content/repository";

export default async function HomeContentAdminPage() {
  const snapshot = await getContentSnapshot();
  const editableTools = snapshot.tools.map((tool) => ({
    slug: tool.slug,
    displayName: tool.name,
    summary: tool.summary,
    repository: tool.repository,
    kind: tool.kind,
    image: tool.image,
    supportedOs: tool.supportedOs,
    docs: tool.docsPath ? { readme: tool.docsPath, paths: ["docs/"] } : undefined,
    release: { channel: tool.releaseChannel ?? "stable", manifestRequired: tool.kind === "windows-app", unsignedInstaller: tool.kind === "windows-app", package: tool.kind === "library" ? "GenericRecognitionWorkbench" : undefined },
    showInPickup: tool.showInPickup,
    priority: tool.priority,
  }));
  return <main className="page-container stack"><header className="page-header"><CustomHeader>ホーム・ツール設定</CustomHeader><p className="page-lead">schema検証後、mainではなくPull Requestへ保存します。</p></header>
    <section className="stack"><CustomHeader level={2}>バナー</CustomHeader><ContentConfigEditor kind="banners" initial={snapshot.banners} /></section>
    <section className="stack"><CustomHeader level={2}>ニュース</CustomHeader><ContentConfigEditor kind="announcements" initial={snapshot.announcements} /></section>
    <section className="stack"><CustomHeader level={2}>ツール</CustomHeader><ContentConfigEditor kind="tools" initial={editableTools} /></section>
  </main>;
}
