This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Configuration Management / 設定管理

### API Configuration / API 設定

このプロジェクトでは環境ごとに API のホスト URL を管理しています：

- **設定ファイル**: `src/utils/config.js`
- **環境変数ファイル**: 
  - `.env.development` (開発環境用デフォルト)
  - `.env.production` (本番環境用デフォルト)
  - `.env.local` (ローカル環境用オーバーライド - Git管理外)
  - `.env.example` (設定例テンプレート)

#### 環境別の設定方法

##### ローカル開発環境

```bash
# .env.local ファイルを作成（.gitignoreに含まれているため、個人設定可能）
NEXT_PUBLIC_API_BASE_URL=https://localhost:7077
NEXT_PUBLIC_DEBUG_MODE=true
```

##### developブランチ（開発サーバー）

デプロイ設定（Vercel/Azure等）で以下の環境変数を設定：

```bash
NEXT_PUBLIC_API_BASE_URL=<開発用APIサーバーのURL>
NEXT_PUBLIC_DEBUG_MODE=true
```

##### mainブランチ（本番サーバー）

デプロイ設定で以下の環境変数を設定：

```bash
NEXT_PUBLIC_API_BASE_URL=https://collectionassistancetoolapi-geaca2fwetcsgthk.japanwest-01.azurewebsites.net
NEXT_PUBLIC_DEBUG_MODE=false
```

#### 利用可能な環境変数

- `NEXT_PUBLIC_API_BASE_URL`: API サーバーのベース URL（必須）
- `NEXT_PUBLIC_DEBUG_MODE`: デバッグモードの有効化（true/false）
- `NEXT_PUBLIC_APP_NAME`: アプリケーション名
- `NEXT_PUBLIC_APP_VERSION`: アプリケーションバージョン
- `NEXT_PUBLIC_USE_MOCK_DATA`: モックデータの使用（true/false）

#### 設定の優先順位

1. `.env.local` （最優先、Git管理外）
2. `.env.development` または `.env.production` （環境により自動選択）
3. `src/utils/config.js` のデフォルト値

詳細は`.env.example`と`src/utils/config.js`を参照してください。

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
