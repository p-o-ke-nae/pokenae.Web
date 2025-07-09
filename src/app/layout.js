import React from 'react';
import { AppProvider } from '../../pokenae.WebComponent/src/context/AppContext';
import './globals.css';

export const metadata = {
  title: 'Pokenae Web',
  description: 'ポケナエWebアプリケーション - コレクション管理システム',
};

export default function RootLayout({ children }) {
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
