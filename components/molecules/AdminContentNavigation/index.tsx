import Link from "next/link";

const items = [
  { href: "/admin/content/banners", label: "バナー" },
  { href: "/admin/content/announcements", label: "ニュース" },
  { href: "/admin/content/tools", label: "ツール" },
  { href: "/admin/content/apps", label: "Webアプリ" },
  { href: "/admin/content/tags", label: "タグ" },
];

export default function AdminContentNavigation({ current }: { current?: string }) {
  return (
    <nav className="admin-content-nav" aria-label="コンテンツ設定">
      <Link href="/admin">管理画面</Link>
      {items.map((item) => (
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
