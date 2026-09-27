import { describe, expect, it } from "vitest";
import { normalizeAnnouncements, serializeAnnouncements } from "./index";

describe("AnnouncementEditor state", () => {
  it("normalizes schema-invalid PR values into editable fields", () => {
    const announcements = normalizeAnnouncements([
      {
        id: "release",
        text: 42,
        href: "/blog/release",
        variant: "unknown",
        startsAt: "invalid date",
      },
      null,
    ]);

    expect(announcements).toHaveLength(2);
    expect(announcements[0]).toMatchObject({
      id: "release",
      text: "",
      href: "/blog/release",
      variant: "normal",
      startsAt: "invalid date",
      endsAt: "",
    });
    expect(announcements[1]).toMatchObject({
      id: "",
      text: "",
      href: "",
      variant: "normal",
      startsAt: "",
      endsAt: "",
    });
  });

  it("returns an empty draft list for a non-array value", () => {
    expect(normalizeAnnouncements({ id: "not-an-array" })).toEqual([]);
  });

  it("round-trips ISO dates through datetime-local values", () => {
    const [announcement] = normalizeAnnouncements([{
      id: "maintenance",
      text: "メンテナンスのお知らせ",
      href: "/info/maintenance",
      variant: "urgent",
      startsAt: "2026-09-26T00:00:00.000Z",
      endsAt: "2026-09-26T01:30:00.000Z",
    }]);

    expect(serializeAnnouncements([announcement])).toEqual([{
      id: "maintenance",
      text: "メンテナンスのお知らせ",
      href: "/info/maintenance",
      variant: "urgent",
      startsAt: "2026-09-26T00:00:00.000Z",
      endsAt: "2026-09-26T01:30:00.000Z",
    }]);
  });

  it("serializes an empty end date as null without throwing on invalid dates", () => {
    const [announcement] = normalizeAnnouncements([{
      id: "news",
      text: "ニュース",
      href: "/",
      variant: "emphasis",
      startsAt: "not-a-date",
      endsAt: null,
    }]);

    const [serialized] = serializeAnnouncements([announcement]);
    expect(serialized.startsAt).toBe("not-a-date");
    expect(serialized.endsAt).toBeNull();
    expect(serialized).not.toHaveProperty("key");
  });
});
