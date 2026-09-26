import Link from "next/link";
import PokenaeLogo from "@/components/atoms/PokenaeLogo";
import { primaryNavigation } from "@/lib/config/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Link href="/" aria-label="pokenae トップ"><PokenaeLogo width={150} height={48} /></Link>
        <nav aria-label="フッターメニュー" className="site-footer__links">
          {primaryNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <Link href="/privacy-policy">プライバシーポリシー</Link>
          <Link href="/terms-of-service">利用規約</Link>
        </nav>
        <small>© {new Date().getFullYear()} pokenae</small>
      </div>
      <style>{`
        .site-footer { border-top:8px solid var(--color-accent-25); background:#f1eef2; color:var(--color-text-strong); }
        .site-footer__inner { width:min(calc(100% - 2rem),var(--site-width)); margin:auto; padding:2rem 0; display:grid; justify-items:center; gap:1rem; }
        .site-footer__links { display:flex; flex-wrap:wrap; justify-content:center; gap:.45rem 1.25rem; }
        .site-footer__links a { color:inherit; font-size:.9rem; }
      `}</style>
    </footer>
  );
}
