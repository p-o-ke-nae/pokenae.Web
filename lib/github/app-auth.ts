import "server-only";
import { createAppAuth } from "@octokit/auth-app";

type GitHubAppCredentials = {
  appId: string;
  installationId: number;
  privateKey: string;
};

export const GITHUB_APP_DISABLED_SENTINEL = {
  appId: "0",
  installationId: "0",
  privateKeyBase64: "ZGlzYWJsZWQ=",
} as const;

let authClient: ReturnType<typeof createAppAuth> | undefined;

function readCredentials(): GitHubAppCredentials | undefined {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const encodedKey = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
  const directPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const sentinelMatches = [
    appId === GITHUB_APP_DISABLED_SENTINEL.appId,
    installationId === GITHUB_APP_DISABLED_SENTINEL.installationId,
    encodedKey === GITHUB_APP_DISABLED_SENTINEL.privateKeyBase64,
  ];
  const sentinelCount = sentinelMatches.filter(Boolean).length;
  if (sentinelCount === 3 && !directPrivateKey) return undefined;
  if (sentinelCount > 0) {
    throw new Error("GitHub App の無効化設定と資格情報が混在しています。");
  }

  const privateKey = directPrivateKey
    ?? (encodedKey ? Buffer.from(encodedKey, "base64").toString("utf8") : undefined);
  const configured = [appId, installationId, privateKey].filter(Boolean).length;
  if (configured === 0) return undefined;
  if (configured !== 3) throw new Error("GitHub App の資格情報が一部だけ設定されています。");
  const parsedInstallationId = Number(installationId);
  if (!Number.isSafeInteger(parsedInstallationId) || parsedInstallationId <= 0) {
    throw new Error("GITHUB_APP_INSTALLATION_ID が不正です。");
  }
  return { appId: appId!, installationId: parsedInstallationId, privateKey: privateKey!.replace(/\\n/g, "\n") };
}

export async function getOptionalInstallationToken(): Promise<string | undefined> {
  const credentials = readCredentials();
  if (!credentials) return undefined;
  authClient ??= createAppAuth(credentials);
  return (await authClient({ type: "installation" })).token;
}

export async function getRequiredInstallationToken(): Promise<string> {
  const token = await getOptionalInstallationToken();
  if (!token) throw new Error("GitHub App の資格情報が設定されていません。");
  return token;
}
