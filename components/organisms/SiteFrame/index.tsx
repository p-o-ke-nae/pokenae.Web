'use client';

import { usePathname } from "next/navigation";
import Sidebar from "@/components/organisms/Sidebar";
import {
  shouldShowPublicSidebar,
  type PublicContentItem,
} from "@/lib/content/presentation";

export default function SiteFrame({
  children,
  contentItems,
}: {
  children: React.ReactNode;
  contentItems: PublicContentItem[];
}) {
  const pathname = usePathname();
  const showSidebar = shouldShowPublicSidebar(pathname);

  return <div className={`site-frame${showSidebar ? "" : " site-frame--single"}`}>
    <div id="main-content" className="site-frame__content">
      {children}
    </div>
    {showSidebar && <Sidebar items={contentItems} pathname={pathname} />}
  </div>;
}
