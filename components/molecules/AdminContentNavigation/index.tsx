import Link from "next/link";

export const adminContentNavigationItems = [
  { href: "/admin/posts", label: "記事" },
  { href: "/admin/content/banners", label: "バナー" },
  { href: "/admin/content/announcements", label: "ニュース" },
  { href: "/admin/content/tools", label: "ツール" },
  { href: "/admin/content/apps", label: "Webアプリ" },
  { href: "/admin/content/tags", label: "タグ" },
] as const;

type AdminContentNavigationProps = {
  current?: string;
  items?: ReadonlyArray<{ href: string; label: string }>;
  homeLink?: { href: string; label: string } | null;
  ariaLabel?: string;
};

export default function AdminContentNavigation({
  current,
  items = adminContentNavigationItems,
  homeLink = { href: "/admin", label: "管理画面" },
  ariaLabel = "管理画面メニュー",
}: AdminContentNavigationProps) {
  return (
    <nav className="admin-content-nav" aria-label={ariaLabel}>
      {homeLink ? <Link href={homeLink.href}>{homeLink.label}</Link> : null}
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
