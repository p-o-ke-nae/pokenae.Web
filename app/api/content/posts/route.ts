import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { getContentSnapshot } from "@/lib/content/repository";
import { postFrontmatterSchema } from "@/lib/content/schemas";
import { createContentPullRequest } from "@/lib/github/content-writer";

const allowedImages = new Map([["image/png", ".png"], ["image/jpeg", ".jpg"], ["image/webp", ".webp"]]);

export async function GET() {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) return NextResponse.json({ error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" }, { status: auth.status });
  return NextResponse.json({ posts: (await getContentSnapshot()).posts });
}

export async function POST(request: Request) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) return NextResponse.json({ error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" }, { status: auth.status });
  try {
    const form = await request.formData();
    const payload = JSON.parse(String(form.get("post") ?? "{}")) as unknown;
    const parsed = postFrontmatterSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "記事メタデータが不正です。", issues: parsed.error.issues }, { status: 400 });
    const body = String(form.get("body") ?? "");
    if (!body.trim()) return NextResponse.json({ error: "本文は必須です。" }, { status: 400 });
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const branch = `content/${parsed.data.slug}-${timestamp}`;
    const frontmatter = Object.entries(parsed.data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
    const files: { path: string; content: Buffer | string }[] = [
      { path: `content/posts/${parsed.data.slug}/index.md`, content: `---\n${frontmatter}\n---\n\n${body.trim()}\n` },
      { path: `content/updates/${parsed.data.slug}-${timestamp}.json`, content: JSON.stringify({ id: `${parsed.data.slug}-${timestamp}`, publishedAt: new Date().toISOString(), target: "post", summary: parsed.data.changeNote || `${parsed.data.title}を更新`, href: `/blog/${parsed.data.slug}` }, null, 2) + "\n" },
    ];
    for (const entry of form.getAll("images")) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      const extension = allowedImages.get(entry.type);
      if (!extension || entry.size > 5 * 1024 * 1024) return NextResponse.json({ error: "画像は5MB以下の PNG/JPEG/WebP のみ利用できます。" }, { status: 400 });
      const buffer = Buffer.from(await entry.arrayBuffer());
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) return NextResponse.json({ error: "画像寸法は4096×4096以下にしてください。" }, { status: 400 });
      const safeName = entry.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "image";
      const optimized = await sharp(buffer).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      files.push({ path: `content/posts/${parsed.data.slug}/images/${safeName}.webp`, content: optimized });
    }
    const pr = await createContentPullRequest({ branch, title: `content: ${parsed.data.title}`, body: `管理画面から作成\n\n投稿者: ${auth.session.user?.email ?? "unknown"}`, files });
    return NextResponse.json({ pullRequestUrl: pr.html_url, number: pr.number }, { status: 201 });
  } catch (error) {
    console.error("Content write failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "PR の作成に失敗しました。" }, { status: 502 });
  }
}
