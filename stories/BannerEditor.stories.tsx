import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import BannerEditor from "../components/organisms/BannerEditor";

const baseRevision = "1111111111111111111111111111111111111111";
const headRevision = "2222222222222222222222222222222222222222";
const banners = [
  {
    id: "first",
    image: "./images/first.webp",
    alt: "最初のバナー",
    href: "/blog",
    order: 0,
    startsAt: "2026-09-26T00:00:00.000Z",
    endsAt: null,
  },
  {
    id: "second",
    image: "./images/second.webp",
    alt: "次のバナー",
    href: "/tools",
    order: 1,
    startsAt: "2026-09-27T00:00:00.000Z",
    endsAt: null,
  },
];

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const meta = {
  title: "Organisms/BannerEditor",
  component: BannerEditor,
  parameters: { layout: "padded" },
  args: { initial: banners, baseRevision },
  beforeEach: () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/content/config/pull-requests?kind=banners") {
        return json({
          pullRequests: [{
            number: 2,
            title: "content: banners を更新",
            url: "https://github.com/p-o-ke-nae/pokenae.Content/pull/2",
            branch: "content/banners-20260926103844",
            headRevision,
          }],
        });
      }
      if (url === "/api/content/config/pull-requests/2?kind=banners" && !init?.method) {
        return json({
          pullRequest: {
            number: 2,
            title: "content: banners を更新",
            url: "https://github.com/p-o-ke-nae/pokenae.Content/pull/2",
            branch: "content/banners-20260926103844",
            headRevision,
          },
          banners: [{
            id: "broken",
            image: "/mock/slide1.svg",
            alt: "修正対象",
            href: "/",
            order: 0,
          }],
          issues: [
            { path: ["banners", 0, "startsAt"], message: "must have required property 'startsAt'" },
            { path: ["banners", 0, "image"], message: "画像は Content リポジトリ内の相対パスを指定してください。" },
          ],
        });
      }
      if (url === "/api/content/config/pull-requests/2?kind=banners" && init?.method === "PUT") {
        return json({ code: "CONTENT_CONFLICT", error: "Pull Request が更新されています。" }, 409);
      }
      if (url === "/api/content/config" && init?.method === "POST") {
        return json({
          pullRequestUrl: "https://github.com/p-o-ke-nae/pokenae.Content/pull/3",
          number: 3,
        }, 201);
      }
      return json({ error: "Unexpected request" }, 500);
    }) as typeof fetch;
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
} satisfies Meta<typeof BannerEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EditList: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "バナーを追加" }));
    const third = canvas.getByRole("group", { name: "バナー 3" });
    await userEvent.type(within(third).getByLabelText("ID"), "third");
    await expect(within(third).getByLabelText("ID")).toHaveValue("third");
    const imageUpload = within(third).getByLabelText("画像を置換（PNG/JPEG/WebP・5MB以下）");
    await userEvent.upload(imageUpload, new File(["image"], "banner.webp", { type: "image/webp" }));
    await expect(imageUpload).toHaveProperty("files.length", 1);
    await userEvent.click(within(third).getByRole("button", { name: "上へ" }));
    const moved = canvas.getByRole("group", { name: "バナー 2" });
    await expect(within(moved).getByLabelText("ID")).toHaveValue("third");
    await userEvent.click(within(moved).getByRole("button", { name: "削除" }));
    await expect(canvas.queryByDisplayValue("third")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Pull Request を作成" }));
    await expect(await canvas.findByRole("status")).toHaveTextContent("Pull Request を作成しました");
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

export const ExistingPullRequestConflict: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const selector = await canvas.findByLabelText("編集するPull Request");
    await waitFor(() => expect(within(selector).getByRole("option", { name: /#2/ })).toBeInTheDocument());
    await userEvent.selectOptions(selector, "2");
    await expect(await canvas.findByDisplayValue("broken")).toBeInTheDocument();
    const image = canvas.getByLabelText(/^画像パス/);
    await expect(image).toHaveAttribute("aria-invalid", "true");
    await userEvent.clear(image);
    await userEvent.type(image, "./images/replacement.webp");
    await userEvent.type(canvas.getByLabelText("開始日時"), "2026-09-26T20:00");
    await userEvent.click(canvas.getByRole("button", { name: "同じ Pull Request を更新" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("再読込してください");
  },
};
