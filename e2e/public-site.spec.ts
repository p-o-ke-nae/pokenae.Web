import { expect, test } from "@playwright/test";

test("トップのセクション順と固定ライトテーマ", async ({ page }, testInfo) => {
  await page.goto("/");
  const headings = await page.locator("main h2").allTextContents();
  expect(headings).toEqual(["PICKUP", "INFO", "BLOG", "SNS"]);
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "ニュースを停止" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "前のスライド" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "次のスライド" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "停止" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "INFO" }).getByRole("time")).toHaveText("2026-09-26");
  await expect(page.getByText(/2026-09-26T/)).toHaveCount(0);
  await expect(page.locator(".info-list__items")).toHaveCSS("background-color", "rgb(201, 198, 206)");

  const heroBox = await page.locator(".home-hero").boundingBox();
  const tickerBox = await page.locator(".ticker").boundingBox();
  expect(heroBox).not.toBeNull();
  expect(tickerBox).not.toBeNull();
  expect(tickerBox!.y - (heroBox!.y + heroBox!.height)).toBe(16);

  const firstCard = page.locator(".card-h").first();
  await expect(firstCard).toHaveCSS("border-radius", "0px");
  await expect(firstCard).toHaveCSS("border-top-width", "2px");
  const firstSocialCard = page.locator(".social-grid a").first();
  await expect(firstSocialCard).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(firstSocialCard).toHaveCSS("border-top-width", "2px");
  if (testInfo.project.name === "desktop") {
    await firstCard.hover();
    await expect(firstCard).toHaveCSS("border-right-color", "rgb(121, 85, 118)");
    await expect(firstCard.locator(".card-h__title")).toHaveCSS("color", "rgb(121, 85, 118)");
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("公開導線とモバイルSidebar順序", async ({ page }, testInfo) => {
  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "ツール開発室" })).toBeVisible();
  expect(await page.locator(".sidebar__section > h2").allTextContents()).toEqual(["PICKUP", "関連アイテム"]);
  const sidebarBanner = page.locator(".sidebar-banner");
  await expect(sidebarBanner).toBeVisible();
  await expect(sidebarBanner.getByRole("link", { name: "個体値特定ツール（ozaroom.com）を開く" })).toHaveAttribute(
    "href",
    "https://ozaroom.com/tool/7.html",
  );
  await expect(sidebarBanner.getByRole("link", { name: "このバナーの作成者ブログを開く" })).toHaveAttribute(
    "href",
    "https://shuahpkmn.hatenablog.jp/entry/rta-iv-calc",
  );
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "ブログ" })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const order = await page.locator(".site-frame").evaluate((element) => Array.from(element.children).map((child) => (
      child.classList.contains("sidebar") ? "sidebar" : child.className
    )));
    expect(order).toEqual(["site-frame__content", "sidebar"]);

    const compactCard = page.locator(".sidebar .card-h--compact").first();
    const compactImage = compactCard.locator(".card-h__image-wrap");
    const compactDescription = compactCard.locator(".card-h__description");
    const compactMeta = compactCard.locator(".card-h__meta");
    const [cardBox, imageBox, descriptionBox, metaBox] = await Promise.all([
      compactCard.boundingBox(),
      compactImage.boundingBox(),
      compactDescription.boundingBox(),
      compactMeta.boundingBox(),
    ]);
    expect(cardBox).not.toBeNull();
    expect(imageBox).not.toBeNull();
    expect(descriptionBox).not.toBeNull();
    expect(metaBox).not.toBeNull();
    expect(imageBox!.height).toBeLessThanOrEqual(121);
    expect(cardBox!.height).toBeLessThan(240);
    expect(metaBox!.y - (descriptionBox!.y + descriptionBox!.height)).toBeLessThanOrEqual(8);

    await page.goto("/apps");
    const standardCard = page.locator("main .card-h:not(.card-h--compact)").first();
    const [standardCardBox, standardImageBox] = await Promise.all([
      standardCard.boundingBox(),
      standardCard.locator(".card-h__image-wrap").boundingBox(),
    ]);
    expect(standardCardBox).not.toBeNull();
    expect(standardImageBox).not.toBeNull();
    expect(standardImageBox!.height).toBeLessThanOrEqual(145);
    expect(standardCardBox!.height).toBeLessThan(300);
  }
});

test("ゲームライブラリの案内とカードを既存サイトのスタイルで表示する", async ({ page }) => {
  await page.goto("/game-library");

  await expect(page.getByRole("heading", { name: "ゲームライブラリ" })).toBeVisible();
  await expect(page.getByText("ゲーム機やソフト、関連データを管理します。")).toBeVisible();

  const pageHeader = page.locator("main > header.page-header").first();
  await expect(pageHeader).toHaveCSS("background-image", "none");
  await expect(pageHeader.getByRole("heading", { level: 1 })).toHaveCSS("border-left-style", "solid");
  await expect(page.getByRole("heading", { level: 2, name: "データ管理" })).toHaveCSS("border-bottom-style", "solid");

  const maintenanceCard = page.getByRole("link", { name: /保守履歴/ });
  await expect(maintenanceCard).toHaveAttribute("href", "/game-library/maintenance");
  await expect(maintenanceCard).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(maintenanceCard).toHaveCSS("border-radius", "5.6px");
  await expect(page.getByText("ゲーム機・ソフト・メモリーカードの保守記録を確認・管理します。")).toBeVisible();
  await expect(page.getByRole("link", { name: /横断セーブデータ検索/ })).toHaveAttribute(
    "href",
    "/game-library/save-data-search",
  );
});

