import { chmodSync, writeFileSync } from "node:fs";

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error("Output path is required");
}

const runtimeKeys = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_API_URL",
  "API_SERVICES",
  "API_SERVICE_GAME_LIBRARY_API_BASE_URL",
  "CONTENT_REPOSITORY_OWNER",
  "CONTENT_REPOSITORY_NAME",
  "CONTENT_REPOSITORY_REF",
  "GAME_LIBRARY_API_VERSION_RANGE",
];

const requiredKeys = ["NEXTAUTH_URL", ...runtimeKeys];
for (const key of requiredKeys) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not configured in the selected GitHub Environment`);
  }
  if (/[\r\n]/.test(value)) {
    throw new Error(`${key} must be a single-line value`);
  }
}

for (const key of [
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_API_URL",
  "API_SERVICE_GAME_LIBRARY_API_BASE_URL",
]) {
  const url = new URL(process.env[key]);
  if (url.protocol !== "https:") {
    throw new Error(`${key} must use HTTPS`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${key} must be a base URL without credentials, query, or fragment`);
  }
}

const content = runtimeKeys
  .map((key) => `${key}=${JSON.stringify(process.env[key])}`)
  .join("\n");

writeFileSync(outputPath, `${content}\n`, { encoding: "utf8", mode: 0o600 });
chmodSync(outputPath, 0o600);
