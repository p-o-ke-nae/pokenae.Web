import CustomHeader from "@/components/atoms/CustomHeader";
import ContentConfigEditor from "@/components/organisms/ContentConfigEditor";
import { getContentAdminSnapshot } from "@/lib/content/repository";

export default async function HomeContentAdminPage() {
  const snapshot = await getContentAdminSnapshot();
  return <main className="page-container stack"><header className="page-header"><CustomHeader>ホーム・ツール設定</CustomHeader><p className="page-lead">保存用JSONを変換せず表示し、schema検証後にPull Requestへ保存します。</p></header>
    <section className="stack"><CustomHeader level={2}>バナー</CustomHeader><ContentConfigEditor kind="banners" initial={snapshot.banners} /></section>
    <section className="stack"><CustomHeader level={2}>ニュース</CustomHeader><ContentConfigEditor kind="announcements" initial={snapshot.announcements} /></section>
    <section className="stack"><CustomHeader level={2}>ツール</CustomHeader><ContentConfigEditor kind="tools" initial={snapshot.tools} /></section>
  </main>;
}
