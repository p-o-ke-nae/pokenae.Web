import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://127.0.0.1:5000", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5000",
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      CONTENT_SOURCE: "fixture",
      NEXTAUTH_SECRET: "e2e-secret",
      GOOGLE_CLIENT_ID: "e2e-client",
      GOOGLE_CLIENT_SECRET: "e2e-secret",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
