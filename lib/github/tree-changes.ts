export type ContentFileChange = {
  path: string;
  content: Buffer | string | null;
};

export type GitTreeEntry = {
  path: string;
  mode: "100644";
  type: "blob";
  sha: string | null;
};

export async function materializeGitTreeEntries(
  files: readonly ContentFileChange[],
  createBlob: (file: { path: string; content: Buffer | string }) => Promise<string>,
): Promise<GitTreeEntry[]> {
  return Promise.all(files.map(async (file) => ({
    path: file.path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: file.content === null ? null : await createBlob({ path: file.path, content: file.content }),
  })));
}
