import type { z } from "zod";
import {
  announcementContentSchema,
  appListSchema,
  toolListSchema,
  updateContentSchema,
} from "./schemas";
import { validateCanonicalItems, validateCanonicalJson, type ValidationIssue } from "./canonical-validation";

export type ToolContent = z.infer<typeof toolListSchema>[number];
export type AppContent = z.infer<typeof appListSchema>[number];
export type ContentTreeChange = { path: string; content: string | null };
export type ConfigWriteResult<T> =
  | { success: true; value: T; files: ContentTreeChange[] }
  | { success: false; issues: ValidationIssue[] };

type UpdateInput = {
  id: string;
  publishedAt?: string;
  summary: string;
  target: "tool" | "app" | "home";
  href: "/tools" | "/apps" | "/";
};

function zodIssues(prefix: string, issues: Array<{ path: PropertyKey[]; message: string }>): ValidationIssue[] {
  return issues.map((issue) => ({
    path: [prefix, ...issue.path.filter((part): part is string | number => (
      typeof part === "string" || typeof part === "number"
    ))],
    message: issue.message,
  }));
}

function prepareUpdate(input: UpdateInput, updateSchema: string) {
  const parsed = updateContentSchema.safeParse({
    id: input.id,
    publishedAt: input.publishedAt ?? new Date().toISOString(),
    target: input.target,
    summary: input.summary,
    href: input.href,
    visible: true,
  });
  if (!parsed.success) return { success: false as const, issues: zodIssues("update", parsed.error.issues) };
  const issues = validateCanonicalJson(updateSchema, parsed.data)
    .map((issue) => ({ ...issue, path: ["update", ...issue.path] }));
  return issues.length
    ? { success: false as const, issues }
    : { success: true as const, update: parsed.data };
}

export function buildToolContentChanges(currentPaths: readonly string[], tools: readonly ToolContent[]): ContentTreeChange[] {
  const nextPaths = new Set(tools.map((tool) => `content/tools/${tool.slug}.json`));
  const updates = tools.map((tool) => ({
    path: `content/tools/${tool.slug}.json`,
    content: `${JSON.stringify(tool, null, 2)}\n`,
  }));
  const deletions = currentPaths
    .filter((path) => !nextPaths.has(path))
    .map((path) => ({ path, content: null }));
  return [...updates, ...deletions];
}

export function buildAppContentChanges(currentPaths: readonly string[], apps: readonly AppContent[]): ContentTreeChange[] {
  const nextPaths = new Set(apps.map((app) => `content/apps/${app.slug}.json`));
  const updates = apps.map((app) => ({
    path: `content/apps/${app.slug}.json`,
    content: `${JSON.stringify({ ...app, image: app.image ?? null }, null, 2)}\n`,
  }));
  const deletions = currentPaths
    .filter((path) => !nextPaths.has(path))
    .map((path) => ({ path, content: null }));
  return [...updates, ...deletions];
}

export function prepareAnnouncementWrite(input: {
  rawValue: unknown;
  homeSchema: string;
  updateSchema: string;
  updatePath: string;
  updateId: string;
  summary: string;
  publishedAt?: string;
}): ConfigWriteResult<z.infer<typeof announcementContentSchema>[]> {
  const parsed = announcementContentSchema.array().safeParse(input.rawValue);
  if (!parsed.success) return { success: false, issues: zodIssues("announcements", parsed.error.issues) };
  const issues = validateCanonicalJson(input.homeSchema, parsed.data, "Announcements")
    .map((issue) => ({ ...issue, path: ["announcements", ...issue.path] }));
  if (issues.length) return { success: false, issues };
  const update = prepareUpdate({
    id: input.updateId,
    publishedAt: input.publishedAt,
    summary: input.summary,
    target: "home",
    href: "/",
  }, input.updateSchema);
  if (!update.success) return update;
  return {
    success: true,
    value: parsed.data,
    files: [
      { path: "content/home/announcements.json", content: `${JSON.stringify(parsed.data, null, 2)}\n` },
      { path: input.updatePath, content: `${JSON.stringify(update.update, null, 2)}\n` },
    ],
  };
}

export function prepareToolWrite(input: {
  rawValue: unknown;
  currentPaths: readonly string[];
  toolSchema: string;
  updateSchema: string;
  updatePath: string;
  updateId: string;
  summary: string;
  publishedAt?: string;
}): ConfigWriteResult<ToolContent[]> {
  const parsed = toolListSchema.safeParse(input.rawValue);
  if (!parsed.success) return { success: false, issues: zodIssues("tools", parsed.error.issues) };
  const toolIssues = validateCanonicalItems(input.toolSchema, parsed.data)
    .map((issue) => ({ ...issue, path: ["tools", ...issue.path] }));
  if (toolIssues.length) return { success: false, issues: toolIssues };
  const update = prepareUpdate({
    id: input.updateId,
    publishedAt: input.publishedAt,
    summary: input.summary,
    target: "tool",
    href: "/tools",
  }, input.updateSchema);
  if (!update.success) return update;
  return {
    success: true,
    value: parsed.data,
    files: [
      ...buildToolContentChanges(input.currentPaths, parsed.data),
      { path: input.updatePath, content: `${JSON.stringify(update.update, null, 2)}\n` },
    ],
  };
}

export function prepareAppWrite(input: {
  rawValue: unknown;
  currentPaths: readonly string[];
  appSchema: string;
  updateSchema: string;
  updatePath: string;
  updateId: string;
  summary: string;
  publishedAt?: string;
}): ConfigWriteResult<AppContent[]> {
  const parsed = appListSchema.safeParse(input.rawValue);
  if (!parsed.success) return { success: false, issues: zodIssues("apps", parsed.error.issues) };
  const appDocuments = parsed.data.map((app) => ({ ...app, image: app.image ?? null }));
  const appIssues = validateCanonicalItems(input.appSchema, appDocuments)
    .map((issue) => ({ ...issue, path: ["apps", ...issue.path] }));
  if (appIssues.length) return { success: false, issues: appIssues };
  const update = prepareUpdate({
    id: input.updateId,
    publishedAt: input.publishedAt,
    summary: input.summary,
    target: "app",
    href: "/apps",
  }, input.updateSchema);
  if (!update.success) return update;
  return {
    success: true,
    value: parsed.data,
    files: [
      ...buildAppContentChanges(input.currentPaths, parsed.data),
      { path: input.updatePath, content: `${JSON.stringify(update.update, null, 2)}\n` },
    ],
  };
}
