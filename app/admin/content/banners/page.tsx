import CustomHeader from "@/components/atoms/CustomHeader";
import AdminContentNavigation from "@/components/molecules/AdminContentNavigation";
import BannerEditor from "@/components/organisms/BannerEditor";
import { getContentAdminSnapshot } from "@/lib/content/repository";

export default async function BannerAdminPage() {
  const snapshot = await getContentAdminSnapshot();
  return <main className="page-container stack">
    <AdminContentNavigation current="/admin/content/banners" />
    <header className="page-header"><CustomHeader>バナー設定</CustomHeader><p className="page-lead">トップページのバナーを編集します。</p></header>
    <BannerEditor initial={snapshot.banners} baseRevision={snapshot.revision} />
  </main>;
}
