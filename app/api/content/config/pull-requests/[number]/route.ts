import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { prepareBannerWrite, validateBannerImageReferences } from "../../../../../../lib/content/banner-admin";
import { validateCanonicalItems, validateCanonicalJson, type ValidationIssue } from "../../../../../../lib/content/canonical-validation";
import { prepareAnnouncementWrite, prepareAppWrite, prepareToolWrite } from "../../../../../../lib/content/admin-config";
import {
  announcementContentSchema,
  appListSchema,
  gitCommitShaSchema,
  tagDefinitionListSchema,
  toolListSchema,
  updateContentSchema,
} from "@/lib/content/schemas";
import { usesContentFixtures } from "@/lib/content/repository";
import { isContentConflictError } from "@/lib/github/content-conflict";
import { contentAdminGitHubError, logContentAdminGitHubError } from "../../../../../../lib/github/admin-error";
import {
  ContentPullRequestError,
  getEditableContentPullRequest,
  getReservedTagDefinitions,
  updateEditableContentPullRequest,
  type ConfigKind,
} from "@/lib/github/content-writer";
import { prepareTagWrite } from "../../../../../../lib/content/tags-admin";

type Context = { params: Promise<{ number: string }> };

function parseNumber(value: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function parseKind(request: Request): ConfigKind | null {
  const kind = new URL(request.url).searchParams.get("kind");
  return kind === "banners" || kind === "announcements" || kind === "tools" || kind === "apps" || kind === "tags" ? kind : null;
}

function prefixed(prefix: string, issues: ValidationIssue[]) {
  return issues.map((issue) => ({ ...issue, path: [prefix, ...issue.path] }));
}

function zodIssues(prefix: string, issues: Array<{ path: PropertyKey[]; message: string }>): ValidationIssue[] {
  return issues.map((issue) => ({
    path: [prefix, ...issue.path.filter((part): part is string | number => (
      typeof part === "string" || typeof part === "number"
    ))],
    message: issue.message,
  }));
}

function updateMetadata(update: unknown) {
  if (typeof update !== "object" || update === null) return {};
  const candidate = update as { publishedAt?: unknown; summary?: unknown; visible?: unknown };
  return {
    publishedAt: typeof candidate.publishedAt === "string" ? candidate.publishedAt : undefined,
    summary: typeof candidate.summary === "string" ? candidate.summary : undefined,
    visible: typeof candidate.visible === "boolean" ? candidate.visible : undefined,
  };
}

function errorResponse(error: unknown) {
  if (isContentConflictError(error)) {
    return NextResponse.json({ code: "CONTENT_CONFLICT", error: error.message }, { status: 409 });
  }
  if (error instanceof ContentPullRequestError) {
    return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
  }
  logContentAdminGitHubError("Content pull request operation failed", error);
  const response = contentAdminGitHubError(error);
  return NextResponse.json({ code: response.code, error: response.error }, { status: response.status });
}

async function authorize() {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.status === 401 ? "認証が必要です。" : "管理者権限が必要です。" },
      { status: auth.status },
    );
  }
  return auth;
}

