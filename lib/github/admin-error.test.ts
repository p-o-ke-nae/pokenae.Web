import { describe, expect, it } from "vitest";
import {
  contentAdminGitHubError,
  GitHubApiError,
  GitHubAppConfigurationError,
} from "./admin-error";

describe("contentAdminGitHubError", () => {
  it("distinguishes missing configuration from invalid credentials", () => {
    expect(contentAdminGitHubError(new GitHubAppConfigurationError(
      "missing",
      "GITHUB_APP_NOT_CONFIGURED",
    ))).toMatchObject({ code: "GITHUB_APP_NOT_CONFIGURED", status: 503 });
    expect(contentAdminGitHubError(new GitHubApiError(401, "/pulls")))
      .toMatchObject({ code: "GITHUB_APP_INVALID", status: 502 });
  });

  it("maps repository access and transient failures without response details", () => {
    expect(contentAdminGitHubError(new GitHubApiError(403, "/pulls")))
      .toMatchObject({ code: "GITHUB_APP_FORBIDDEN", status: 502 });
    expect(contentAdminGitHubError(new GitHubApiError(404, "/pulls")))
      .toMatchObject({ code: "GITHUB_APP_NOT_INSTALLED", status: 502 });
    expect(contentAdminGitHubError(new GitHubApiError(429, "/pulls")))
      .toMatchObject({ code: "GITHUB_RATE_LIMITED", status: 503 });
    expect(contentAdminGitHubError(new Error("upstream details")))
      .toEqual({
        code: "GITHUB_UNAVAILABLE",
        error: "GitHub API を利用できません。時間をおいて再試行してください。",
        status: 502,
      });
  });
});
