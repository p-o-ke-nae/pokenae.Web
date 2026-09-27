import CustomHeader from "@/components/atoms/CustomHeader";
import AnnouncementEditor from "@/components/organisms/AnnouncementEditor";
import BannerEditor from "@/components/organisms/BannerEditor";
import ToolEditor from "@/components/organisms/ToolEditor";
import TagEditor from "@/components/organisms/TagEditor";
import { getContentAdminSnapshot } from "@/lib/content/repository";

export default async function HomeContentAdminPage() {
  const snapshot = await getContentAdminSnapshot();
  return <main className="page-container stack"><header className="page-header"><CustomHeader>ホーム・ツール設定</CustomHeader><p className="page-lead">canonical schema と参照画像を検証し、新規または既存の Pull Request へ安全に保存します。</p></header>
    <section className="stack"><CustomHeader level={2}>バナー</CustomHeader><BannerEditor initial={snapshot.banners} baseRevision={snapshot.revision} /></section>
    <section className="stack"><CustomHeader level={2}>ニュース</CustomHeader><AnnouncementEditor initial={snapshot.announcements} baseRevision={snapshot.revision} /></section>
    <section className="stack"><CustomHeader level={2}>ツール</CustomHeader><ToolEditor initial={snapshot.tools} baseRevision={snapshot.revision} /></section>
    <section className="stack"><CustomHeader level={2}>タグ</CustomHeader><TagEditor initial={snapshot.tags} baseRevision={snapshot.revision} /></section>
  </main>;
}
