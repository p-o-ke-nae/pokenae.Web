import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { announcementContentSchema, gitCommitShaSchema, updateContentSchema } from "@/lib/content/schemas";
import { createContentPullRequest, getReservedTagDefinitions } from "@/lib/github/content-writer";
import { getFreshContentAdminSnapshot, usesContentFixtures } from "@/lib/content/repository";
import { prepareAppWrite, prepareToolWrite } from "@/lib/content/admin-config";
import { isContentConflictError } from "@/lib/github/content-conflict";
import { contentAdminGitHubError, logContentAdminGitHubError } from "../../../../lib/github/admin-error";
import { prepareBannerWrite } from "../../../../lib/content/banner-admin";
import { validateCanonicalJson } from "../../../../lib/content/canonical-validation";
import { prepareTagWrite } from "../../../../lib/content/tags-admin";

type ConfigKind = "banners" | "announcements" | "tools" | "apps" | "tags";

function isConfigKind(value: unknown): value is ConfigKind {
  return value === "banners"
    || value === "announcements"
    || value === "tools"
    || value === "apps"
    || value === "tags";
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
    const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
    const form = isMultipart ? await request.formData() : new FormData();
    let data: { kind?: ConfigKind; value?: unknown; baseRevision?: string; changeNote?: string };
    if (isMultipart) {
      try {
        data = {
          kind: String(form.get("kind") ?? "") as ConfigKind,
          value: JSON.parse(String(form.get("value") ?? "null")) as unknown,
          baseRevision: String(form.get("baseRevision") ?? ""),
          changeNote: String(form.get("changeNote") ?? ""),
        };
      } catch {
        return NextResponse.json({ error: "送信データの JSON が不正です。", issues: [{ path: ["banners"], message: "JSON を解析できません。" }] }, { status: 400 });
      }
    } else {
      data = await request.json() as typeof data;
    }
    const revision = gitCommitShaSchema.safeParse(data.baseRevision);
    if (!isConfigKind(data.kind) || !revision.success) {
      return NextResponse.json({ error: "編集対象またはbase revisionが不正です。" }, { status: 400 });
    }
    const currentSnapshot = await getFreshContentAdminSnapshot();
    if (currentSnapshot.revision !== revision.data) {
      return NextResponse.json({
        code: "CONTENT_CONFLICT",
        error: "公開コンテンツが更新されています。ページを再読込してください。",
      }, { status: 409 });
    }

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const updateId = `${data.kind}-${timestamp}`;
    const updatePath = `content/updates/${updateId}.json`;
    let contentFiles: Array<{ path: string; content: Buffer | string | null }>;
    if (data.kind === "tools") {
      const prepared = prepareToolWrite({
        rawValue: data.value,
        currentPaths: currentSnapshot.toolPaths,
        toolSchema: currentSnapshot.schemas.tool,
        updateSchema: currentSnapshot.schemas.update,
        updatePath,
        updateId,
        summary: data.changeNote || "ツールを更新",
      });
      if (!prepared.success) {
        return NextResponse.json({
          code: "CONTENT_VALIDATION_FAILED",
          error: "入力内容がpokenae.Contentのcanonical schemaに適合しません。",
          issues: prepared.issues,
        }, { status: 400 });
      }
      contentFiles = prepared.files;
    } else if (data.kind === "apps") {
      const prepared = prepareAppWrite({
        rawValue: data.value,
        currentPaths: currentSnapshot.appPaths,
        appSchema: currentSnapshot.schemas.app,
        updateSchema: currentSnapshot.schemas.update,
        updatePath,
        updateId,
        summary: data.changeNote || "Webアプリを更新",
      });
      if (!prepared.success) {
        return NextResponse.json({
          code: "CONTENT_VALIDATION_FAILED",
          error: "入力内容がpokenae.Contentのcanonical schemaに適合しません。",
          issues: prepared.issues,
        }, { status: 400 });
      }
      contentFiles = prepared.files;
    } else if (data.kind === "banners") {
      const prepared = await prepareBannerWrite({
        form,
        rawBanners: data.value,
        existingPaths: currentSnapshot.paths,
        homeSchema: currentSnapshot.schemas.home,
        updateSchema: currentSnapshot.schemas.update,
        updatePath,
        updateId,
        summary: data.changeNote || "バナーを更新",
      });
      if (!prepared.success) {
        return NextResponse.json({ code: "CONTENT_VALIDATION_FAILED", error: "入力内容を確認してください。", issues: prepared.issues }, { status: 400 });
      }
      contentFiles = prepared.files;
    } else if (data.kind === "announcements") {
      const parsed = announcementContentSchema.array().safeParse(data.value);
      if (!parsed.success) return NextResponse.json({ error: "JSONがschemaに適合しません。", issues: parsed.error.issues }, { status: 400 });
      const canonicalIssues = validateCanonicalJson(currentSnapshot.schemas.home, parsed.data, "Announcements");
      if (canonicalIssues.length) return NextResponse.json({ error: "JSONがcanonical schemaに適合しません。", issues: canonicalIssues }, { status: 400 });
      contentFiles = [{ path: "content/home/announcements.json", content: `${JSON.stringify(parsed.data, null, 2)}\n` }];
    } else if (data.kind === "tags") {
      const reservedTags = await getReservedTagDefinitions();
      const prepared = prepareTagWrite({
        rawValue: data.value,
        currentTags: currentSnapshot.tags,
        reservedTags,
        postSources: currentSnapshot.postSources,
        updateSchema: currentSnapshot.schemas.update,
        updatePath,
        updateId,
        summary: data.changeNote || "タグを更新",
      });
      if (!prepared.success) {
        return NextResponse.json({
          code: "CONTENT_VALIDATION_FAILED",
          error: "タグの入力内容を確認してください。",
          issues: prepared.issues,
        }, { status: 400 });
      }
      contentFiles = prepared.files;
    } else {
      return NextResponse.json({ error: "編集対象が不正です。" }, { status: 400 });
    }

    if (data.kind === "announcements") {
      const update = updateContentSchema.parse({
        id: updateId,
        publishedAt: new Date().toISOString(),
        target: "home",
        summary: data.changeNote || `${data.kind}を更新`,
        href: "/",
        visible: true,
      });
      const updateIssues = validateCanonicalJson(currentSnapshot.schemas.update, update);
      if (updateIssues.length) return NextResponse.json({ error: "更新情報がcanonical schemaに適合しません。", issues: updateIssues }, { status: 400 });
      contentFiles.push({ path: updatePath, content: `${JSON.stringify(update, null, 2)}\n` });
    }
    const branch = `content/${data.kind}-${timestamp}`;
    const pr = await createContentPullRequest({
      branch,
      title: `content: ${data.kind} を更新`,
      body: `管理画面から作成\n\n投稿者: ${auth.session.user?.email ?? "unknown"}`,
      expectedRevision: revision.data,
      files: contentFiles,
    });
    return NextResponse.json({ pullRequestUrl: pr.html_url, number: pr.number }, { status: 201 });
  } catch (error) {
    if (isContentConflictError(error)) {
      return NextResponse.json({ code: "CONTENT_CONFLICT", error: error.message }, { status: 409 });
    }
    logContentAdminGitHubError("Content config write failed", error);
    const response = contentAdminGitHubError(error);
    return NextResponse.json({ code: response.code, error: response.error }, { status: response.status });
  }
}
