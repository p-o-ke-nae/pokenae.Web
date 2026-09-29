import { describe, expect, it } from "vitest";
import { clampMermaidZoom, getMermaidSource, MERMAID_MAX_ZOOM, MERMAID_MIN_ZOOM } from "./markdown-mermaid";

describe("markdown mermaid helpers", () => {
  it("extracts source from a mermaid code block", () => {
    expect(getMermaidSource({
      type: "element",
      tagName: "pre",
      children: [{
        type: "element",
        tagName: "code",
        properties: { className: ["language-mermaid"] },
        children: [{ type: "text", value: "graph TD\n  A-->B\n" }],
      }],
    })).toBe("graph TD\n  A-->B");
  });

  it("ignores other code blocks", () => {
    expect(getMermaidSource({
      type: "element",
      tagName: "pre",
      children: [{
        type: "element",
        tagName: "code",
        properties: { className: ["language-ts"] },
        children: [{ type: "text", value: "const a = 1;" }],
      }],
    })).toBeNull();
    expect(getMermaidSource(undefined)).toBeNull();
  });

  it("clamps zoom to the supported range and step", () => {
    expect(clampMermaidZoom(10)).toBe(MERMAID_MAX_ZOOM);
    expect(clampMermaidZoom(0)).toBe(MERMAID_MIN_ZOOM);
    expect(clampMermaidZoom(1.3)).toBe(1.25);
  });
});
