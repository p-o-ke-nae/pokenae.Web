import { notFound } from "next/navigation";
import CustomHeader from "@/components/atoms/CustomHeader";
import PostEditor from "@/components/organisms/PostEditor";
import { getContentSnapshot } from "@/lib/content/repository";

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await getContentSnapshot()).posts.find((item) => item.slug === slug);
  if (!post) notFound();
  return <main className="page-container"><header className="page-header"><CustomHeader>記事を編集</CustomHeader><p className="page-lead">mainを直接変更せず、レビュー用Pull Requestを作成します。</p></header><PostEditor initial={post} /></main>;
}
