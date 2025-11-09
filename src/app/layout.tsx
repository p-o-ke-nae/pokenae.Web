import React, { ReactNode } from 'react';
import { AppProvider } from '../context/AppContext';
import './globals.css';

export const metadata = {
  title: 'Pokenae Web',
  description: 'ポケナエWebアプリケーション - コレクション管理システム',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
