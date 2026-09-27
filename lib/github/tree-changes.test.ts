import { describe, expect, it, vi } from "vitest";
import { materializeGitTreeEntries } from "./tree-changes";

describe("materializeGitTreeEntries", () => {
  it("emits sha:null without creating a blob for deleted files", async () => {
    const createBlob = vi.fn(async () => "new-blob-sha");
    const entries = await materializeGitTreeEntries([
      { path: "content/tools/keep.json", content: "{}\n" },
      { path: "content/tools/remove.json", content: null },
    ], createBlob);

    expect(entries).toEqual([
      { path: "content/tools/keep.json", mode: "100644", type: "blob", sha: "new-blob-sha" },
      { path: "content/tools/remove.json", mode: "100644", type: "blob", sha: null },
    ]);
    expect(createBlob).toHaveBeenCalledTimes(1);
  });
});
