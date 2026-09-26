import CustomHeader from "@/components/atoms/CustomHeader";
import PostEditor from "@/components/organisms/PostEditor";

export default function NewPostPage() {
  return <main className="page-container"><header className="page-header"><CustomHeader>記事を作成</CustomHeader><p className="page-lead">保存すると pokenae.Content にブランチ、コミット、Pull Requestを作成します。</p></header><PostEditor /></main>;
}
