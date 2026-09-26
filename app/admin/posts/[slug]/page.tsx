import { notFound } from "next/navigation";
import matter from "gray-matter";
import CustomHeader from "@/components/atoms/CustomHeader";
import PostEditor from "@/components/organisms/PostEditor";
import { getContentMarkdownContext, getFreshContentAdminSnapshot } from "@/lib/content/repository";
import { postFrontmatterSchema } from "@/lib/content/schemas";

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const snapshot = await getFreshContentAdminSnapshot();
  const entry = snapshot.postSources.find(({ path }) => path === `content/posts/${slug}/index.md`);
  if (!entry) notFound();
  const source = matter(entry.source);
  const frontmatter = postFrontmatterSchema.safeParse(source.data);
  if (!frontmatter.success) notFound();
  const post = { ...frontmatter.data, body: source.content.trim() };
  return <main className="page-container"><header className="page-header"><CustomHeader>記事を編集</CustomHeader><p className="page-lead">mainを直接変更せず、レビュー用Pull Requestを作成します。</p></header><PostEditor initial={post} baseRevision={snapshot.revision} initialTagDefinitions={snapshot.tags} repositoryContext={getContentMarkdownContext(snapshot.revision, entry.path)} /></main>;
}
