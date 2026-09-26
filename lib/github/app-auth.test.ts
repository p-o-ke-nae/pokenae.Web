import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAppAuth = vi.fn();
vi.mock("@octokit/auth-app", () => ({ createAppAuth }));

const githubAppEnvironmentKeys = [
  "GITHUB_APP_ID",
  "GITHUB_APP_INSTALLATION_ID",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_APP_PRIVATE_KEY_BASE64",
] as const;

async function loadAppAuth() {
  vi.resetModules();
  return import("./app-auth");
}

describe("GitHub App authentication", () => {
  beforeEach(() => {
    createAppAuth.mockReset();
    for (const key of githubAppEnvironmentKeys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of githubAppEnvironmentKeys) delete process.env[key];
  });

  it("returns undefined when all disabled sentinel values are configured", async () => {
    process.env.GITHUB_APP_ID = "0";
    process.env.GITHUB_APP_INSTALLATION_ID = "0";
    process.env.GITHUB_APP_PRIVATE_KEY_BASE64 = "ZGlzYWJsZWQ=";

    const { getOptionalInstallationToken } = await loadAppAuth();

    await expect(getOptionalInstallationToken()).resolves.toBeUndefined();
    expect(createAppAuth).not.toHaveBeenCalled();
  });

  it.each([
    {
      GITHUB_APP_ID: "0",
      GITHUB_APP_INSTALLATION_ID: "123",
      GITHUB_APP_PRIVATE_KEY_BASE64: Buffer.from("private-key").toString("base64"),
    },
    {
      GITHUB_APP_ID: "123",
      GITHUB_APP_INSTALLATION_ID: "0",
      GITHUB_APP_PRIVATE_KEY_BASE64: "ZGlzYWJsZWQ=",
    },
  ])("rejects partial or mixed disabled sentinel values", async (environment) => {
    Object.assign(process.env, environment);
    const { getOptionalInstallationToken } = await loadAppAuth();

    await expect(getOptionalInstallationToken()).rejects.toThrow(
      "GitHub App の無効化設定と資格情報が混在しています。",
    );
    expect(createAppAuth).not.toHaveBeenCalled();
  });

  it("rejects incomplete non-sentinel credentials", async () => {
    process.env.GITHUB_APP_ID = "123";
    process.env.GITHUB_APP_INSTALLATION_ID = "456";
    const { getOptionalInstallationToken } = await loadAppAuth();

    await expect(getOptionalInstallationToken()).rejects.toThrow(
      "GitHub App の資格情報が一部だけ設定されています。",
    );
    expect(createAppAuth).not.toHaveBeenCalled();
  });

  it("uses configured credentials to request an installation token", async () => {
    const authenticate = vi.fn().mockResolvedValue({ token: "installation-token" });
    createAppAuth.mockReturnValue(authenticate);
    process.env.GITHUB_APP_ID = "123";
    process.env.GITHUB_APP_INSTALLATION_ID = "456";
    process.env.GITHUB_APP_PRIVATE_KEY_BASE64 = Buffer.from("private-key").toString("base64");

    const { getOptionalInstallationToken } = await loadAppAuth();

    await expect(getOptionalInstallationToken()).resolves.toBe("installation-token");
    expect(createAppAuth).toHaveBeenCalledWith({
      appId: "123",
      installationId: 456,
      privateKey: "private-key",
    });
    expect(authenticate).toHaveBeenCalledWith({ type: "installation" });
  });

  it("keeps write operations fail-closed when the disabled sentinel is configured", async () => {
    process.env.GITHUB_APP_ID = "0";
    process.env.GITHUB_APP_INSTALLATION_ID = "0";
    process.env.GITHUB_APP_PRIVATE_KEY_BASE64 = "ZGlzYWJsZWQ=";

    const { getRequiredInstallationToken } = await loadAppAuth();

    await expect(getRequiredInstallationToken()).rejects.toThrow(
      "GitHub App の資格情報が設定されていません。",
    );
  });
});
