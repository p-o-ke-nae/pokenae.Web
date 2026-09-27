export type NavigationItem = {
  label: string;
  href: string;
};

export type SocialLink = NavigationItem & {
  description: string;
  icon: "x" | "discord" | "github";
};

export const primaryNavigation: NavigationItem[] = [
  { label: "ツール開発室", href: "/tools" },
  { label: "Webアプリ", href: "/apps" },
  { label: "ブログ", href: "/blog" },
  { label: "お問い合わせ", href: "/contact" },
];

export const socialLinks: SocialLink[] = [
  {
    label: "X",
    href: process.env.NEXT_PUBLIC_CONTACT_X_URL ?? "https://x.com/p_o_ke_nae",
    description: "更新情報や短いお知らせを発信しています。",
    icon: "x",
  },
  {
    label: "Discord",
    href: process.env.NEXT_PUBLIC_CONTACT_DISCORD_URL ?? "https://discord.gg/",
    description: "コミュニティでの質問や交流はこちらから。",
    icon: "discord",
  },
  {
    label: "GitHub",
    href: process.env.NEXT_PUBLIC_CONTACT_GITHUB_URL ?? "https://github.com/p-o-ke-nae",
    description: "不具合報告、機能要望、公開ソースコードはこちらから。",
    icon: "github",
  },
];
