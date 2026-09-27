import { describe, expect, it } from "vitest";
import { appListSchema } from "../../../lib/content/schemas";
import { normalizeApps, serializeApps } from "./index";

describe("AppEditor state", () => {
  it("normalizes and serializes every editable field", () => {
    const [draft] = normalizeApps([{
      slug: "game-library",
      displayName: "ゲームライブラリ",
      summary: "ゲームを管理します。",
      href: "/game-library",
      image: null,
      imageAlt: "",
      metaLabel: "Google アカウント対応",
      status: "published",
      order: 1,
      tags: ["000001", "000002"],
    }]);

    expect(serializeApps([draft])).toEqual([{
      slug: "game-library",
      displayName: "ゲームライブラリ",
      summary: "ゲームを管理します。",
      href: "/game-library",
      image: null,
      imageAlt: "",
      metaLabel: "Google アカウント対応",
      status: "published",
      order: 1,
      tags: ["000001", "000002"],
    }]);
  });

  it("keeps malformed input editable and rejects duplicate slugs", () => {
    expect(normalizeApps({})).toEqual([]);
    const app = {
      slug: "duplicate",
      displayName: "App",
      summary: "Summary",
      href: "/app",
      imageAlt: "",
      metaLabel: "Webアプリ",
      status: "draft" as const,
      order: 0,
      tags: [],
    };
    const parsed = appListSchema.safeParse([app, app]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: [1, "slug"], message: "slug は重複できません。" }),
      ]));
    }
  });

  it("keeps an empty order invalid instead of coercing it to zero", () => {
    const [draft] = normalizeApps([{
      slug: "sample",
      displayName: "Sample",
      summary: "Summary",
      href: "/sample",
      image: null,
      imageAlt: "",
      metaLabel: "Webアプリ",
      status: "draft",
      order: 0,
      tags: [],
    }]);

    expect(appListSchema.safeParse(serializeApps([{ ...draft, order: "" }])).success).toBe(false);
  });
});
