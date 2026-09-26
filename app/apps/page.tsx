import type { Metadata } from "next";
import CustomHeader from "@/components/atoms/CustomHeader";
import ContentCardHorizontal from "@/components/molecules/ContentCardHorizontal";

export const metadata: Metadata = { title: "Webアプリ" };

export default function AppsPage() {
  return <main className="page-container"><header className="page-header"><CustomHeader>Webアプリ</CustomHeader><p className="page-lead">Google OAuth2 で安全に認証し、pokenae の API を利用するWebアプリです。</p></header>
    <div className="stack"><ContentCardHorizontal id="game-library" title="ゲームライブラリ" description="ゲーム、ハード、セーブデータを管理します。既存URLはそのまま利用できます。" date="Google アカウント対応" imageSrc="/mock/thumb3.svg" imageAlt="" href="/game-library" /></div>
  </main>;
}
