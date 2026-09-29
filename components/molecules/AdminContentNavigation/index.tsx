import Link from "next/link";

export const adminContentNavigationItems = [
  { href: "/admin/posts", label: "記事" },
  { href: "/admin/content/banners", label: "バナー" },
  { href: "/admin/content/announcements", label: "ニュース" },
  { href: "/admin/content/tools", label: "ツール" },
  { href: "/admin/content/apps", label: "Webアプリ" },
  { href: "/admin/content/tags", label: "タグ" },
] as const;

export default function AdminContentNavigation({ current }: { current?: string }) {
  return (
    <nav className="admin-content-nav" aria-label="管理画面メニュー">
      <Link href="/admin">管理画面</Link>
      {adminContentNavigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={current === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
