import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavigationBar from "@/components/organisms/NavigationBar";
import SessionProvider from "@/components/organisms/SessionProvider";
import Footer from "@/components/organisms/Footer";
import TrialImportDialog from "@/components/molecules/TrialImportDialog";
import { LoadingOverlayProvider } from "@/contexts/LoadingOverlayContext";
import Sidebar from "@/components/organisms/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pokenae.com"),
  title: {
    default: "pokenae",
    template: "%s | pokenae",
  },
  description: "ポケモンに関するツール、Webアプリ、技術記事を公開する pokenae の公式サイトです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SessionProvider>
          <LoadingOverlayProvider>
            <a className="skip-link" href="#main-content">
              本文へ移動
            </a>
            <NavigationBar />
            <div className="site-frame">
              <div id="main-content" className="site-frame__content">
                {children}
              </div>
              <Sidebar />
            </div>
            <Footer />
            <TrialImportDialog />
          </LoadingOverlayProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
