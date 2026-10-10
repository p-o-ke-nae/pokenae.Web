'use client';

import Image from 'next/image';
import { useState } from 'react';
import { signOut, signIn } from 'next-auth/react';
import { clearSessionCache } from '@/lib/session-cache';

export interface AuthBadgeProps {
  isAuthenticated: boolean;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  className?: string;
}

export default function AuthBadge({
  isAuthenticated,
  userName,
  userEmail,
  userImage,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  className = '',
}: AuthBadgeProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageAvailable = Boolean(userImage && failedImage !== userImage);

  const handleSignIn = () => {
    signIn('google', { callbackUrl: window.location.href });
  };

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={handleSignIn}
          className={`auth-badge__login ${className}`}
          aria-label="Googleでログイン"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
          </svg>
          <span>Googleでログイン</span>
        </button>
        <style jsx>{`
          .auth-badge__login {
            min-height:44px;
            display:inline-flex;
            align-items:center;
            gap:.5rem;
            padding:.45rem .75rem;
            border:0;
            border-radius:.3rem;
            color:#fff;
            background:#2563eb;
            font:inherit;
            font-size:.875rem;
            font-weight:700;
            white-space:nowrap;
          }
          .auth-badge__login:hover { background:#1d4ed8; }
          svg { width:1rem; height:1rem; fill:currentColor; }
          @media(max-width:520px) {
            .auth-badge__login { width:44px; padding:0; justify-content:center; }
            span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
          }
        `}</style>
      </>
    );
  }

  const fallback = (userName || userEmail || 'U').trim().charAt(0).toLocaleUpperCase();
  const label = userName ? `${userName}のアカウントメニュー` : 'アカウントメニュー';

  return (
    <div className={`auth-badge ${className}`}>
      <button
        type="button"
        className="auth-badge__trigger"
        onClick={onMenuToggle}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        aria-controls="account-menu"
      >
        {userImage && imageAvailable
          ? <Image src={userImage} alt="" fill sizes="44px" onError={() => setFailedImage(userImage)} />
          : <span aria-hidden="true">{fallback}</span>}
      </button>
      {menuOpen && <div id="account-menu" className="auth-badge__menu">
        <button
          type="button"
          onClick={async () => {
            onMenuClose();
            clearSessionCache();
            await signOut({ callbackUrl: '/' });
          }}
        >
          ログアウト
        </button>
      </div>}
      <style jsx>{`
        .auth-badge { position:relative; display:flex; }
        .auth-badge__trigger {
          position:relative;
          width:44px;
          height:44px;
          overflow:hidden;
          display:grid;
          place-items:center;
          border:2px solid var(--color-accent-25);
          border-radius:50%;
          color:#fff;
          background:var(--color-accent-25-strong);
          font:inherit;
          font-weight:800;
        }
        .auth-badge__trigger:hover { border-color:var(--color-text-strong); }
        .auth-badge__trigger :global(img) { object-fit:cover; }
        .auth-badge__menu {
          position:absolute;
          top:calc(100% + .5rem);
          right:0;
          z-index:70;
          min-width:10rem;
          padding:.35rem;
          border:1px solid var(--color-base-70-dark);
          border-radius:.3rem;
          background:#fff;
          box-shadow:var(--shadow-card);
        }
        .auth-badge__menu button {
          width:100%;
          min-height:44px;
          padding:.55rem .75rem;
          border:0;
          border-radius:.2rem;
          color:var(--color-text-strong);
          background:#fff;
          font:inherit;
          font-weight:700;
          text-align:left;
        }
        .auth-badge__menu button:hover { color:var(--color-accent-25-strong); background:var(--color-base-70-light); }
      `}</style>
    </div>
  );
}
