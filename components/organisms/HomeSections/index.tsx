import Link from "next/link";
import InfoList from "@/components/molecules/InfoList";
import ContentCardHorizontal from "@/components/molecules/ContentCardHorizontal";
import ContentCardVertical from "@/components/molecules/ContentCardVertical";
import CustomHeader from "@/components/atoms/CustomHeader";
import { socialLinks } from "@/lib/config/site";
import { selectInfoUpdates, selectPickupItems, type PublicContentItem } from "@/lib/content/presentation";
import type { ContentUpdate, Post } from "@/lib/content/types";

export function PickupSection({ items }: { items: PublicContentItem[] }) {
  const allPickup = selectPickupItems(items);
  const visible = allPickup.slice(0, 4);
  return <HomeSection title="PICKUP" moreHref={allPickup.length > visible.length ? "/pickup" : undefined}>
    <div className="home-card-list">{visible.map((item) => <PublicHorizontalCard key={item.id} item={item} />)}</div>
  </HomeSection>;
}

export function InfoSection({ updates }: { updates: ContentUpdate[] }) {
  const allUpdates = selectInfoUpdates(updates);
  const visible = allUpdates.slice(0, 8);
  return <HomeSection title="INFO" moreHref={allUpdates.length > visible.length ? "/info" : undefined}>
    <InfoList updates={visible} />
  </HomeSection>;
}

export function BlogSection({ posts }: { posts: Post[] }) {
  const visible = posts.slice(0, 6);
  return <HomeSection title="BLOG" moreHref={posts.length > visible.length ? "/blog" : undefined}>
    <div className="home-card-grid">{visible.map((post) => <ContentCardVertical key={post.slug} id={post.slug} title={post.title} publishedAt={post.publishedAt} imageSrc={post.thumbnail ?? "/mock/card1.svg"} imageAlt="" href={`/blog/${post.slug}`} tag={post.category} />)}</div>
  </HomeSection>;
}

export function SocialSection() {
  return <HomeSection title="SNS"><div className="social-grid">{socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer"><strong>{item.label}</strong><span>{item.description}</span></a>)}</div></HomeSection>;
}

function HomeSection({ title, children, moreHref }: { title: string; children: React.ReactNode; moreHref?: string }) {
  return <section className="home-section" aria-labelledby={`home-${title.toLowerCase()}`}>
    <CustomHeader id={`home-${title.toLowerCase()}`} level={2} variant="home">{title}</CustomHeader>
    {children}
    {moreHref && <Link className="home-section__more" href={moreHref}>さらに表示</Link>}
  </section>;
}

function PublicHorizontalCard({ item }: { item: PublicContentItem }) {
  const shared = {
    id: item.id,
    title: item.title,
    description: item.description,
    imageSrc: item.imageSrc,
    imageAlt: item.imageAlt,
    href: item.href,
  };
  return item.publishedAt
    ? <ContentCardHorizontal {...shared} publishedAt={item.publishedAt} />
    : <ContentCardHorizontal {...shared} metaLabel={item.metaLabel ?? item.source} />;
}
