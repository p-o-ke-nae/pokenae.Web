'use client';

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
