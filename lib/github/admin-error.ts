export type ContentAdminGitHubErrorCode =
  | "GITHUB_APP_NOT_CONFIGURED"
  | "GITHUB_APP_INVALID"
  | "GITHUB_APP_FORBIDDEN"
  | "GITHUB_APP_NOT_INSTALLED"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_UNAVAILABLE";

export class GitHubAppConfigurationError extends Error {
  constructor(
    message: string,
    public readonly code: "GITHUB_APP_NOT_CONFIGURED" | "GITHUB_APP_INVALID",
  ) {
    super(message);
    this.name = "GitHubAppConfigurationError";
  }
}

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
  ) {
    super(`GitHub API request failed (${status})`);
    this.name = "GitHubApiError";
  }
}

export function contentAdminGitHubError(error: unknown): {
  code: ContentAdminGitHubErrorCode;
  error: string;
  status: number;
} {
  if (error instanceof GitHubAppConfigurationError) {
    return {
      code: error.code,
      error: error.code === "GITHUB_APP_NOT_CONFIGURED"
        ? "GitHub App がこの環境に設定されていません。管理者に設定を確認してください。"
        : "GitHub App の設定が不正です。管理者に資格情報を確認してください。",
      status: 503,
    };
  }
  if (error instanceof GitHubApiError) {
    if (error.status === 401) {
      return { code: "GITHUB_APP_INVALID", error: "GitHub App の認証に失敗しました。管理者に資格情報を確認してください。", status: 502 };
    }
    if (error.status === 403) {
      return { code: "GITHUB_APP_FORBIDDEN", error: "GitHub App に必要なリポジトリ権限がありません。管理者に権限設定を確認してください。", status: 502 };
    }
    if (error.status === 404) {
      return { code: "GITHUB_APP_NOT_INSTALLED", error: "GitHub App のインストール先リポジトリを確認できません。管理者に設定を確認してください。", status: 502 };
    }
    if (error.status === 429) {
      return { code: "GITHUB_RATE_LIMITED", error: "GitHub API の利用上限に達しました。時間をおいて再試行してください。", status: 503 };
    }
  }
  return {
    code: "GITHUB_UNAVAILABLE",
    error: "GitHub API を利用できません。時間をおいて再試行してください。",
    status: 502,
  };
}

export function logContentAdminGitHubError(context: string, error: unknown) {
  const classified = contentAdminGitHubError(error);
  const details = error instanceof GitHubApiError
    ? { code: classified.code, status: error.status, path: error.path }
    : { code: classified.code, name: error instanceof Error ? error.name : "UnknownError" };
  console.error(context, details);
}
