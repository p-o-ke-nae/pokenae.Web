import CustomHeader from "@/components/atoms/CustomHeader";
import AdminContentNavigation from "@/components/molecules/AdminContentNavigation";

export default function AdminContentPage() {
  return (
    <main className="page-container stack">
      <header className="page-header">
        <CustomHeader>公開コンテンツ設定</CustomHeader>
        <p className="page-lead">編集する項目を選択してください。変更はPull Requestとして保存されます。</p>
      </header>
      <AdminContentNavigation />
    </main>
  );
}
