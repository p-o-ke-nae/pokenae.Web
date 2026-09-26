'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import AuthBadge from "@/components/atoms/AuthBadge";
import EnvironmentBadge from "@/components/atoms/EnvironmentBadge";
import PokenaeLogo from "@/components/atoms/PokenaeLogo";
import { getEnvironment } from "@/lib/config/env";
import { primaryNavigation } from "@/lib/config/site";

export default function NavigationBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAuthenticated = Boolean(session?.user);

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      signIn("google", { callbackUrl: window.location.href });
    }
  }, [session?.error]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="pokenae トップ">
          <PokenaeLogo width={174} height={52} />
        </Link>
        <button
          type="button"
          className="site-header__toggle"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          メニュー
        </button>
        <nav id="primary-navigation" className={`site-header__nav${open ? " is-open" : ""}`} aria-label="メインメニュー">
          {primaryNavigation.map((item) => {
            const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={current ? "page" : undefined}>{item.label}</Link>;
          })}
          {isAuthenticated && <Link href="/game-management">マスタ管理</Link>}
        </nav>
        <div className="site-header__account">
          <AuthBadge
            isAuthenticated={isAuthenticated}
            userName={session?.user?.name || undefined}
            userEmail={session?.user?.email || undefined}
          />
          {getEnvironment() !== "production" && <EnvironmentBadge />}
        </div>
      </div>
      <style>{`
        .site-header { position:sticky; top:0; z-index:50; border-top:5px solid var(--color-accent-25); border-bottom:1px solid var(--color-base-70); background:rgba(255,255,255,.97); box-shadow:0 2px 10px rgba(40,35,43,.08); }
        .site-header__inner { width:min(calc(100% - 2rem),var(--site-width)); min-height:70px; margin:auto; display:flex; align-items:center; gap:1rem; }
        .site-header__brand { display:flex; flex:0 0 auto; }
        .site-header__nav { display:flex; align-self:stretch; align-items:stretch; }
        .site-header__nav a { display:flex; align-items:center; padding:0 .8rem; color:var(--color-text-strong); text-decoration:none; font-weight:700; border-bottom:4px solid transparent; }
        .site-header__nav a:hover,.site-header__nav a[aria-current=page] { color:var(--color-accent-25-strong); border-bottom-color:var(--color-accent-25); background:var(--color-base-70-light); }
        .site-header__account { margin-left:auto; display:flex; align-items:center; gap:.4rem; }
        .site-header__toggle { display:none; margin-left:auto; min-height:44px; border:1px solid var(--color-accent-25); background:#fff; color:var(--color-accent-25-strong); border-radius:.3rem; padding:.4rem .75rem; font-weight:700; }
        @media(max-width:900px) {
          .site-header__inner { flex-wrap:wrap; padding:.35rem 0; }
          .site-header__toggle { display:block; }
          .site-header__account { order:3; margin:0 0 .35rem; }
          .site-header__nav { display:none; order:4; width:100%; flex-direction:column; }
          .site-header__nav.is-open { display:flex; }
          .site-header__nav a { min-height:44px; border-bottom:1px solid var(--color-base-70); }
        }
      `}</style>
    </header>
  );
}
