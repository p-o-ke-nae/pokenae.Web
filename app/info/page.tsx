import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import InfoList from "@/components/molecules/InfoList";
import { selectInfoUpdates } from "@/lib/content/presentation";
import { getContentSnapshot } from "@/lib/content/repository";

export const metadata: Metadata = {
  title: "INFO",
  description: "pokenae の更新情報一覧です。",
};

export default async function InfoPage() {
  const updates = selectInfoUpdates((await getContentSnapshot()).updates);

  return <main className="page-container">
    <header className="page-header">
      <CustomHeader>INFO</CustomHeader>
      <p className="page-lead">サイトと公開コンテンツの更新情報です。</p>
    </header>
    {updates.length
      ? <InfoList updates={updates} />
      : <p className="empty-state">現在表示できる更新情報はありません。</p>}
  </main>;
}
