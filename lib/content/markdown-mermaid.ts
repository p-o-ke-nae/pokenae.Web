type MarkdownNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: MarkdownNode[];
};

export const MERMAID_MIN_ZOOM = 0.5;
export const MERMAID_MAX_ZOOM = 3;
export const MERMAID_ZOOM_STEP = 0.25;

function textContent(node: MarkdownNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textContent).join("");
}

/**
 * ```mermaid コードブロック（pre > code.language-mermaid）ならその本文を返す。
 */
export function getMermaidSource(pre: MarkdownNode | undefined): string | null {
  const code = pre?.children?.find((child) => child.type === "element");
  if (!code || code.tagName !== "code") return null;
  const className = code.properties?.className;
  const classes = Array.isArray(className) ? className.map(String) : typeof className === "string" ? className.split(/\s+/) : [];
  if (!classes.includes("language-mermaid")) return null;
  return textContent(code).replace(/\n$/, "");
}

export function clampMermaidZoom(value: number) {
  const rounded = Math.round(value / MERMAID_ZOOM_STEP) * MERMAID_ZOOM_STEP;
  return Math.min(MERMAID_MAX_ZOOM, Math.max(MERMAID_MIN_ZOOM, rounded));
}
