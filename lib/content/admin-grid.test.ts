import { describe, expect, it } from "vitest";
import { collectInvalidIndexes, formatGridDateTime } from "./admin-grid";

describe("admin grid helpers", () => {
  it("collects row indexes from prefixed and unprefixed issue paths", () => {
    const indexes = collectInvalidIndexes([
      { path: ["banners", 0, "id"], message: "id" },
      { path: ["banners", "2", "image"], message: "image" },
      { path: [3, "endsAt"], message: "endsAt" },
      { path: ["tools", 5, "slug"], message: "other list" },
      { path: ["banners"], message: "list level" },
    ], "banners");

    expect([...indexes].sort()).toEqual([0, 2, 3]);
  });

  it("formats datetime-local values for the grid", () => {
    expect(formatGridDateTime("2026-09-30T09:15")).toBe("2026-09-30 09:15");
    expect(formatGridDateTime("")).toBe("");
  });
});
