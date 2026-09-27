import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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
    id: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
    publishedAt: { type: "string", format: "date-time" },
    target: { enum: ["post", "tool", "app", "home", "navigation"] },
    summary: { type: "string", minLength: 1, maxLength: 200 },
    href: { type: "string" },
    visible: { type: "boolean" },
  },
});

describe("banner write preparation", () => {
  beforeAll(() => {
    if (!globalThis.File) {
      Object.defineProperty(globalThis, "File", {
        value: class File extends Blob {
          name: string;
          constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
            super(parts, options);
            this.name = name;
          }
        },
      });
    }
  });

  it("rejects the PR #2 payload before writing because fields and image are invalid", async () => {
    const { prepareBannerWrite } = await import("./banner-admin");
    const result = await prepareBannerWrite({
      form: new FormData(),
      rawBanners: [{
        id: "welcome2",
        image: "/mock/slide1.svg",
        alt: "banner",
        href: "/tools",
        order: 2,
      }],
      existingPaths: [],
      homeSchema,
      updateSchema,
      updatePath: "content/updates/banners-20260926103844.json",
      updateId: "banners-20260926103844",
      summary: "更新",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
        ["banners", 0, "startsAt"],
        ["banners", 0, "endsAt"],
      ]));
    }
  });

  it("accepts a corrected payload and emits canonical update fields", async () => {
    const { prepareBannerWrite } = await import("./banner-admin");
    const result = await prepareBannerWrite({
      form: new FormData(),
      rawBanners: [{
        id: "welcome2",
        image: "./images/banner.webp",
        alt: "banner",
        href: "/tools",
        order: 2,
        startsAt: "2026-09-26T00:00:00Z",
        endsAt: null,
      }],
      existingPaths: ["content/home/images/banner.webp"],
      homeSchema,
      updateSchema,
      updatePath: "content/updates/banners-20260926103844.json",
      updateId: "banners-20260926103844",
      summary: "更新",
      publishedAt: "2026-09-26T10:38:44.347Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const update = JSON.parse(String(result.files.find((file) => file.path.includes("updates/"))?.content));
      expect(update).toMatchObject({ target: "home", href: "/", visible: true });
    }
  });

  it("rejects repository-external and missing image references", async () => {
    const { validateBannerImageReferences } = await import("./banner-admin");
    expect(validateBannerImageReferences([{ image: "/mock/slide1.svg" }], new Set())).toHaveLength(1);
    expect(validateBannerImageReferences([{ image: "./images/missing.webp" }], new Set())).toHaveLength(1);
    expect(validateBannerImageReferences([{ image: "./images/banner.webp" }], new Set(["content/home/images/banner.webp"]))).toEqual([]);
  });

  it("optimizes an uploaded image to a proposed-tree WebP path", async () => {
    const { prepareBannerWrite } = await import("./banner-admin");
    const form = new FormData();
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    form.set("image:welcome", new File([png], "My Banner.png", { type: "image/png" }));
    const result = await prepareBannerWrite({
      form,
      rawBanners: [{
        id: "welcome",
        image: "",
        alt: "banner",
        href: "/",
        order: 0,
        startsAt: "2026-09-26T00:00:00Z",
        endsAt: null,
      }],
      existingPaths: [],
      homeSchema,
      updateSchema,
      updatePath: "content/updates/banners-20260926103844.json",
      updateId: "banners-20260926103844",
      summary: "更新",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.banners[0].image).toMatch(/^\.\/images\/welcome-[a-f0-9]{12}\.webp$/);
      expect(result.files).toContainEqual(expect.objectContaining({
        path: expect.stringMatching(/^content\/home\/images\/welcome-[a-f0-9]{12}\.webp$/),
        content: expect.any(Buffer),
      }));
    }
  });
});
