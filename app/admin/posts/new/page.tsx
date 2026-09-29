import CustomHeader from "@/components/atoms/CustomHeader";
import AdminContentNavigation from "@/components/molecules/AdminContentNavigation";
import PostEditor from "@/components/organisms/PostEditor";
import { getContentSnapshotWithRevision } from "@/lib/content/repository";

export default async function NewPostPage() {
  const { revision, content } = await getContentSnapshotWithRevision();
  return <main className="page-container stack"><AdminContentNavigation current="/admin/posts" /><header className="page-header"><CustomHeader>記事を作成</CustomHeader><p className="page-lead">保存すると pokenae.Content にブランチ、コミット、Pull Requestを作成します。</p></header><PostEditor baseRevision={revision} initialTagDefinitions={content.tagDefinitions} /></main>;
}
