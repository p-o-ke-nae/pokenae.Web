import { z } from "zod";
import semver from "semver";
import { getApiConfig, type ApiServiceName } from "./api-config";

const contracts: Record<string, { versionRange: string; capabilities: string[] }> = {
  "game-library-api": {
    versionRange: process.env.GAME_LIBRARY_API_VERSION_RANGE ?? ">=1.0.0 <2.0.0",
    capabilities: ["game-library", "save-data-search"],
  },
};

const capabilityResponseSchema = z.object({
  version: z.string(),
  capabilities: z.array(z.string()),
});

export async function checkServiceCompatibility(service: ApiServiceName) {
  const contract = contracts[service];
  if (!contract) return { compatible: true as const, version: "unmanaged", missingCapabilities: [] };
  try {
    const baseUrl = getApiConfig(service).baseUrl.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/capabilities`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { compatible: false as const, reason: `サービス応答エラー (${response.status})` };
    const data = capabilityResponseSchema.parse(await response.json());
    const missingCapabilities = contract.capabilities.filter((capability) => !data.capabilities.includes(capability));
    if (!semver.satisfies(data.version, contract.versionRange) || missingCapabilities.length) {
      return { compatible: false as const, reason: "対応していないサービスバージョンまたは機能です。", version: data.version, missingCapabilities };
    }
    return { compatible: true as const, version: data.version, missingCapabilities };
  } catch {
    return { compatible: false as const, reason: "サービスへ接続できませんでした。" };
  }
}
