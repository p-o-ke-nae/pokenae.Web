import CustomHeader from "@/components/atoms/CustomHeader";
import AdminContentNavigation from "@/components/molecules/AdminContentNavigation";
import TagEditor from "@/components/organisms/TagEditor";
import { getContentAdminSnapshot } from "@/lib/content/repository";

export default async function TagAdminPage() {
  const snapshot = await getContentAdminSnapshot();
  return <main className="page-container stack">
    <AdminContentNavigation current="/admin/content/tags" />
    <header className="page-header"><CustomHeader>タグ設定</CustomHeader><p className="page-lead">共通タグの表示名と参照を管理します。</p></header>
    <TagEditor initial={snapshot.tags} baseRevision={snapshot.revision} />
  </main>;
}
