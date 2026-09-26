import { expect, test } from "@playwright/test";

test("トップのセクション順と固定ライトテーマ", async ({ page }) => {
  await page.goto("/");
  const headings = await page.locator("main h2").allTextContents();
  expect(headings).toEqual(["PICKUP", "INFO", "BLOG", "SNS"]);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("公開導線とモバイルSidebar順序", async ({ page }, testInfo) => {
  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "ツール開発室" })).toBeVisible();
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "ブログ" })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const order = await page.locator(".site-frame").evaluate((element) => Array.from(element.children).map((child) => child.className));
    expect(order).toEqual(["site-frame__content", "sidebar"]);
  }
});
