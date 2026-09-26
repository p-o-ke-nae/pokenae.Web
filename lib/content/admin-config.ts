import type { z } from "zod";
import type { toolContentSchema } from "./schemas";

export type ToolContent = z.infer<typeof toolContentSchema>;
export type ContentTreeChange = { path: string; content: string | null };

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
