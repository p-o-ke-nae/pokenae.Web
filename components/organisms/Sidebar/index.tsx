'use client';

import Image from "next/image";
import ContentCardHorizontal from "@/components/molecules/ContentCardHorizontal";
import CustomHeader from "@/components/atoms/CustomHeader";
import {
  selectPickupItems,
  selectRelatedItems,
  type PublicContentItem,
} from "@/lib/content/presentation";

export default function Sidebar({
  items,
  pathname,
}: {
  items: PublicContentItem[];
  pathname: string;
}) {
  const pickup = selectPickupItems(items, 4);
  const related = selectRelatedItems(items, pathname, 4);

  if (!pickup.length && !related.length) return null;

  return (
    <aside className="sidebar" aria-label="おすすめコンテンツ">
      {pickup.length > 0 && <SidebarSection title="PICKUP" items={pickup} />}
      {related.length > 0 && <SidebarSection title="関連アイテム" items={related} />}
      <SidebarBanner />
      <style jsx>{`
        .sidebar { display:grid; gap:1.5rem; min-width:0; }
      `}</style>
    </aside>
  );
}

function SidebarSection({ title, items }: { title: string; items: PublicContentItem[] }) {
  return <section className="sidebar__section">
    <CustomHeader level={2} variant="subtle">{title}</CustomHeader>
    <div className="sidebar__items">
      {items.map((item) => <SidebarCard key={item.id} item={item} />)}
    </div>
    <style jsx>{`
      .sidebar__section { display:grid; gap:.75rem; min-width:0; }
      .sidebar__items { display:grid; gap:.75rem; }
    `}</style>
  </section>;
}

function SidebarCard({ item }: { item: PublicContentItem }) {
  const shared = {
    id: item.id,
    title: item.title,
    description: item.description,
    imageSrc: item.imageSrc,
    imageAlt: item.imageAlt,
    href: item.href,
    variant: "compact" as const,
  };
  return item.publishedAt
    ? <ContentCardHorizontal {...shared} publishedAt={item.publishedAt} />
    : <ContentCardHorizontal {...shared} metaLabel={item.metaLabel ?? item.source} />;
}

function SidebarBanner() {
  return (
    <div className="sidebar-banner">
      <a
        className="sidebar-banner__image-link"
        href="https://ozaroom.com/tool/7.html"
        target="_blank"
        rel="noreferrer"
        aria-label="個体値特定ツール（ozaroom.com）を開く"
      >
        <Image
          src="/sidebar/watashinonenshu.png"
          alt="おすすめ情報。個体値・性格・めざめるパワーのタイプが分かる個体値特定ツール"
          fill
          sizes="(max-width: 1024px) 100vw, 320px"
        />
      </a>
      <a
        className="sidebar-banner__blog-link"
        href="https://shuahpkmn.hatenablog.jp/entry/rta-iv-calc"
        target="_blank"
        rel="noreferrer"
        aria-label="このバナーの作成者ブログを開く"
      >
        <span className="sr-only">このバナーの作成者ブログを開く</span>
      </a>
      <style jsx>{`
        .sidebar-banner {
          position: relative;
          width: 100%;
          aspect-ratio: 532 / 454;
          overflow: hidden;
          background: #fff;
        }
        .sidebar-banner__image-link {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .sidebar-banner :global(img) {
          object-fit: contain;
        }
        .sidebar-banner__blog-link {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 1;
          width: 3.25rem;
          height: 2rem;
          background: rgba(128, 128, 128, .28);
        }
        .sidebar-banner__blog-link:focus-visible {
          outline: 2px solid #795576;
          outline-offset: -2px;
        }
      `}</style>
    </div>
  );
}
