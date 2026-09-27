import { NextResponse } from "next/server";
import { getContentSnapshot } from "@/lib/content/repository";
import { getValidatedToolRelease } from "@/lib/tools/releases";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = (await getContentSnapshot()).tools.find((item) => item.slug === slug);
  if (!tool) return NextResponse.json({ error: "ツールが見つかりません。" }, { status: 404 });
  const result = await getValidatedToolRelease(tool);
  return NextResponse.json(result, {
    status: result.available ? 200 : 503,
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
  });
}
