import CustomHeader from "@/components/atoms/CustomHeader";
import AdminContentNavigation from "@/components/molecules/AdminContentNavigation";
import ToolEditor from "@/components/organisms/ToolEditor";
import { getContentAdminSnapshot } from "@/lib/content/repository";

export default async function ToolAdminPage() {
  const snapshot = await getContentAdminSnapshot();
  return <main className="page-container stack">
    <AdminContentNavigation current="/admin/content/tools" />
    <header className="page-header"><CustomHeader>ツール設定</CustomHeader><p className="page-lead">公開ツールとライブラリを編集します。</p></header>
    <ToolEditor initial={snapshot.tools} baseRevision={snapshot.revision} />
  </main>;
}
