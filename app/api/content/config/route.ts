import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { announcementSchema, bannerSchema, toolContentSchema } from "@/lib/content/schemas";
import { createContentPullRequest } from "@/lib/github/content-writer";

const definitions = {
  banners: { path: "content/home/banners.json", schema: bannerSchema.array() },
  announcements: { path: "content/home/announcements.json", schema: announcementSchema.array() },
  tools: { path: "content/tools", schema: toolContentSchema.array() },
} as const;

export async function POST(request: Request) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) return NextResponse.json({ error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" }, { status: auth.status });
  try {
    const data = await request.json() as { kind?: keyof typeof definitions; value?: unknown; changeNote?: string };
    if (!data.kind || !(data.kind in definitions)) return NextResponse.json({ error: "編集対象が不正です。" }, { status: 400 });
    const definition = definitions[data.kind];
    const parsed = definition.schema.safeParse(data.value);
    if (!parsed.success) return NextResponse.json({ error: "JSONがschemaに適合しません。", issues: parsed.error.issues }, { status: 400 });
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const branch = `content/${data.kind}-${timestamp}`;
    const contentFiles = data.kind === "tools"
      ? (parsed.data as Array<{ slug: string }>).map((tool) => ({ path: `content/tools/${tool.slug}.json`, content: `${JSON.stringify(tool, null, 2)}\n` }))
      : [{ path: definition.path, content: `${JSON.stringify(parsed.data, null, 2)}\n` }];
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
