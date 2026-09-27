import Link from "next/link";
import CustomHeader from "@/components/atoms/CustomHeader";

const adminLinks = [
  {
    href: "/admin/posts",
    title: "記事管理",
    description: "ブログ記事の新規作成、編集、レビュー待ち Pull Request の確認を行います。",
    action: "記事管理を開く",
  },
  {
    href: "/admin/posts/home",
    title: "ホーム・ツール設定",
    description: "バナー、ニュース、ツールの公開設定を編集します。",
    action: "ホーム・ツール設定を開く",
  },
];

export default function AdminPage() {
  return (
    <main className="page-container">
      <header className="page-header">
        <CustomHeader>管理画面</CustomHeader>
        <p className="page-lead">公開コンテンツとサイト設定を管理します。</p>
      </header>
      <div className="card-grid">
        {adminLinks.map((link) => (
          <Link key={link.href} className="admin-card" href={link.href}>
            <strong>{link.title}</strong>
            <span>{link.description}</span>
            <span className="admin-card__action">{link.action}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
