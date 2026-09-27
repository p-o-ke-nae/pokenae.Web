import { NextResponse } from "next/server";
import matter from "gray-matter";
import sharp from "sharp";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { usesContentFixtures } from "@/lib/content/repository";
import { postWriteRequestSchema, tagDefinitionListSchema, updateContentSchema } from "@/lib/content/schemas";
import { isContentConflictError } from "@/lib/github/content-conflict";
import {
  ContentPullRequestError,
  getEditablePostPullRequest,
  getReservedTagDefinitions,
  updateEditablePostPullRequest,
} from "@/lib/github/content-writer";
import { assignNewTagsToPost, serializeTagFiles } from "../../../../../../lib/content/tags-admin";
import { PostImageReferenceError, serializePostSource } from "../../../../../../lib/content/post-source";
import { getPostUpdatePublishedAt, preparePostForWrite } from "../../../../../../lib/content/post-publication";

const allowedImages = new Map([["image/png", ".png"], ["image/jpeg", ".jpg"], ["image/webp", ".webp"]]);

function parseNumber(value: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function parseArticle(source: string) {
  const parsed = matter(source);
  const result = postWriteRequestSchema.shape.post.safeParse(parsed.data);
  if (!result.success) {
    throw new ContentPullRequestError("Pull Request内の記事メタデータが不正です。", 422);
  }
  return { ...result.data, body: parsed.content.trim() };
}

async function parseUpdateInput(request: Request) {
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return request.json() as Promise<{ expectedRevision?: unknown; post?: unknown; body?: unknown; tagDefinitions?: unknown; skipInfo?: unknown; images: File[] }>;
  }
  const form = await request.formData();
  let post: unknown;
  let tagDefinitions: unknown;
  try {
    post = JSON.parse(String(form.get("post") ?? "{}")) as unknown;
    tagDefinitions = JSON.parse(String(form.get("tagDefinitions") ?? "[]")) as unknown;
  } catch {
    throw new ContentPullRequestError("記事の入力内容が不正です。");
  }
  return {
    expectedRevision: form.get("baseRevision"),
    post,
    body: form.get("body"),
    tagDefinitions,
    skipInfo: form.get("skipInfo") === "true",
    images: form.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ number: string }> },
) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" },
      { status: auth.status },
    );
  }
  if (usesContentFixtures()) return NextResponse.json({ code: "CONTENT_WRITE_DISABLED", error: "fixtureモードでは記事PRを取得できません。" }, { status: 503 });
  const number = parseNumber((await context.params).number);
  if (number === null) return NextResponse.json({ error: "Pull Request番号が不正です。" }, { status: 400 });

  try {
    const pullRequest = await getEditablePostPullRequest(number);
    return NextResponse.json({
      pullRequest: {
        number: pullRequest.number,
        title: pullRequest.title,
        url: pullRequest.url,
        draft: pullRequest.draft,
        branch: pullRequest.branch,
        slug: pullRequest.slug,
        headRevision: pullRequest.headRevision,
        baseRevision: pullRequest.baseRevision,
      },
      post: parseArticle(pullRequest.source),
    });
  } catch (error) {
    const status = error instanceof ContentPullRequestError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "記事PRを取得できませんでした。" }, { status });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ number: string }> },
) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" },
      { status: auth.status },
    );
  }
  if (usesContentFixtures()) return NextResponse.json({ code: "CONTENT_WRITE_DISABLED", error: "fixtureモードでは記事PRを更新できません。" }, { status: 503 });
  const number = parseNumber((await context.params).number);
  if (number === null) return NextResponse.json({ error: "Pull Request番号が不正です。" }, { status: 400 });

  try {
    const input = await parseUpdateInput(request);
    const pullRequest = await getEditablePostPullRequest(number);
    const reservedTags = await getReservedTagDefinitions(number);
    const assigned = assignNewTagsToPost(
      input.tagDefinitions,
      input.post as { tags: string[]; relatedTags: string[] },
      pullRequest.tagDefinitions,
      reservedTags,
    );
    const parsed = postWriteRequestSchema.safeParse({
      baseRevision: input.expectedRevision,
      post: assigned.post,
      body: input.body,
    });
    if (!parsed.success) return NextResponse.json({ error: "記事の入力内容が不正です。", issues: parsed.error.issues }, { status: 400 });
    const now = new Date();
    const updatedPost = preparePostForWrite(parsed.data.post, true, now);
    const parsedTagDefinitions = tagDefinitionListSchema.safeParse(assigned.definitions);
    if (!parsedTagDefinitions.success) {
      return NextResponse.json({ error: "タグ一覧が不正です。", issues: parsedTagDefinitions.error.issues }, { status: 400 });
    }

    if (pullRequest.headRevision !== parsed.data.baseRevision) {
      return NextResponse.json({ code: "CONTENT_CONFLICT", error: "記事PRが更新されています。再読込してください。" }, { status: 409 });
    }
    const currentTagIds = new Set(pullRequest.tagDefinitions.map((tag) => tag.id));
    const submittedTagIds = new Set(parsedTagDefinitions.data.map((tag) => tag.id));
    if ([...currentTagIds].some((id) => !submittedTagIds.has(id))) {
      return NextResponse.json({ error: "記事保存時に既存タグを削除することはできません。タグ管理画面を使用してください。" }, { status: 400 });
    }
    const submittedLabels = new Map(parsedTagDefinitions.data.map((tag) => [tag.id, tag.label]));
    if (pullRequest.tagDefinitions.some((tag) => submittedLabels.get(tag.id) !== tag.label)) {
      return NextResponse.json({ error: "記事保存時に既存タグの表示名を変更することはできません。タグ管理画面を使用してください。" }, { status: 400 });
    }
    const unknownPostTag = [...parsed.data.post.tags, ...parsed.data.post.relatedTags]
      .find((id) => !submittedTagIds.has(id));
    if (unknownPostTag) {
      return NextResponse.json({ error: `タグ ${unknownPostTag} がタグ一覧に存在しません。` }, { status: 400 });
    }
    const skipInfo = input.skipInfo === true;
    const tagFiles = JSON.stringify(parsedTagDefinitions.data) === JSON.stringify(pullRequest.tagDefinitions)
      ? []
      : serializeTagFiles(parsedTagDefinitions.data);
    const update = updateContentSchema.safeParse({
      id: pullRequest.updatePath.slice("content/updates/".length, -".json".length),
      publishedAt: getPostUpdatePublishedAt(updatedPost.publishedAt, now),
      target: "post",
      summary: updatedPost.changeNote || `${updatedPost.title}を更新`,
      href: `/blog/${updatedPost.slug}`,
      visible: true,
    });
    if (!update.success) {
      return NextResponse.json({ error: "更新情報がschemaに適合しません。", issues: update.error.issues }, { status: 400 });
    }
    const imageFiles: Array<{ path: string; content: Buffer }> = [];
    for (const entry of input.images ?? []) {
      const extension = allowedImages.get(entry.type);
      if (!extension || entry.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "画像は5MB以下の PNG/JPEG/WebP のみ利用できます。" }, { status: 400 });
      }
      const buffer = Buffer.from(await entry.arrayBuffer());
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) {
        return NextResponse.json({ error: "画像寸法は4096×4096以下にしてください。" }, { status: 400 });
      }
      const safeName = entry.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "image";
      const optimized = await sharp(buffer).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      imageFiles.push({ path: `content/posts/${pullRequest.slug}/images/${safeName}.webp`, content: optimized });
    }
    const result = await updateEditablePostPullRequest({
      number,
      expectedRevision: parsed.data.baseRevision,
      title: `content: ${updatedPost.title}`,
      body: skipInfo
        ? `管理画面から修正\n\nContent-Update: skip\nContent-Update-Reason: INFOに表示しない設定\n\n投稿者: ${auth.session.user?.email ?? "unknown"}`
        : `管理画面から修正\n\n投稿者: ${auth.session.user?.email ?? "unknown"}`,
      files: [{
        path: `content/posts/${pullRequest.slug}/index.md`,
        content: serializePostSource(updatedPost, parsed.data.body),
      }, {
        path: pullRequest.updatePath,
        content: skipInfo ? null : JSON.stringify(update.data, null, 2) + "\n",
      }, ...tagFiles, ...imageFiles],
    });
    return NextResponse.json({ pullRequestUrl: pullRequest.url, number, headRevision: result.headRevision });
  } catch (error) {
    if (isContentConflictError(error)) {
      return NextResponse.json({ code: "CONTENT_CONFLICT", error: error instanceof Error ? error.message : "記事PRが更新されています。再読込してください。" }, { status: 409 });
    }
    if (error instanceof PostImageReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const status = error instanceof ContentPullRequestError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "記事PRを更新できませんでした。" }, { status });
  }
}
