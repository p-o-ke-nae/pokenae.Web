import CustomHeader from "@/components/atoms/CustomHeader";
import AdminContentNavigation from "@/components/molecules/AdminContentNavigation";
import AnnouncementEditor from "@/components/organisms/AnnouncementEditor";
import { getContentAdminSnapshot } from "@/lib/content/repository";

export default async function AnnouncementAdminPage() {
  const snapshot = await getContentAdminSnapshot();
  return <main className="page-container stack">
    <AdminContentNavigation current="/admin/content/announcements" />
    <header className="page-header"><CustomHeader>ニュース設定</CustomHeader><p className="page-lead">トップページのお知らせを編集します。</p></header>
    <AnnouncementEditor initial={snapshot.announcements} baseRevision={snapshot.revision} />
  </main>;
}
