import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * ゲームライブラリ（ツール画面）の見た目・導線をブログ等と統一したことの回帰テスト。
 * 未ログイン（トライアルモード）で表示し、公開 API はモックで空データを返す。
 */

async function mockPublicApi(page: Page) {
  await page.route("**/api/public/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", json: { success: true, data: [] } }),
  );
}

/** rgb()/rgba()/color(srgb ...) を 0-255 の [r, g, b, a] に変換する */
function parseRgb(value: string): number[] {
  const rgb = value.match(/rgba?\(([^)]+)\)/);
  if (rgb) return rgb[1].split(/[\s,/]+/).filter(Boolean).map((part) => Number.parseFloat(part));
  const srgb = value.match(/color\(srgb ([^)]+)\)/);
  if (srgb) {
    const [r, g, b, a = 1] = srgb[1].split(/[\s/]+/).filter(Boolean).map((part) => Number.parseFloat(part));
    return [r * 255, g * 255, b * 255, a];
  }
  throw new Error(`unsupported color: ${value}`);
}

/** 背景色がライトテーマの範囲（白〜サイトの淡いグレー #e4e3e8 程度）か、透明であることを確認する。 */
async function expectLightBackground(locator: Locator) {
  const color = await locator.evaluate((element) => getComputedStyle(element).backgroundColor);
  const [r, g, b, a = 1] = parseRgb(color);
  if (a === 0) return;
  expect(Math.min(r, g, b), `background ${color} should stay light`).toBeGreaterThanOrEqual(200);
}

async function expectDarkText(locator: Locator) {
  const color = await locator.evaluate((element) => getComputedStyle(element).color);
  const [r, g, b] = parseRgb(color);
  expect(Math.max(r, g, b), `text color ${color} should stay dark`).toBeLessThanOrEqual(120);
}

/** セクションがカードで囲われていない（枠線・影・背景なし）ことを確認する。 */
async function expectUnboxedSections(page: Page) {
  const sections = page.locator("main section.tool-section");
  const count = await sections.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const style = await sections.nth(index).evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        border: computed.borderTopWidth,
        shadow: computed.boxShadow,
        background: computed.backgroundColor,
        paddingLeft: computed.paddingLeft,
      };
    });
    expect(style.border).toBe("0px");
    expect(style.shadow).toBe("none");
    expect(style.background).toBe("rgba(0, 0, 0, 0)");
    expect(style.paddingLeft).toBe("0px");
  }
}

async function mainWidth(page: Page, path: string): Promise<number> {
  await page.goto(path);
  const box = await page.locator("main").first().boundingBox();
  expect(box).not.toBeNull();
  return box!.width;
}

async function footerButtonBoxes(dialog: Locator) {
  const buttons = dialog.locator("footer.dialog__footer").getByRole("button");
  const count = await buttons.count();
  const boxes = [];
  for (let index = 0; index < count; index += 1) {
    const box = await buttons.nth(index).boundingBox();
    expect(box).not.toBeNull();
    boxes.push({ name: (await buttons.nth(index).innerText()).trim(), ...box! });
  }
  return boxes;
}

type Box = { name: string; x: number; y: number; width: number; height: number };

function expectNoOverlap(boxes: Box[]) {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      expect(overlapX > 0.5 && overlapY > 0.5, `${a.name} と ${b.name} が重なっている`).toBe(false);
    }
  }
}

