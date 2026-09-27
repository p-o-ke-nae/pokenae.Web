import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const tempDirectory = mkdtempSync(join(tmpdir(), "pokenae-vps-env-"));
const outputPath = join(tempDirectory, ".env.docker.production");
const scriptPath = fileURLToPath(new URL("./write-vps-runtime-env.mjs", import.meta.url));
const validEnvironment = {
  NEXTAUTH_URL: "https://example.com",
  NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
  NEXT_PUBLIC_API_URL: "https://api.example.com",
  API_SERVICES: "game-library-api",
  API_SERVICE_GAME_LIBRARY_API_BASE_URL: "https://game-library.example.com",
  CONTENT_REPOSITORY_OWNER: "p-o-ke-nae",
  CONTENT_REPOSITORY_NAME: "pokenae.Content",
  CONTENT_REPOSITORY_REF: "main",
  GAME_LIBRARY_API_VERSION_RANGE: ">=1.0.0 <2.0.0",
};

after(() => rmSync(tempDirectory, { recursive: true, force: true }));

function run(overrides = {}) {
  return spawnSync(process.execPath, [scriptPath, outputPath], {
    encoding: "utf8",
    env: { ...process.env, ...validEnvironment, ...overrides },
  });
}

test("writes quoted dotenv values without losing spaces", () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);

  const content = readFileSync(outputPath, "utf8");
  assert.match(content, /^NEXT_PUBLIC_API_BASE_URL="https:\/\/api\.example\.com"$/m);
  assert.match(content, /^GAME_LIBRARY_API_VERSION_RANGE=">=1\.0\.0 <2\.0\.0"$/m);
  assert.doesNotMatch(content, /^NEXTAUTH_URL=/m);
});

test("rejects a missing required value", () => {
  const result = run({ CONTENT_REPOSITORY_REF: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONTENT_REPOSITORY_REF is not configured/);
});

test("rejects multiline values", () => {
  const result = run({ CONTENT_REPOSITORY_REF: "main\nINVALID=value" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONTENT_REPOSITORY_REF must be a single-line value/);
});

test("rejects non-HTTPS endpoint URLs", () => {
  const result = run({ NEXT_PUBLIC_API_BASE_URL: "http://api.example.com" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NEXT_PUBLIC_API_BASE_URL must use HTTPS/);
});
