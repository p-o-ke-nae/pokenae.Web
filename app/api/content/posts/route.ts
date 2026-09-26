import { NextResponse } from "next/server";
import sharp from "sharp";
import matter from "gray-matter";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { getContentRevisionFiles, getContentSnapshot, getFreshContentAdminSnapshot, getFreshContentSnapshotWithRevision, usesContentFixtures } from "@/lib/content/repository";
import { gitCommitShaSchema, postFrontmatterSchema, postUnpublishRequestSchema, postWriteRequestSchema, tagDefinitionListSchema, updateContentSchema } from "@/lib/content/schemas";
import { createContentPullRequest, getReservedTagDefinitions } from "@/lib/github/content-writer";
import { isContentConflictError } from "@/lib/github/content-conflict";
import { validateCanonicalJson } from "../../../../lib/content/canonical-validation";
import { assignNewTagsToPost, serializeTagFiles } from "../../../../lib/content/tags-admin";
import { PostImageReferenceError, serializePostSource } from "../../../../lib/content/post-source";

const allowedImages = new Map([["image/png", ".png"], ["image/jpeg", ".jpg"], ["image/webp", ".webp"]]);

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "true";
}

export async function GET() {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) return NextResponse.json({ error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" }, { status: auth.status });
  return NextResponse.json({ posts: (await getContentSnapshot()).posts });
}

export async function DELETE(request: Request) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) return NextResponse.json({ error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" }, { status: auth.status });
  if (usesContentFixtures()) {
    return NextResponse.json({ code: "CONTENT_WRITE_DISABLED", error: "fixture モードでは Pull Request を作成できません。CONTENT_SOURCE=github に変更してコンテナを再起動してください。" }, { status: 503 });
  }
  try {
    const parsed = postUnpublishRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "非公開化の入力内容が不正です。", issues: parsed.error.issues }, { status: 400 });
    const current = await getFreshContentSnapshotWithRevision();
    if (current.revision !== parsed.data.baseRevision) {
      return NextResponse.json({ code: "CONTENT_CONFLICT", error: "公開コンテンツが更新されています。ページを再読込してください。" }, { status: 409 });
    }
    const post = current.content.posts.find((item) => item.slug === parsed.data.slug);
    if (!post) return NextResponse.json({ error: "対象の記事が見つかりません。" }, { status: 404 });
    if (post.status === "draft") return NextResponse.json({ error: "この記事はすでに非公開です。" }, { status: 409 });

    const sourceSnapshot = await getContentRevisionFiles(current.revision);
    const sourcePath = `content/posts/${post.slug}/index.md`;
    const source = sourceSnapshot.files.get(sourcePath);
    if (!source) return NextResponse.json({ error: "記事本文が見つかりません。" }, { status: 404 });
    const parsedSource = matter(source);
    const updatedFrontmatter = postFrontmatterSchema.parse({ ...parsedSource.data, status: "draft", updatedAt: new Date().toISOString() });
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const pr = await createContentPullRequest({
      branch: `content/${post.slug}-unpublish-${timestamp}`,
      title: `content: ${post.title} を非公開化`,
      body: `管理画面から非公開化\n\n投稿者: ${auth.session.user?.email ?? "unknown"}`,
      expectedRevision: parsed.data.baseRevision,
      files: [{ path: sourcePath, content: matter.stringify(parsedSource.content, updatedFrontmatter) }],
    });
    return NextResponse.json({ pullRequestUrl: pr.html_url, number: pr.number }, { status: 201 });
  } catch (error) {
    console.error("Content unpublish failed", error);
    if (isContentConflictError(error)) return NextResponse.json({ code: "CONTENT_CONFLICT", error: error.message }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "非公開化PRの作成に失敗しました。" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) return NextResponse.json({ error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" }, { status: auth.status });
  if (usesContentFixtures()) {
    return NextResponse.json({
      code: "CONTENT_WRITE_DISABLED",
      error: "fixture モードでは Pull Request を作成できません。CONTENT_SOURCE=github に変更してコンテナを再起動してください。",
    }, { status: 503 });
  }
  try {
    const form = await request.formData();
    const revision = gitCommitShaSchema.safeParse(form.get("baseRevision"));
    if (!revision.success) return NextResponse.json({ error: "base revisionが不正です。" }, { status: 400 });
    let post: unknown;
    try {
      post = JSON.parse(String(form.get("post") ?? "{}")) as unknown;
    } catch {
      return NextResponse.json({ error: "記事メタデータが不正です。" }, { status: 400 });
    }
    let rawTagDefinitions: unknown;
    try {
      rawTagDefinitions = JSON.parse(String(form.get("tagDefinitions") ?? "[]")) as unknown;
    } catch {
      return NextResponse.json({ error: "タグ一覧が不正です。" }, { status: 400 });
    }
    const currentSnapshot = await getFreshContentAdminSnapshot();
    if (currentSnapshot.revision !== revision.data) {
      return NextResponse.json({ code: "CONTENT_CONFLICT", error: "公開コンテンツが更新されています。ページを再読込してください。" }, { status: 409 });
    }
    const reservedTags = await getReservedTagDefinitions();
    const assigned = assignNewTagsToPost(
      rawTagDefinitions,
      post as { tags: string[]; relatedTags: string[] },
      currentSnapshot.tags,
      reservedTags,
    );
    const parsed = postWriteRequestSchema.safeParse({
      baseRevision: revision.data,
      post: assigned.post,
      body: String(form.get("body") ?? ""),
    });
    if (!parsed.success) {
      const invalidBody = parsed.error.issues.some((issue) => issue.path[0] === "body");
      return NextResponse.json(
        invalidBody ? { error: "本文は必須です。" } : { error: "記事メタデータが不正です。", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const parsedTagDefinitions = tagDefinitionListSchema.safeParse(assigned.definitions);
    if (!parsedTagDefinitions.success) {
      return NextResponse.json({ error: "タグ一覧が不正です。", issues: parsedTagDefinitions.error.issues }, { status: 400 });
    }
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const branch = `content/${parsed.data.post.slug}-${timestamp}`;
    const currentTagIds = new Set(currentSnapshot.tags.map((tag) => tag.id));
    const submittedTagIds = new Set(parsedTagDefinitions.data.map((tag) => tag.id));
    if ([...currentTagIds].some((id) => !submittedTagIds.has(id))) {
      return NextResponse.json({ error: "記事保存時に既存タグを削除することはできません。タグ管理画面を使用してください。" }, { status: 400 });
    }
    const submittedLabels = new Map(parsedTagDefinitions.data.map((tag) => [tag.id, tag.label]));
    if (currentSnapshot.tags.some((tag) => submittedLabels.get(tag.id) !== tag.label)) {
      return NextResponse.json({ error: "記事保存時に既存タグの表示名を変更することはできません。タグ管理画面を使用してください。" }, { status: 400 });
    }
    const unknownPostTag = [...parsed.data.post.tags, ...parsed.data.post.relatedTags]
      .find((id) => !submittedTagIds.has(id));
    if (unknownPostTag) {
      return NextResponse.json({ error: `タグ ${unknownPostTag} がタグ一覧に存在しません。` }, { status: 400 });
    }
    const skipInfo = parseBoolean(form.get("skipInfo"));
    const files: { path: string; content: Buffer | string }[] = [
      { path: `content/posts/${parsed.data.post.slug}/index.md`, content: serializePostSource(parsed.data.post, parsed.data.body) },
    ];
    if (!skipInfo) {
      const update = updateContentSchema.safeParse({
        id: `${parsed.data.post.slug}-${timestamp}`,
        publishedAt: new Date().toISOString(),
        target: "post",
        summary: parsed.data.post.changeNote || `${parsed.data.post.title}を更新`,
        href: `/blog/${parsed.data.post.slug}`,
        visible: true,
      });
      if (!update.success) {
        return NextResponse.json({ error: "更新情報がschemaに適合しません。", issues: update.error.issues }, { status: 400 });
      }
      const updateIssues = validateCanonicalJson(currentSnapshot.schemas.update, update.data);
      if (updateIssues.length) {
        return NextResponse.json({ error: "更新情報がcanonical schemaに適合しません。", issues: updateIssues }, { status: 400 });
      }
      files.push({ path: `content/updates/${parsed.data.post.slug}-${timestamp}.json`, content: JSON.stringify(update.data, null, 2) + "\n" });
    }
    if (JSON.stringify(parsedTagDefinitions.data) !== JSON.stringify(currentSnapshot.tags)) {
      files.push(...serializeTagFiles(parsedTagDefinitions.data));
    }
    for (const entry of form.getAll("images")) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      const extension = allowedImages.get(entry.type);
      if (!extension || entry.size > 5 * 1024 * 1024) return NextResponse.json({ error: "画像は5MB以下の PNG/JPEG/WebP のみ利用できます。" }, { status: 400 });
      const buffer = Buffer.from(await entry.arrayBuffer());
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) return NextResponse.json({ error: "画像寸法は4096×4096以下にしてください。" }, { status: 400 });
      const safeName = entry.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "image";
      const optimized = await sharp(buffer).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      files.push({ path: `content/posts/${parsed.data.post.slug}/images/${safeName}.webp`, content: optimized });
    }
    const pr = await createContentPullRequest({
      branch,
      title: `content: ${parsed.data.post.title}`,
      body: skipInfo
        ? `管理画面から作成\n\nContent-Update: skip\nContent-Update-Reason: INFOに表示しない設定\n\n投稿者: ${auth.session.user?.email ?? "unknown"}`
        : `管理画面から作成\n\n投稿者: ${auth.session.user?.email ?? "unknown"}`,
      expectedRevision: parsed.data.baseRevision,
      files,
    });
    return NextResponse.json({ pullRequestUrl: pr.html_url, number: pr.number }, { status: 201 });
  } catch (error) {
    console.error("Content write failed", error);
    if (isContentConflictError(error)) {
      return NextResponse.json({ code: "CONTENT_CONFLICT", error: error.message }, { status: 409 });
    }
    if (error instanceof PostImageReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "PR の作成に失敗しました。" }, { status: 502 });
  }
}
