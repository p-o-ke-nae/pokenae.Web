import { describe, expect, it } from "vitest";
import { normalizeBanners, serializeBanners } from "./index";

describe("BannerEditor state", () => {
  it("loads schema-invalid PR banners as editable fields", () => {
    const banners = normalizeBanners([{
      id: "welcome2",
      image: "/mock/slide1.svg",
      alt: "banner",
      href: "/tools",
      order: 2,
    }]);
    expect(banners[0]).toMatchObject({ id: "welcome2", startsAt: "", endsAt: "" });
  });

  it("serializes dates and nullable end dates for the canonical payload", () => {
    const [banner] = normalizeBanners([{
      id: "welcome",
      image: "./images/banner.webp",
      alt: "banner",
      href: "/",
      order: 0,
      startsAt: "2026-09-26T00:00:00Z",
      endsAt: null,
    }]);
    const serialized = serializeBanners([banner]);
    expect(serialized[0].startsAt).toMatch(/^2026-09-26T00:00:00\.000Z$/);
    expect(serialized[0].endsAt).toBeNull();
  });
});