async function expectFooterLayout(dialog: Locator, isMobile: boolean, primaryName: string, primarySolo = true) {
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  const boxes = await footerButtonBoxes(dialog);
  expect(boxes.length).toBeGreaterThan(1);

  expectNoOverlap(boxes);
  const heights = boxes.map((box) => box.height);
  for (const box of boxes) {
    // ダイアログ幅に収まる
    expect(box.x).toBeGreaterThanOrEqual(dialogBox!.x - 0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 0.5);
    // タッチターゲット（44px 相当）
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
  // ボタンの高さが揃っている
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);

  const primary = boxes.find((box) => box.name === primaryName);
  expect(primary, `${primaryName} が見つからない`).toBeDefined();

  if (isMobile) {
    if (primarySolo) {
      const maxY = Math.max(...boxes.map((box) => box.y));
      expect(Math.abs(primary!.y - maxY)).toBeLessThanOrEqual(1);
      const sameRow = boxes.filter((box) => Math.abs(box.y - primary!.y) <= 1);
      expect(sameRow, JSON.stringify(boxes)).toHaveLength(1);
      const widest = Math.max(...boxes.map((box) => box.width));
      expect(primary!.width).toBeGreaterThanOrEqual(widest - 1);
    } else {
      const ys = boxes.map((box) => box.y);
      expect(Math.max(...ys) - Math.min(...ys), JSON.stringify(boxes)).toBeLessThanOrEqual(2);
    }
    // 同じ行のボタンは同じ幅（均等割り）
    const rows = new Map<number, Box[]>();
    for (const box of boxes) {
      const key = Math.round(box.y);
      rows.set(key, [...(rows.get(key) ?? []), box]);
    }
    for (const row of rows.values()) {
      const widths = row.map((box) => box.width);
      expect(Math.max(...widths) - Math.min(...widths), JSON.stringify(row)).toBeLessThanOrEqual(2);
    }
  } else {
    // PC は 1 行に並び、主操作は右端
    const ys = boxes.map((box) => box.y);
    expect(Math.max(...ys) - Math.min(...ys), JSON.stringify(boxes)).toBeLessThanOrEqual(1);
    const rightMost = Math.max(...boxes.map((box) => box.x + box.width));
    expect(Math.abs(primary!.x + primary!.width - rightMost)).toBeLessThanOrEqual(2);
  }
}

