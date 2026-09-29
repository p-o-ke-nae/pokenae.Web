import CustomHeader from "@/components/atoms/CustomHeader";
import AdminContentNavigation from "@/components/molecules/AdminContentNavigation";
import AppEditor from "@/components/organisms/AppEditor";
import { getContentAdminSnapshot } from "@/lib/content/repository";

export default async function AppAdminPage() {
  const snapshot = await getContentAdminSnapshot();
  return <main className="page-container stack">
    <AdminContentNavigation current="/admin/content/apps" />
    <header className="page-header"><CustomHeader>Webアプリ設定</CustomHeader><p className="page-lead">Webアプリの公開情報と表示順を編集します。</p></header>
    <AppEditor initial={snapshot.apps} baseRevision={snapshot.revision} tagDefinitions={snapshot.tags} />
  </main>;
}
