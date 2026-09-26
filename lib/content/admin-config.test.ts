import { describe, expect, it } from "vitest";
import { buildToolContentChanges } from "./admin-config";

describe("buildToolContentChanges", () => {
  it("adds sha:null-compatible deletion changes for removed slugs", () => {
    const changes = buildToolContentChanges(
      ["content/tools/keep.json", "content/tools/remove.json"],
      [{
        slug: "keep",
        displayName: "Keep",
        summary: "kept tool",
        repository: "owner/keep",
        kind: "library",
        docs: { readme: "README.md", paths: ["docs/"] },
        release: { channel: "stable", manifestRequired: false, package: "Keep" },
      }],
    );

    expect(changes.find((change) => change.path === "content/tools/remove.json")).toEqual({
      path: "content/tools/remove.json",
      content: null,
    });
    expect(changes.find((change) => change.path === "content/tools/keep.json")?.content).toContain('"paths": [');
  });
});
