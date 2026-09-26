import { describe, expect, it } from "vitest";
import { validateCanonicalItems, validateCanonicalJson } from "./canonical-validation";

const homeSchema = JSON.stringify({
  oneOf: [{
    title: "Banners",
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["id", "image", "alt", "href", "startsAt", "endsAt", "order"],
      properties: {
        id: { type: "string", pattern: "^[a-z0-9-]+$" },
        image: { type: "string" },
        alt: { type: "string", minLength: 1 },
        href: { type: "string" },
        startsAt: { type: "string", format: "date-time" },
        endsAt: { type: ["string", "null"], format: "date-time" },
        order: { type: "integer", minimum: 0 },
      },
    },
  }],
});
const updateSchema = JSON.stringify({
  type: "object",
  additionalProperties: false,
  required: ["id", "publishedAt", "target", "summary", "href", "visible"],
  properties: {
    id: { type: "string" },
    publishedAt: { type: "string", format: "date-time" },
    target: { enum: ["post", "tool", "app", "home", "navigation"] },
    summary: { type: "string" },
    href: { type: "string" },
    visible: { type: "boolean" },
  },
});

describe("canonical content validation", () => {
  it("reports the exact missing banner fields from the Content schema", () => {
    const issues = validateCanonicalJson(homeSchema, [{
      id: "welcome",
      image: "/mock/slide1.svg",
      alt: "banner",
      href: "/",
      order: 0,
    }], "Banners");

    expect(issues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      [0, "startsAt"],
      [0, "endsAt"],
    ]));
  });

  it("rejects additional properties", () => {
    const issues = validateCanonicalJson(homeSchema, [{
      id: "welcome",
      image: "./images/banner.webp",
      alt: "banner",
      href: "/",
      order: 0,
      startsAt: "2026-09-26T00:00:00Z",
      endsAt: null,
      unexpected: true,
    }], "Banners");
    expect(issues).toContainEqual(expect.objectContaining({ path: [0, "unexpected"] }));
  });

  it("rejects the old update shape and accepts href/visible with the canonical target enum", () => {
    const oldIssues = validateCanonicalJson(updateSchema, {
      id: "banners-20260926103844",
      publishedAt: "2026-09-26T10:38:44.347Z",
      target: "site",
      summary: "更新",
    });
    expect(oldIssues.map((issue) => issue.path)).toEqual(expect.arrayContaining([["href"], ["visible"], ["target"]]));
    expect(validateCanonicalJson(updateSchema, {
      id: "banners-20260926103844",
      publishedAt: "2026-09-26T10:38:44.347Z",
      target: "home",
      summary: "更新",
      href: "/",
      visible: true,
    })).toEqual([]);
  });

  it("prefixes canonical tool issues with the tool index", () => {
    const issues = validateCanonicalItems(JSON.stringify({
      type: "object",
      additionalProperties: false,
      required: ["docs", "release", "showInPickup", "priority"],
      properties: {
        docs: { type: "object" },
        release: { type: "object" },
        showInPickup: { type: "boolean" },
        priority: { type: "integer" },
      },
    }), [{ image: "https://example.com/tool.webp" }]);

    expect(issues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      [0, "docs"],
      [0, "release"],
      [0, "showInPickup"],
      [0, "priority"],
      [0, "image"],
    ]));
  });
});
