import ImageSlideshow from "@/components/atoms/ImageSlideshow";
import TickerBanner from "@/components/atoms/TickerBanner";
import { BlogSection, InfoSection, PickupSection, SocialSection } from "@/components/organisms/HomeSections";
import { getContentSnapshot, isActiveContent } from "@/lib/content/repository";

export default async function Home() {
  const snapshot = await getContentSnapshot();
  const posts = snapshot.posts.filter((post) => post.status === "published");
  const slides = snapshot.banners.filter((item) => isActiveContent(item.startsAt, item.endsAt)).sort((a, b) => a.order - b.order).map((item) => ({ id: item.id, src: item.image, alt: item.alt, href: item.href }));
  const announcements = snapshot.announcements.filter((item) => isActiveContent(item.startsAt, item.endsAt)).map((item) => ({ id: item.id, text: item.text, href: item.href, highlighted: item.severity !== "normal" }));

  return (
    <main className="top-page">
      <h1 className="sr-only">pokenae</h1>
      <section aria-label="注目コンテンツ"><ImageSlideshow slides={slides} /></section>
      <TickerBanner items={announcements} />
      <PickupSection posts={posts} tools={snapshot.tools} />
      <InfoSection updates={snapshot.updates} />
      <BlogSection posts={posts} />
      <SocialSection />
    </main>
  );
}
