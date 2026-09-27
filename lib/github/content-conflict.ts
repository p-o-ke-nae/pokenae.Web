export class ContentConflictError extends Error {
  constructor(message = "公開コンテンツが更新されています。ページを再読込してください。") {
    super(message);
    this.name = "ContentConflictError";
  }
}

export function isContentConflictError(error: unknown): error is ContentConflictError {
  return error instanceof ContentConflictError;
}