test("各コンテンツ一覧をタイトルと複数タグのAND条件で検索できる", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/blog");
  await page.getByRole("button", { name: "タグを選択" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "検索するタグを選択" });
  await dialog.getByRole("searchbox", { name: "タグを検索" }).fill("ポケモン");
  await dialog.getByRole("checkbox", { name: /ポケモン/ }).check();
  await dialog.getByRole("searchbox", { name: "タグを検索" }).fill("コレクション");
  await dialog.getByRole("checkbox", { name: /コレクション/ }).check();
  await dialog.getByRole("button", { name: "選択を反映" }).click();
  await page.getByRole("searchbox", { name: "タイトル" }).fill("全国図鑑");
  await page.getByRole("button", { name: "検索", exact: true }).click();

  await expect(page).toHaveURL(/\/blog\?q=.*&tags=000002&tags=000003$/);
  await expect(page.getByRole("heading", { name: "ブログ" })).toBeVisible();
  await expect(page.getByText("検索結果: 1件")).toBeVisible();
  const blogResults = page.locator("main .card-grid");
  await expect(blogResults.getByRole("link", { name: "第4世代 全国図鑑コレクション" })).toBeVisible();
  await expect(blogResults.getByRole("link", { name: "pokenae.com リニューアルのお知らせ" })).toHaveCount(0);

  const detailLink = blogResults.getByRole("link", { name: "第4世代 全国図鑑コレクション" });
  await expect(detailLink).toHaveAttribute("href", "/blog/collection-dex");
  await page.goto("/blog/collection-dex");
  await expect(page.locator(".content-tags").getByRole("link", { name: "ポケモン" })).toHaveAttribute(
    "href",
    "/blog?tags=000002",
  );

  await page.goto("/tools?q=Blink&tags=000002&tags=000004");
  await expect(page.getByText("検索結果: 1件")).toBeVisible();
  await expect(page.locator("main .card-grid").getByRole("link", { name: "BlinkObserverTool" })).toBeVisible();

  await page.goto("/apps?tags=000002&tags=000003");
  await expect(page.getByText("検索結果: 1件")).toBeVisible();
  await expect(page.locator('main a.card-h[href="/game-library"]')).toBeVisible();
});

test("不正なタグ検索は無条件一覧へフォールバックしない", async ({ page }) => {
  await page.goto("/blog?tags=invalid");
  await expect(page.getByRole("status")).toContainText("タグの指定が不正です");
  await expect(page.locator(".card-grid")).toHaveCount(0);
});

test("狭いPC幅では1行ヘッダーとハンバーガーメニューを使う", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "メニューを開く" });
  await expect(toggle).toBeVisible();
  const headerBox = await page.locator(".site-header__inner").boundingBox();
  const logoBox = await page.locator(".site-header__brand").boundingBox();
  const loginBox = await page.getByRole("button", { name: "Googleでログイン" }).boundingBox();
  expect(headerBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(loginBox).not.toBeNull();
  expect(Math.abs((logoBox!.y + logoBox!.height / 2) - (loginBox!.y + loginBox!.height / 2))).toBeLessThan(2);
  expect(headerBox!.height).toBeLessThan(90);

  await toggle.click();
  await expect(page.getByRole("button", { name: "メニューを閉じる" })).toBeVisible();
  await expect(page.locator("#compact-navigation")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(page.locator("#compact-navigation")).toHaveCount(0);
  await expect(toggle).toBeFocused();
});

test("Google画像はログアウト前にアカウントメニューを開く", async ({ page }) => {
  await page.route("**/_next/image?*", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="#a77ca5"/></svg>',
  }));
  await page.route("**/api/auth/session", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      user: {
        name: "テストユーザー",
        email: "test@example.com",
        image: "https://lh3.googleusercontent.com/a/test-user",
      },
      expires: "2099-01-01T00:00:00.000Z",
    }),
  }));
  await page.goto("/");
  const account = page.getByRole("button", { name: "テストユーザーのアカウントメニュー" });
  await expect(account).toBeVisible();
  await expect(account.locator("img")).toBeVisible();
  await expect(page.getByRole("button", { name: "ログアウト" })).toHaveCount(0);
  if ((await page.viewportSize())!.width <= 1100) {
    const toggleBox = await page.getByRole("button", { name: "メニューを開く" }).boundingBox();
    const accountBox = await account.boundingBox();
    expect(accountBox!.x).toBeGreaterThan(toggleBox!.x);
  }
  await account.click();
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
});