export async function GET(request: Request, context: Context) {
  const auth = await authorize();
  if (auth instanceof NextResponse) return auth;
  const number = parseNumber((await context.params).number);
  if (!number) return NextResponse.json({ error: "Pull Request 番号が不正です。" }, { status: 400 });
  const kind = parseKind(request);
  if (!kind) return NextResponse.json({ error: "編集対象 kind が不正です。" }, { status: 400 });
  if (usesContentFixtures()) return NextResponse.json({ error: "fixture モードでは Pull Request を取得できません。" }, { status: 503 });
  try {
    const snapshot = await getEditableContentPullRequest(number, kind);
    const issues = prefixed("update", validateCanonicalJson(snapshot.schemas.update, snapshot.update));
    const parsedUpdate = updateContentSchema.safeParse(snapshot.update);
    if (!parsedUpdate.success) issues.push(...zodIssues("update", parsedUpdate.error.issues));
    if (kind === "banners") {
      issues.push(...prefixed("banners", validateCanonicalJson(snapshot.schemas.home, snapshot.value, "Banners")));
      if (Array.isArray(snapshot.value)) {
        const imageValues = snapshot.value.map((banner) => ({
        image: typeof banner === "object" && banner !== null && typeof (banner as { image?: unknown }).image === "string"
          ? (banner as { image: string }).image
          : "",
        }));
        issues.push(...validateBannerImageReferences(imageValues, new Set(snapshot.paths)));
      }
    } else if (kind === "announcements") {
      const parsed = announcementContentSchema.array().safeParse(snapshot.value);
      if (!parsed.success) issues.push(...zodIssues("announcements", parsed.error.issues));
      issues.push(...prefixed("announcements", validateCanonicalJson(snapshot.schemas.home, snapshot.value, "Announcements")));
    } else if (kind === "tools") {
      const parsed = toolListSchema.safeParse(snapshot.value);
      if (!parsed.success) issues.push(...zodIssues("tools", parsed.error.issues));
      if (Array.isArray(snapshot.value)) {
        issues.push(...prefixed("tools", validateCanonicalItems(snapshot.schemas.tool, snapshot.value)));
      }
    } else if (kind === "apps") {
      const parsed = appListSchema.safeParse(snapshot.value);
      if (!parsed.success) issues.push(...zodIssues("apps", parsed.error.issues));
      if (parsed.success) {
        issues.push(...prefixed("apps", validateCanonicalItems(snapshot.schemas.app, parsed.data)));
      }
    } else {
      const parsed = tagDefinitionListSchema.safeParse(snapshot.value);
      if (!parsed.success) issues.push(...zodIssues("tags", parsed.error.issues));
    }
    return NextResponse.json({
      pullRequest: {
        number: snapshot.number,
        title: snapshot.title,
        url: snapshot.url,
        branch: snapshot.branch,
        kind: snapshot.kind,
        headRevision: snapshot.headRevision,
      },
      kind,
      value: snapshot.value,
      ...(kind === "banners" ? { banners: snapshot.value } : {}),
      update: snapshot.update,
      issues,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: Context) {
  const auth = await authorize();
  if (auth instanceof NextResponse) return auth;
  const number = parseNumber((await context.params).number);
  if (!number) return NextResponse.json({ error: "Pull Request 番号が不正です。" }, { status: 400 });
  const queryKind = parseKind(request);
  if (!queryKind) return NextResponse.json({ error: "編集対象 kind が不正です。" }, { status: 400 });
  if (usesContentFixtures()) return NextResponse.json({ code: "CONTENT_WRITE_DISABLED", error: "fixture モードでは Pull Request を更新できません。" }, { status: 503 });
  try {
    const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
    const form = isMultipart ? await request.formData() : new FormData();
    let data: { kind?: string; expectedRevision?: string; value?: unknown; changeNote?: string; skipInfo?: unknown };
    try {
      data = isMultipart
        ? {
            kind: String(form.get("kind") ?? ""),
            expectedRevision: String(form.get("expectedRevision") ?? ""),
            value: JSON.parse(String(form.get("value") ?? form.get("banners") ?? "null")) as unknown,
            changeNote: String(form.get("changeNote") ?? ""),
            ...(form.has("skipInfo") ? { skipInfo: form.get("skipInfo") === "true" } : {}),
          }
        : await request.json() as typeof data;
    } catch {
      return NextResponse.json({ error: "送信データの JSON が不正です。" }, { status: 400 });
    }
    if (data.kind !== queryKind) {
      return NextResponse.json({ error: "編集対象 kind が一致しません。" }, { status: 400 });
    }
    const revision = gitCommitShaSchema.safeParse(data.expectedRevision);
    if (!revision.success) return NextResponse.json({ error: "head revision が不正です。" }, { status: 400 });
    const snapshot = await getEditableContentPullRequest(number, queryKind);
    if (snapshot.headRevision !== revision.data) {
      return NextResponse.json({ code: "CONTENT_CONFLICT", error: "Pull Request が更新されています。再読込してください。" }, { status: 409 });
    }
    const metadata = updateMetadata(snapshot.update);
    const summary = data.changeNote || metadata.summary || `${queryKind}を更新`;
    const common = {
      updateSchema: snapshot.schemas.update,
      updatePath: snapshot.updatePath,
      updateId: snapshot.branch.slice("content/".length),
      summary,
      publishedAt: metadata.publishedAt,
    };
    const reservedTags = queryKind === "tags" ? await getReservedTagDefinitions(number) : [];
    const prepared = queryKind === "banners"
      ? await prepareBannerWrite({
          form,
          rawBanners: data.value,
          existingPaths: snapshot.paths,
          homeSchema: snapshot.schemas.home,
          ...common,
        })
      : queryKind === "announcements"
        ? prepareAnnouncementWrite({
            rawValue: data.value,
            homeSchema: snapshot.schemas.home,
            ...common,
          })
        : queryKind === "tools"
          ? prepareToolWrite({
            rawValue: data.value,
            currentPaths: snapshot.toolPaths,
            toolSchema: snapshot.schemas.tool,
            ...common,
            visible: typeof data.skipInfo === "boolean" ? !data.skipInfo : metadata.visible,
          })
          : queryKind === "apps"
            ? prepareAppWrite({
                rawValue: data.value,
                currentPaths: snapshot.appPaths,
                appSchema: snapshot.schemas.app,
                ...common,
                visible: typeof data.skipInfo === "boolean" ? !data.skipInfo : metadata.visible,
              })
            : prepareTagWrite({
              rawValue: data.value,
              currentTags: Array.isArray(snapshot.value) ? snapshot.value as Array<{ id: string; label: string }> : [],
              reservedTags,
              postSources: snapshot.postSources,
              ...common,
            });
    if (!prepared.success) {
      return NextResponse.json({ code: "CONTENT_VALIDATION_FAILED", error: "入力内容を確認してください。", issues: prepared.issues }, { status: 400 });
    }
    const updated = await updateEditableContentPullRequest({
      number,
      kind: queryKind,
      expectedRevision: revision.data,
      title: `content: ${queryKind} を修正`,
      files: prepared.files,
    });
    return NextResponse.json({
      pullRequestUrl: updated.url,
      number: updated.number,
      headRevision: updated.headRevision,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
