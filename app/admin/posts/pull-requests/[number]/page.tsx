import { notFound } from "next/navigation";
import matter from "gray-matter";
import CustomHeader from "@/components/atoms/CustomHeader";
import PostEditor from "@/components/organisms/PostEditor";
import { getContentMarkdownContext } from "@/lib/content/repository";
import { postFrontmatterSchema } from "@/lib/content/schemas";
import { getEditablePostPullRequest } from "@/lib/github/content-writer";

export default async function EditPostPullRequestPage({ params }: { params: Promise<{ number: string }> }) {
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number <= 0) notFound();

  let pullRequest;
  try {
    pullRequest = await getEditablePostPullRequest(number);
  } catch (error) {
    console.error("記事PRの編集画面を取得できませんでした", error);
    return <main className="page-container">
      <header className="page-header">
        <CustomHeader>記事PRを編集できません</CustomHeader>
        <p className="notice" role="alert">
          {error instanceof Error ? error.message : "Pull Requestの内容を取得できませんでした。"}
        </p>
      </header>
    </main>;
  }
  const source = matter(pullRequest.source);
  const frontmatter = postFrontmatterSchema.safeParse(source.data);
  if (!frontmatter.success) {
    return <main className="page-container">
      <header className="page-header">
        <CustomHeader>記事PRを編集できません</CustomHeader>
        <p className="notice" role="alert">Pull Request内の記事メタデータが現在の仕様に適合しません。タグIDなどを確認してから再試行してください。</p>
      </header>
    </main>;
  }
  const post = { ...frontmatter.data, body: source.content.trim() };

  return <main className="page-container">
      <header className="page-header">
        <CustomHeader>記事PRを修正</CustomHeader>
        <p className="page-lead">#{pullRequest.number} の既存Pull Requestへ修正コミットを追加します。</p>
      </header>
      <PostEditor initial={post} baseRevision={pullRequest.headRevision} pullRequestNumber={pullRequest.number} initialTagDefinitions={pullRequest.tagDefinitions} repositoryContext={getContentMarkdownContext(pullRequest.headRevision, `content/posts/${pullRequest.slug}/index.md`)} />
    </main>;
}
