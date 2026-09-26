import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import { socialLinks } from "@/lib/config/site";

export const metadata: Metadata = { title: "お問い合わせ" };

export default function ContactPage() {
  return <main className="page-container"><header className="page-header"><CustomHeader>お問い合わせ</CustomHeader><p className="page-lead">内容に合った窓口をご利用ください。フォームによる個人情報の保存は行っていません。</p></header>
    <div className="social-grid">{socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={`${item.label} で問い合わせる（新しいタブ）`}><strong>{item.label}</strong><span>{item.description}</span></a>)}</div>
  </main>;
}
