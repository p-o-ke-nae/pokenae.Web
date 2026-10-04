import { describe, expect, it } from "vitest";
import { getGameManagementDashboardTexts } from "./game-management-pages";

describe("game management dashboard labels", () => {
  it("uses Japanese-only dashboard labels", () => {
    const texts = getGameManagementDashboardTexts("ja");

    expect(texts.sectionLabel).toBe("");
    expect(texts.extraCards.map(({ shortLabel, actionLabel }) => [shortLabel, actionLabel])).toEqual([
      ["互換設定", "互換設定を開く"],
      ["スキーマ", "スキーマ管理を開く"],
      ["選択肢セット", "選択肢セット管理を開く"],
      ["進行度", "進行度管理を開く"],
    ]);
  });
});
