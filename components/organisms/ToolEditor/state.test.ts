import { describe, expect, it } from "vitest";
import { toolListSchema } from "../../../lib/content/schemas";
import { normalizeTools, readToolsPayload, serializeTools } from "./index";

describe("ToolEditor state", () => {
  it("normalizes every schema field into editable values", () => {
    const [tool] = normalizeTools([{
      slug: "save-editor",
      displayName: "Save Editor",
      summary: "セーブデータを編集します。",
      repository: "p-o-ke-nae/save-editor",
      kind: "windows-app",
      image: "/images/save-editor.webp",
      supportedOs: ["Windows 11", "Windows 10"],
      docs: {
        readme: "./README.md",
        paths: ["./docs/install.md", "./docs/usage.md"],
      },
      release: {
        channel: "stable",
        manifestRequired: false,
        unsignedInstaller: true,
        package: "save-editor",
      },
      showInPickup: false,
      priority: 3,
    }]);

    expect(tool).toMatchObject({
      slug: "save-editor",
      displayName: "Save Editor",
      summary: "セーブデータを編集します。",
      repository: "p-o-ke-nae/save-editor",
      kind: "windows-app",
      image: "/images/save-editor.webp",
      supportedOs: ["Windows 11", "Windows 10"],
      docs: {
        readme: "./README.md",
        paths: ["./docs/install.md", "./docs/usage.md"],
      },
      release: {
        channel: "stable",
        manifestRequired: "false",
        unsignedInstaller: "true",
        package: "save-editor",
      },
      showInPickup: "false",
      priority: "3",
    });
  });

  it("keeps malformed source values editable without throwing", () => {
    const [tool] = normalizeTools([{
      slug: 123,
      kind: "unknown",
      supportedOs: [null, "Linux"],
      docs: null,
      release: { manifestRequired: "yes" },
    }]);

    expect(tool).toMatchObject({
      slug: "",
      displayName: "",
      kind: "",
      supportedOs: ["", "Linux"],
      docs: { readme: "", paths: [] },
      release: { manifestRequired: "" },
      priority: "",
    });
  });

  it("keeps canonical nested objects while omitting empty optional values", () => {
    const [draft] = normalizeTools([{
      slug: "library",
      displayName: "Library",
      summary: "A library",
      repository: "owner/library",
      kind: "library",
      supportedOs: [""],
      docs: { readme: "", paths: [""] },
    }]);

    const [serialized] = serializeTools([draft]);

    expect(serialized).toEqual({
      slug: "library",
      displayName: "Library",
      summary: "A library",
      repository: "owner/library",
      kind: "library",
      image: undefined,
      supportedOs: undefined,
      tags: [],
      docs: { readme: "", paths: [] },
      release: {
        channel: "",
        manifestRequired: undefined,
        unsignedInstaller: undefined,
        package: undefined,
      },
      showInPickup: undefined,
      priority: undefined,
    });
    expect(JSON.parse(JSON.stringify(serialized))).toEqual({
      slug: "library",
      displayName: "Library",
      summary: "A library",
      repository: "owner/library",
      kind: "library",
      tags: [],
      docs: { readme: "", paths: [] },
      release: { channel: "" },
    });
  });

  it("serializes arrays, nested values, false booleans, and priority", () => {
    const [draft] = normalizeTools([{
      slug: "tool",
      displayName: "Tool",
      summary: "A tool",
      repository: "owner/tool",
      kind: "windows-app",
    }]);
    draft.image = "https://example.com/tool.png";
    draft.supportedOs = ["Windows"];
    draft.docs = { readme: "./README.md", paths: ["./docs/guide.md"] };
    draft.release = {
      channel: "stable",
      manifestRequired: "false",
      unsignedInstaller: "true",
      package: "tool",
    };
    draft.showInPickup = "false";
    draft.priority = "0";

    const [serialized] = serializeTools([draft]);

    expect(serialized).toMatchObject({
      image: "https://example.com/tool.png",
      supportedOs: ["Windows"],
      docs: { readme: "./README.md", paths: ["./docs/guide.md"] },
      release: {
        channel: "stable",
        manifestRequired: false,
        unsignedInstaller: true,
        package: "tool",
      },
      showInPickup: false,
      priority: 0,
    });
    expect(toolListSchema.safeParse([serialized]).success).toBe(true);
  });

  it("reads the generic PR value response and rejects a missing list", () => {
    const value = [{ slug: "tool" }];
    expect(readToolsPayload({ value })).toBe(value);
    expect(() => readToolsPayload({})).toThrow("Pull Request のツールデータが不正です。");
  });

  it("rejects duplicate slugs before saving", () => {
    const tool = {
      slug: "duplicate",
      displayName: "Duplicate",
      summary: "A tool",
      repository: "owner/tool",
      kind: "library" as const,
    };
    const result = toolListSchema.safeParse([tool, tool]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: [1, "slug"], message: "slug は重複できません。" }),
    ]));
  });
});
