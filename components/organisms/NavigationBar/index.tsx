'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import AuthBadge from "@/components/atoms/AuthBadge";
import EnvironmentBadge from "@/components/atoms/EnvironmentBadge";
import PokenaeLogo from "@/components/atoms/PokenaeLogo";
import { getEnvironment } from "@/lib/config/env";
import { primaryNavigation } from "@/lib/config/site";

export default function NavigationBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const [navigationOpenPath, setNavigationOpenPath] = useState<string | null>(null);
  const [accountOpenPath, setAccountOpenPath] = useState<string | null>(null);
  const isAuthenticated = Boolean(session?.user);
  const navigationOpen = navigationOpenPath === pathname;
  const accountOpen = accountOpenPath === pathname;

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      signIn("google", { callbackUrl: window.location.href });
    }
  }, [session?.error]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setNavigationOpenPath(null);
        setAccountOpenPath(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const accountTrigger = headerRef.current?.querySelector<HTMLButtonElement>('[aria-controls="account-menu"][aria-expanded="true"]');
        const focusTarget = navigationButtonRef.current?.getAttribute("aria-expanded") === "true"
          ? navigationButtonRef.current
          : accountTrigger;
        setNavigationOpenPath(null);
        setAccountOpenPath(null);
        requestAnimationFrame(() => focusTarget?.focus());
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const links = primaryNavigation.map((item) => ({
    ...item,
    current: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));

  return (
    <header ref={headerRef} className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="pokenae トップ" onClick={() => {
          setNavigationOpenPath(null);
          setAccountOpenPath(null);
        }}>
          <PokenaeLogo width={174} height={52} />
        </Link>
        <nav className="site-header__nav" aria-label="メインメニュー">
          {links.map((item) => <NavigationLink key={item.href} {...item} />)}
          {isAdmin && <NavigationLink href="/admin" label="管理画面" current={pathname.startsWith("/admin")} />}
        </nav>
        <div className="site-header__actions">
          {getEnvironment() !== "production" && <EnvironmentBadge />}
          <div className="site-header__menu-control">
            <button
              ref={navigationButtonRef}
              type="button"
              className={`site-header__toggle${navigationOpen ? " is-open" : ""}`}
              aria-expanded={navigationOpen}
              aria-haspopup="true"
              aria-controls="compact-navigation"
              aria-label={navigationOpen ? "メニューを閉じる" : "メニューを開く"}
              onClick={() => {
                setNavigationOpenPath(navigationOpen ? null : pathname);
                setAccountOpenPath(null);
              }}
            >
              <span aria-hidden="true" />
            </button>
            {navigationOpen && <nav id="compact-navigation" className="site-header__compact-nav" aria-label="メインメニュー">
              {links.map((item) => <NavigationLink key={item.href} {...item} onSelect={() => setNavigationOpenPath(null)} />)}
              {isAdmin && <NavigationLink href="/admin" label="管理画面" current={pathname.startsWith("/admin")} onSelect={() => setNavigationOpenPath(null)} />}
            </nav>}
          </div>
          <AuthBadge
            isAuthenticated={isAuthenticated}
            userName={session?.user?.name || undefined}
            userEmail={session?.user?.email || undefined}
            userImage={session?.user?.image || undefined}
            menuOpen={accountOpen}
            onMenuToggle={() => {
              setAccountOpenPath(accountOpen ? null : pathname);
              setNavigationOpenPath(null);
            }}
            onMenuClose={() => setAccountOpenPath(null)}
          />
        </div>
      </div>
      <style>{`
        .site-header { position:sticky; top:0; z-index:50; border-bottom:1px solid var(--color-base-70); background:rgba(255,255,255,.97); box-shadow:0 2px 10px rgba(40,35,43,.08); }
        .site-header__inner { width:min(calc(100% - 2rem),var(--site-width)); min-height:70px; margin:auto; display:flex; flex-wrap:nowrap; align-items:center; gap:1rem; }
        .site-header__brand { display:flex; flex:0 0 auto; }
        .site-header__nav { display:flex; align-self:stretch; align-items:stretch; min-width:0; }
        .site-header__nav a { display:flex; align-items:center; padding:0 .8rem; color:var(--color-text-strong); text-decoration:none; font-weight:700; white-space:nowrap; border-bottom:4px solid transparent; }
        .site-header__nav a:hover,.site-header__nav a[aria-current=page] { color:var(--color-accent-25-strong); border-bottom-color:var(--color-accent-25); background:var(--color-base-70-light); }
        .site-header__actions { position:relative; margin-left:auto; display:flex; flex:0 0 auto; align-items:center; gap:.4rem; }
        .site-header__menu-control { position:relative; display:none; }
        .site-header__toggle { position:relative; width:44px; height:44px; border:1px solid var(--color-accent-25); background:#fff; border-radius:.3rem; }
        .site-header__toggle span,.site-header__toggle span::before,.site-header__toggle span::after { content:""; position:absolute; left:50%; width:22px; height:2px; border-radius:2px; background:var(--color-accent-25-strong); transform:translateX(-50%); transition:transform .2s ease,top .2s ease,opacity .2s ease; }
        .site-header__toggle span { top:50%; transform:translate(-50%,-50%); }
        .site-header__toggle span::before { left:0; top:-7px; transform:none; }
        .site-header__toggle span::after { left:0; top:7px; transform:none; }
        .site-header__toggle.is-open span { background:transparent; }
        .site-header__toggle.is-open span::before { top:0; transform:rotate(45deg); background:var(--color-accent-25-strong); }
        .site-header__toggle.is-open span::after { top:0; transform:rotate(-45deg); background:var(--color-accent-25-strong); }
        .site-header__compact-nav { position:absolute; top:calc(100% + .5rem); right:0; z-index:60; display:grid; width:min(20rem,calc(100vw - 1rem)); padding:.35rem; border:1px solid var(--color-base-70-dark); border-radius:.3rem; background:#fff; box-shadow:var(--shadow-card); }
        .site-header__compact-nav a { min-height:44px; display:flex; align-items:center; padding:.55rem .75rem; color:var(--color-text-strong); text-decoration:none; font-weight:700; border-radius:.2rem; }
        .site-header__compact-nav a + a { border-top:1px dotted var(--color-base-70-dark); }
        .site-header__compact-nav a:hover,.site-header__compact-nav a[aria-current=page] { color:var(--color-accent-25-strong); background:var(--color-base-70-light); }
        @media(max-width:1100px) {
          .site-header__nav { display:none; }
          .site-header__menu-control { display:block; }
        }
        @media(max-width:520px) {
          .site-header__inner { width:min(calc(100% - 1rem),var(--site-width)); gap:.35rem; }
          .site-header__brand svg { width:132px; height:auto; }
          .site-header__actions { gap:.25rem; }
        }
        @media(prefers-reduced-motion:reduce) {
          .site-header__toggle span,.site-header__toggle span::before,.site-header__toggle span::after { transition:none; }
        }
      `}</style>
    </header>
  );
}

function NavigationLink({
  href,
  label,
  current,
  onSelect,
}: {
  href: string;
  label: string;
  current: boolean;
  onSelect?: () => void;
}) {
  return <Link href={href} onClick={onSelect} aria-current={current ? "page" : undefined}>{label}</Link>;
}
