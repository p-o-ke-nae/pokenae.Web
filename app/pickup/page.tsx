import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import ContentCardHorizontal from "@/components/molecules/ContentCardHorizontal";
import { selectPickupItems, toPublicContentItems } from "@/lib/content/presentation";
import { getContentSnapshot } from "@/lib/content/repository";

export const metadata: Metadata = {
  title: "PICKUP",
  description: "pokenae が選んだ注目コンテンツの一覧です。",
};

export default async function PickupPage() {
  const items = selectPickupItems(toPublicContentItems(await getContentSnapshot()));

  return <main className="page-container">
    <header className="page-header">
      <CustomHeader>PICKUP</CustomHeader>
      <p className="page-lead">おすすめのツール、Webコンテンツ、記事を掲載しています。</p>
    </header>
    {items.length
      ? <div className="stack">{items.map((item) => {
        const shared = {
          id: item.id,
          title: item.title,
          description: item.description,
          imageSrc: item.imageSrc,
          imageAlt: item.imageAlt,
          href: item.href,
        };
        return item.publishedAt
          ? <ContentCardHorizontal key={item.id} {...shared} publishedAt={item.publishedAt} />
          : <ContentCardHorizontal key={item.id} {...shared} metaLabel={item.metaLabel ?? item.source} />;
      })}</div>
      : <p className="empty-state">現在表示できるPICKUPはありません。</p>}
  </main>;
}