test.describe("ゲームライブラリ UI", () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicApi(page);
  });

  test("ダッシュボードは見出しでセクションを区切り、ブログと同等以上の本文幅を使う", async ({ page }) => {
    const blogWidth = await mainWidth(page, "/blog");
    const libraryWidth = await mainWidth(page, "/game-library");
    expect(libraryWidth).toBeGreaterThanOrEqual(blogWidth - 1);

    await expect(page.getByRole("heading", { level: 1, name: "ゲームライブラリ" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "検索・メンテ" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "データ管理" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "関連画面" })).toBeVisible();
    await expect(page.getByText("Game Library", { exact: true })).toHaveCount(0);
    for (const label of ["Maintenance", "Search", "Master"]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    }
    const mainSection = page.locator("section.tool-section").filter({
      has: page.getByRole("heading", { level: 2, name: "検索・メンテ" }),
    });
    const mainCards = mainSection.locator(".admin-card");
    await expect(mainCards.nth(0)).toContainText("セーブ検索");
    await expect(mainCards.nth(1)).toContainText("メンテナンス");
    await expect(page.locator('a[href="/game-management"]')).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "ゲームライブラリメニュー" });
    await expect(navigation.locator("a").nth(0)).toHaveAttribute("href", "/game-library/save-data-search");
    await expect(navigation.locator("a").nth(1)).toHaveAttribute("href", "/game-library/maintenance");
    await expect(navigation.locator("a").nth(2)).toHaveAttribute("href", "/game-library");
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/game-library");
    await expect(navigation.locator(".admin-card")).toHaveCount(0);
    for (const href of [
      "/game-library/game-consoles",
      "/game-library/game-softwares",
      "/game-library/accounts",
      "/game-library/memory-cards",
      "/game-library/save-datas",
      "/game-library/maintenance",
      "/game-library/save-data-search",
      "/game-management",
    ]) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    }
    await expect(page.locator("main main")).toHaveCount(0);
    await expectUnboxedSections(page);

    // ナビゲーション用カードはカードの中に入れ子にしない
    const nestedCards = await page.locator("main .admin-card").evaluateAll((cards) =>
      cards.filter((card) => {
        let parent = card.parentElement;
        while (parent && parent.tagName !== "MAIN") {
          const style = getComputedStyle(parent);
          if (style.borderTopWidth !== "0px" && style.borderTopStyle !== "none" && style.boxShadow !== "none") return true;
          parent = parent.parentElement;
        }
        return false;
      }).length,
    );
    expect(nestedCards).toBe(0);
    const firstCard = page.locator("main .admin-card").first();
    await expect(firstCard).toHaveCSS("background-color", "rgb(255, 255, 255)");
  });

  test("OS がダークモードでもツール画面はライトのまま", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    for (const path of ["/game-library", "/game-library/game-consoles", "/game-library/maintenance", "/game-library/save-data-search"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main section.tool-section").first()).toBeVisible();
      await expectLightBackground(page.locator("body"));
      await expectLightBackground(page.locator("main"));
      await expectDarkText(page.getByRole("heading", { level: 1 }));
      const sections = page.locator("main section.tool-section");
      for (let index = 0; index < (await sections.count()); index += 1) {
        await expectLightBackground(sections.nth(index));
      }
      const controls = page.locator("main select, main input[type='text'], main input[type='search'], main textarea");
      for (let index = 0; index < (await controls.count()); index += 1) {
        await expectLightBackground(controls.nth(index));
      }
    }
  });

  test("一覧・メンテナンス・セーブ検索もカードで包まず見出しで区切る", async ({ page }) => {
    const blogWidth = await mainWidth(page, "/blog");

    await page.goto("/game-library/game-consoles");
    await expect(page.getByRole("heading", { level: 2, name: "データ一覧" })).toBeVisible();
    const consoleNavigation = page.getByRole("navigation", { name: "ゲームライブラリメニュー" });
    await expect(consoleNavigation).toBeVisible();
    await expect(consoleNavigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/game-library/game-consoles");
    await expect(page.getByRole("link", { name: "戻る" })).toHaveCount(0);
    await expect(page.locator(".tool-sticky-actions")).toHaveCSS("position", "fixed");
    await expect(page.locator(".tool-sticky-actions").getByRole("button", { name: "新規", exact: true })).toBeVisible();
    await expect(page.locator(".tool-sticky-actions").getByRole("button", { name: "再読込" })).toBeVisible();
    await expect(page.getByText("Game Management", { exact: true })).toHaveCount(0);
    const modeSwitch = page.getByRole("switch", { name: /閲覧モード/ });
    await expect(modeSwitch).toBeVisible();
    await expect(modeSwitch.evaluate((element) => element.closest("section")?.querySelector("h2")?.textContent)).resolves.toBe("データ一覧");
    await expectUnboxedSections(page);
    expect((await page.locator("main").first().boundingBox())!.width).toBeGreaterThanOrEqual(blogWidth - 1);

    await page.goto("/game-library/maintenance");
    await expect(page.getByText("Game Library", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "メンテナンス対象" })).toBeVisible();
    const maintenanceNavigation = page.getByRole("navigation", { name: "ゲームライブラリメニュー" });
    await expect(maintenanceNavigation).toBeVisible();
    await expect(maintenanceNavigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/game-library/maintenance");
    const maintenanceHeaders = page.getByRole("columnheader");
    await expect(maintenanceHeaders.filter({ hasText: "最新サマリー" })).toBeVisible();
    await expect(maintenanceHeaders.filter({ hasText: "最新日" })).toBeVisible();
    await expect(maintenanceHeaders.filter({ hasText: "最新日" })).toHaveCount(1);
    await expect(maintenanceHeaders.filter({ hasText: "詳細" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "戻る" })).toHaveCount(0);
    await expectUnboxedSections(page);

    await page.goto("/game-library/save-data-search");
    await expect(page.getByText("Game Library", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "検索条件" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "検索結果" })).toBeVisible();
    const searchNavigation = page.getByRole("navigation", { name: "ゲームライブラリメニュー" });
    await expect(searchNavigation).toBeVisible();
    await expect(searchNavigation.locator('a[aria-current="page"]')).toHaveAttribute("href", "/game-library/save-data-search");
    await expect(page.getByRole("link", { name: "戻る" })).toHaveCount(0);
    await expectUnboxedSections(page);

    await page.goto("/game-library/save-datas");
    const saveDataHeaders = page.getByRole("columnheader");
    await expect(saveDataHeaders.filter({ hasText: "ストーリー進行度" })).toBeVisible();
    await expect(saveDataHeaders.filter({ hasText: "メモ" })).toBeVisible();
    await expect(saveDataHeaders.filter({ hasText: "メモ" })).toHaveCSS("width", "512px");
    await expect(saveDataHeaders.filter({ hasText: "状態" })).toBeVisible();
  });

  test("編集ダイアログのフッターボタンが崩れずに並ぶ", async ({ page, isMobile }) => {
    await page.goto("/game-library/game-consoles");
    await expect(page.getByRole("heading", { level: 2, name: "データ一覧" })).toBeVisible();
    const dialog = page.getByRole("dialog");
    // ハイドレーション完了前のクリックを避けるため、開くまで再試行する
    await expect(async () => {
      if (!(await dialog.isVisible())) await page.getByRole("button", { name: "新規", exact: true }).click();
      await expect(dialog).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect(dialog.locator("footer.dialog__footer")).toBeVisible();
    await expectFooterLayout(dialog, isMobile, "保存", false);
  });

  test("複数の検索項目とマスタ条件を組み合わせて検索できる", async ({ page }) => {
    await page.addInitScript(() => {
      const createSave = (id: number, masterId: number, trainerName: string) => ({
        id,
        ownerGoogleUserId: "trial-user",
        displayOrder: id,
        memo: null,
        deletedAt: null,
        saveStorageType: 0,
        gameSoftwareMasterId: masterId,
        gameSoftwareId: null,
        gameConsoleId: null,
        accountId: null,
        memoryCardId: null,
        storyProgressDefinitionId: masterId === 100 ? 1000 : 2000,
        extendedFields: [{
          fieldKey: "trainer-name",
          label: "主人公名",
          fieldType: 0,
          isRequired: false,
          displayOrder: 1,
          stringValue: trainerName,
          intValue: null,
          decimalValue: null,
          boolValue: null,
          dateValue: null,
          selectedOptionKey: null,
        }],
        isDeleted: false,
        deleteReason: null,
      });
      localStorage.setItem("pokenae_trial_v1:save-datas", JSON.stringify([
        createSave(1, 100, "テスト主人公A"),
        createSave(2, 200, "テスト主人公B"),
      ]));
    });
    const schemaRequests: string[] = [];
    await page.route("**/api/public/**", async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/public/", "");
      let data: unknown[] | Record<string, unknown> = [];
      if (path === "game-software-masters") {
        data = [100, 200].map((id) => ({
          id,
          name: `テストソフト${id}`,
          abbreviation: `TEST${id}`,
          gameConsoleCategoryId: 1,
          contentGroupId: 10,
          displayOrder: id,
          isDeleted: false,
        }));
      } else if (path === "game-software-masters/100/save-data-schema" || path === "game-software-masters/200/save-data-schema") {
        schemaRequests.push(path);
        const gameSoftwareMasterId = Number(path.split("/")[1]);
        data = {
          gameSoftwareMasterId,
          contentGroupId: 10,
          fields: [{
            fieldKey: "trainer-name",
            label: "主人公名",
            description: null,
            fieldType: 0,
            displayOrder: 1,
            isRequired: false,
            isDisabled: false,
            options: [],
          }],
        };
      } else if (path === "game-software-masters/100/story-progress-schema" || path === "game-software-masters/200/story-progress-schema") {
        const gameSoftwareMasterId = Number(path.split("/")[1]);
        data = {
          gameSoftwareMasterId,
          contentGroupId: 10,
          choices: [{
            storyProgressDefinitionId: gameSoftwareMasterId * 10,
            progressKey: gameSoftwareMasterId === 100 ? "start" : "finish",
            label: gameSoftwareMasterId === 100 ? "冒険開始" : "物語完結",
            description: null,
            displayOrder: 1,
            isDisabled: false,
          }],
        };
      }

      await route.fulfill({ status: 200, contentType: "application/json", json: { success: true, data } });
    });

    const searchParams = new URLSearchParams({
      criteria: encodeURIComponent(JSON.stringify([
        { fieldId: "custom:trainer-name", operator: "equals", value: "テスト主人公B" },
        { fieldId: "master:game-software", operator: "equals", value: "200" },
        { fieldId: "master:story-progress", operator: "equals", value: "2000" },
      ])),
    });
    await page.goto(`/game-library/save-data-search?${searchParams.toString()}`);
    await expect.poll(() => schemaRequests.length).toBe(2);
    await expect(page.locator('[id="search-value-custom:trainer-name"]')).toHaveValue("テスト主人公B");
    await expect(page.locator('[id="search-value-master:game-software"]')).toHaveValue("200");
    await expect(page.locator('[id="search-value-master:story-progress"]')).toHaveValue("2000");
    await expect(page.getByText("TEST200 — テストソフト200")).toBeVisible();
    await expect(page.getByText("主人公名: テスト主人公B", { exact: true })).toBeVisible();
    await expect(page.getByText("ストーリー進捗: 物語完結", { exact: true })).toBeVisible();
    await expect(page.getByText(/セーブデータ #/)).toHaveCount(0);
    await expect(page.getByText("TEST100 — テストソフト100")).toHaveCount(0);

    await page.locator('[id="search-value-master:game-software"]').selectOption("100");
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(page.getByText("一致するセーブデータはありませんでした。")).toBeVisible();

    await page.locator('[id="search-value-master:game-software"]').selectOption("200");
    await page.locator('[id="search-value-custom:trainer-name"]').fill("");
    await page.locator('[id="search-operator-custom:trainer-name"]').selectOption("not-equals");
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(page.getByText("TEST200 — テストソフト200")).toBeVisible();
    await expect(page.getByText("主人公名: テスト主人公B", { exact: true })).toBeVisible();
    await expect.poll(() => {
      const url = new URL(page.url());
      const criteria = JSON.parse(url.searchParams.get("criteria") ?? "[]");
      return criteria[0]?.value;
    }).toBe("");
  });

  test("ログイン済みでセッション確定が遅れても URL の検索条件で初期検索できる", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          user: { name: "テストユーザー", email: "test@example.com" },
          expires: "2099-01-01T00:00:00.000Z",
        }),
      });
    });
    await page.route("**/api/services/game-library-api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith("/api/SaveDatas") ? [{
        id: 2,
        ownerGoogleUserId: "google-user",
        displayOrder: 1,
        memo: null,
        deletedAt: null,
        saveStorageType: 0,
        gameSoftwareMasterId: 200,
        gameSoftwareId: null,
        gameConsoleId: null,
        accountId: null,
        memoryCardId: null,
        storyProgressDefinitionId: null,
        extendedFields: [{
          fieldKey: "trainer-name",
          label: "主人公名",
          fieldType: 0,
          isRequired: false,
          displayOrder: 1,
          stringValue: "ログイン主人公",
          intValue: null,
          decimalValue: null,
          boolValue: null,
          dateValue: null,
          selectedOptionKey: null,
        }],
        isDeleted: false,
        deleteReason: null,
      }] : [];
      await route.fulfill({ status: 200, contentType: "application/json", json: { success: true, data } });
    });
    await page.route("**/api/public/**", async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/public/", "");
      let data: unknown[] | Record<string, unknown> = [];
      if (path === "game-software-masters") {
        data = [{
          id: 200,
          name: "テストソフト200",
          abbreviation: "TEST200",
          gameConsoleCategoryId: 1,
          contentGroupId: 10,
          displayOrder: 200,
          isDeleted: false,
        }];
      } else if (path === "game-software-masters/200/save-data-schema") {
        data = {
          gameSoftwareMasterId: 200,
          contentGroupId: 10,
          fields: [{
            fieldKey: "trainer-name",
            label: "主人公名",
            description: null,
            fieldType: 0,
            displayOrder: 1,
            isRequired: false,
            isDisabled: false,
            options: [],
          }],
        };
      } else if (path === "game-software-masters/200/story-progress-schema") {
        data = { gameSoftwareMasterId: 200, contentGroupId: 10, choices: [] };
      }
      await route.fulfill({ status: 200, contentType: "application/json", json: { success: true, data } });
    });

    const searchParams = new URLSearchParams({
      criteria: JSON.stringify([
        { fieldId: "custom:trainer-name", operator: "equals", value: "ログイン主人公" },
      ]),
    });
    await page.goto(`/game-library/save-data-search?${searchParams.toString()}`);
    await expect(page.locator('[id="search-value-custom:trainer-name"]')).toHaveValue("ログイン主人公");
    await expect(page.getByText("TEST200 — テストソフト200")).toBeVisible();
    await expect(page.getByText("主人公名: ログイン主人公", { exact: true })).toBeVisible();
    await expect(page.getByText(/URL内の検索条件を確認してください/)).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("criteria")).toBe(searchParams.get("criteria"));
  });

  test("ネストしたメンテナンス画面を閉じても親の詳細は開いたまま", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("pokenae_trial_v1:game-consoles", JSON.stringify([{
        id: 1,
        gameConsoleMasterId: 1,
        gameConsoleEditionMasterId: null,
        ownerGoogleUserId: "trial-user",
        displayOrder: 1,
        label: "テスト本体",
        memo: null,
        isDeleted: false,
        maintenance: {
          hasRecord: false,
          intervalDays: 365,
          lastMaintenanceDate: null,
          nextMaintenanceDate: null,
          isOverdue: false,
          latestHealthStatus: 0,
        },
      }]));
    });

    await page.goto("/game-library/game-consoles");
    await page.getByRole("button", { name: "編集" }).first().click();
    const parentDialog = page.getByRole("dialog", { name: "ゲーム機詳細" });
    await expect(parentDialog).toBeVisible();
    const navigationRow = parentDialog.locator(".dialog-footer-layout__leading .dialog-footer-layout__row");
    await expect(navigationRow).toContainText("1 / 1");
    await expect(navigationRow.getByRole("button", { name: "前へ" })).toBeDisabled();
    await expect(navigationRow.getByRole("button", { name: "次へ" })).toBeDisabled();
    await parentDialog.getByRole("button", { name: "メンテナンス" }).click();
    const maintenanceDialog = page.getByRole("dialog", { name: "ゲーム機のメンテナンス" });
    await expect(maintenanceDialog).toBeVisible();
    const maintenanceModeSwitch = maintenanceDialog.getByRole("switch").first();
    await expect(maintenanceModeSwitch).toHaveAttribute("aria-checked", "false");
    await maintenanceModeSwitch.click();
    await expect(maintenanceModeSwitch).toHaveAttribute("aria-checked", "true");
    await maintenanceDialog.locator(":scope > .dialog__surface > .dialog__header > .dialog__close").click();

    await expect(maintenanceDialog).toBeHidden();
    await expect(page.getByRole("dialog", { name: "ゲーム機編集" })).toBeVisible();
  });
});

test("ブログのタグ選択ダイアログのフッターも同じ規則で並ぶ", async ({ page, isMobile }) => {
  await page.goto("/blog");
  const dialog = page.getByRole("dialog", { name: "検索するタグを選択" });
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.getByRole("button", { name: "タグを選択" }).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await expectFooterLayout(dialog, isMobile, "選択を反映");
});
