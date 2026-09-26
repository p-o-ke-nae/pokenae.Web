import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ContentCardHorizontal from "../components/molecules/ContentCardHorizontal";

const meta = {
  title: "Molecules/PublicCards",
  component: ContentCardHorizontal,
  parameters: { layout: "padded" },
  args: {
    id: "sample",
    title: "長いタイトルでもカードの比率と読みやすさを維持するコンテンツ",
    description: "ツール、記事、Webアプリで共通利用する横型カードです。",
    date: "2026-09-26",
    imageSrc: "/mock/thumb1.svg",
    imageAlt: "",
    href: "/tools",
  },
} satisfies Meta<typeof ContentCardHorizontal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Desktop: Story = {};
export const Mobile: Story = { parameters: { viewport: { defaultViewport: "mobile1" } } };
export const LongText: Story = { args: { title: "とても長いタイトル".repeat(10), description: "長文の説明".repeat(20) } };
