# pokenae.Web

## 概要

このリポジトリは、Next.js を用いて構築する pokenae のフロントエンドです。Google OAuth2（NextAuth）認証と Next.js の proxy / Route Handler を組み合わせ、複数のバックエンド API を画面機能ごとに利用します。

| 項目 | 内容 |
|------|------|
| フロントエンド基盤 | Next.js App Router |
| 認証 | Google OAuth2 / NextAuth |
| API 接続 | `createFrontendApiClient` と `/api/services/{service}/{...path}` proxy |
| 開発前提 | Docker Compose ベース |
| Phase 2 で骨子追加した機能 | ポケモンダメージ計算 (`/pokemon-damage-calculator`) |

## Documentation

- **[環境モードの設定と区別方法](./docs/ENVIRONMENT_SETUP.md)** - 環境変数、シークレット、追加 API サービス設定
- **[API Routing Guide](./docs/API_ROUTING.md)** - API ルーティング基盤と proxy 運用方針
- **[Pokemon Damage Calculator API 契約差分メモ](./docs/API_CONTRACT_DIFFS_POKEMON_DAMAGE_CALCULATOR_API.md)** - Issue #97 向けの設計骨子
- **[Google Auth Setup Guide](./docs/GOOGLE_AUTH_SETUP.md)** - Google OAuth2認証の設定ガイド（英語）
- **[Google OAuth2認証機能について](./docs/GOOGLE_AUTH_SETUP_JA.md)** - Google OAuth2認証の詳細解説（日本語）
- **[Kernel Stack Overflow Investigation](./docs/KERNEL_STACK_OVERFLOW_INVESTIGATION.md)** - スタックオーバーフロー問題の調査と修正レポート

## 開発・実装の共通方針

- Docker Compose ベースの開発手順を前提とします。
- 認証方式は Google OAuth2（NextAuth）を前提とし、認証情報は環境変数・シークレット管理の設計に従います。
- API リクエストでは Google 認証のアクセストークンを受け渡し・付与・検証する前提で実装します。
- Next.js の標準機能（App Router / Route Handlers / Server Components）を最大限活用します。
- UI はコンポーネント指向で設計し、既存の階層と命名規則を尊重します。

## ポケモンダメージ計算機能の設計骨子

Issue #97 では、ポケモンダメージ計算機能を既存の認証・proxy 基盤へ統合する予定です。

| 項目 | 設計骨子 |
|------|----------|
| feature entry | `/pokemon-damage-calculator` |
| Run workspace | `/pokemon-damage-calculator/runs/[runId]` |
| 利用 API | `pokemon-damage-calculator-api` |
| 認証伝搬 | `Authorization` と `X-Google-Access-Token` の 2 ヘッダーを維持 |
| 所有者判定 | `googleUserId` を session / JWT に保持し、`RunDto.OwnerUserId` と比較予定 |

詳細は [`docs/API_ROUTING.md`](./docs/API_ROUTING.md) と [`docs/API_CONTRACT_DIFFS_POKEMON_DAMAGE_CALCULATOR_API.md`](./docs/API_CONTRACT_DIFFS_POKEMON_DAMAGE_CALCULATOR_API.md) を参照してください。

## Getting Started

まず開発サーバーを起動します。

```bash
npm run dev
```

ブラウザーで [http://localhost:3000](http://localhost:3000) を開いて動作を確認してください。

ローカルセットアップや環境変数の詳細は [`docs/ENVIRONMENT_SETUP.md`](./docs/ENVIRONMENT_SETUP.md) を参照してください。
