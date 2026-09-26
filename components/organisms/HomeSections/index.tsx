import ContentCardHorizontal from "@/components/molecules/ContentCardHorizontal";
import ContentCardVertical from "@/components/molecules/ContentCardVertical";
import CustomHeader from "@/components/atoms/CustomHeader";
import { socialLinks } from "@/lib/config/site";
import type { ContentUpdate, Post, ToolDefinition } from "@/lib/content/types";

export function PickupSection({ posts, tools }: { posts: Post[]; tools: ToolDefinition[] }) {
  const items = [
    ...posts.filter((item) => item.showInPickup).map((item) => ({
      id: `post-${item.slug}`, title: item.title, description: item.summary, date: item.publishedAt,
      imageSrc: item.thumbnail ?? "/mock/card1.svg", imageAlt: "", href: `/blog/${item.slug}`, priority: item.priority,
    })),
    ...tools.filter((item) => item.showInPickup).map((item) => ({
      id: `tool-${item.slug}`, title: item.name, description: item.summary, date: item.kind === "library" ? "ライブラリ" : "Windows アプリ",
      imageSrc: item.image ?? "/mock/thumb1.svg", imageAlt: "", href: `/tools/${item.slug}`, priority: item.priority ?? 0,
    })),
  ].sort((a, b) => b.priority - a.priority).slice(0, 4);
  return <HomeSection title="PICKUP"><div className="home-card-list">{items.map((item) => <ContentCardHorizontal key={item.id} id={item.id} title={item.title} description={item.description} date={item.date} imageSrc={item.imageSrc} imageAlt={item.imageAlt} href={item.href} />)}</div></HomeSection>;
}

export function InfoSection({ updates }: { updates: ContentUpdate[] }) {
  const visible = updates.filter((item) => !item.skipInfo).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 8);
  return <HomeSection title="INFO"><ol className="info-list">{visible.map((item) => <li key={item.id}><time dateTime={item.publishedAt}>{item.publishedAt}</time>{item.href ? <a href={item.href}>{item.summary}</a> : <span>{item.summary}</span>}</li>)}</ol></HomeSection>;
}

export function BlogSection({ posts }: { posts: Post[] }) {
  return <HomeSection title="BLOG"><div className="home-card-grid">{posts.slice(0, 6).map((post) => <ContentCardVertical key={post.slug} id={post.slug} title={post.title} date={post.publishedAt} imageSrc={post.thumbnail ?? "/mock/card1.svg"} imageAlt="" href={`/blog/${post.slug}`} tag={post.category} />)}</div></HomeSection>;
}

export function SocialSection() {
  return <HomeSection title="SNS"><div className="social-grid">{socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer"><strong>{item.label}</strong><span>{item.description}</span></a>)}</div></HomeSection>;
}

function HomeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="home-section" aria-labelledby={`home-${title.toLowerCase()}`}><CustomHeader id={`home-${title.toLowerCase()}`} level={2}>{title}</CustomHeader>{children}</section>;
}
