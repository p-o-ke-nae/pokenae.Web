import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { announcementContentSchema, bannerContentSchema, toolContentSchema } from "@/lib/content/schemas";
import { createContentPullRequest } from "@/lib/github/content-writer";
import { getFreshContentAdminSnapshot } from "@/lib/content/repository";
import { buildToolContentChanges } from "@/lib/content/admin-config";

type ConfigKind = "banners" | "announcements" | "tools";

export async function POST(request: Request) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) return NextResponse.json({ error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" }, { status: auth.status });
  try {
    const data = await request.json() as { kind?: ConfigKind; value?: unknown; baseRevision?: string; changeNote?: string };
    if (!data.kind || !data.baseRevision) return NextResponse.json({ error: "編集対象またはbase revisionが不正です。" }, { status: 400 });
    const currentSnapshot = await getFreshContentAdminSnapshot();
    if (currentSnapshot.revision !== data.baseRevision) {
      return NextResponse.json({
        code: "CONTENT_CONFLICT",
        error: "公開コンテンツが更新されています。ページを再読込してください。",
      }, { status: 409 });
    }

    let contentFiles: Array<{ path: string; content: string | null }>;
    if (data.kind === "tools") {
      const parsed = toolContentSchema.array().safeParse(data.value);
      if (!parsed.success) return NextResponse.json({ error: "JSONがschemaに適合しません。", issues: parsed.error.issues }, { status: 400 });
      contentFiles = buildToolContentChanges(currentSnapshot.toolPaths, parsed.data);
    } else if (data.kind === "banners") {
      const parsed = bannerContentSchema.array().safeParse(data.value);
      if (!parsed.success) return NextResponse.json({ error: "JSONがschemaに適合しません。", issues: parsed.error.issues }, { status: 400 });
      contentFiles = [{ path: "content/home/banners.json", content: `${JSON.stringify(parsed.data, null, 2)}\n` }];
    } else if (data.kind === "announcements") {
      const parsed = announcementContentSchema.array().safeParse(data.value);
      if (!parsed.success) return NextResponse.json({ error: "JSONがschemaに適合しません。", issues: parsed.error.issues }, { status: 400 });
      contentFiles = [{ path: "content/home/announcements.json", content: `${JSON.stringify(parsed.data, null, 2)}\n` }];
    } else {
      return NextResponse.json({ error: "編集対象が不正です。" }, { status: 400 });
    }

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const branch = `content/${data.kind}-${timestamp}`;
    const pr = await createContentPullRequest({
      branch,
      title: `content: ${data.kind} を更新`,
      body: `管理画面から作成\n\n投稿者: ${auth.session.user?.email ?? "unknown"}`,
      files: [
        ...contentFiles,
        { path: `content/updates/${data.kind}-${timestamp}.json`, content: `${JSON.stringify({ id: `${data.kind}-${timestamp}`, publishedAt: new Date().toISOString(), target: data.kind === "tools" ? "tool" : "home", summary: data.changeNote || `${data.kind}を更新` }, null, 2)}\n` },
      ],
    });
    return NextResponse.json({ pullRequestUrl: pr.html_url }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PR作成に失敗しました。" }, { status: 502 });
  }
}
