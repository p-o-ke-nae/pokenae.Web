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

## Type Checking / 型チェック

TypeScriptの型エラーをローカル環境で確認できますにゃん：

```bash
npm run type-check
```

このコマンドはビルドせずに型チェックのみを実行するので、CI/CDデプロイ前に型エラーを早期に発見できますにゃん。

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

このプロジェクトでは API のホスト URL を一元管理しています：

- **設定ファイル**: `src/utils/config.js`
- **環境変数**: `.env.local` (開発環境) / `.env.example` (テンプレート)

#### 環境変数の設定

```bash
# .env.local ファイルで設定
NEXT_PUBLIC_API_BASE_URL=https://localhost:7077

# 本番環境例
# NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

#### 設定の変更方法

1. `.env.local`ファイルの`NEXT_PUBLIC_API_BASE_URL`を変更
2. または、設定ファイル`src/utils/config.js`で直接変更

#### 利用可能な設定

- `API_CONFIG.BASE_URL`: API サーバーのベース URL
- `API_CONFIG.ENDPOINTS`: 各 API エンドポイントのパス
- `API_CONFIG.DEFAULT_OPTIONS`: デフォルトのリクエストオプション
- `APP_CONFIG.USE_MOCK_DATA`: モックデータの使用フラグ

詳細は`src/utils/config.js`を参照してください。

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
