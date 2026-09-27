import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { usesContentFixtures } from "@/lib/content/repository";
import {
  listEditableContentPullRequests,
  type ConfigKind,
} from "@/lib/github/content-writer";
import { contentAdminGitHubError, logContentAdminGitHubError } from "../../../../../lib/github/admin-error";

function parseKind(request: Request): ConfigKind | null {
  const kind = new URL(request.url).searchParams.get("kind");
  return kind === "banners" || kind === "announcements" || kind === "tools" || kind === "apps" || kind === "tags" ? kind : null;
}

export async function GET(request: Request) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" },
      { status: auth.status },
    );
  }
  const kind = parseKind(request);
  if (!kind) return NextResponse.json({ error: "編集対象 kind が不正です。" }, { status: 400 });
  if (usesContentFixtures()) return NextResponse.json({ pullRequests: [] });
  try {
    return NextResponse.json({ pullRequests: await listEditableContentPullRequests(kind) });
  } catch (error) {
    logContentAdminGitHubError("Content pull request listing failed", error);
    const response = contentAdminGitHubError(error);
    return NextResponse.json({ code: response.code, error: response.error }, { status: response.status });
  }
}
