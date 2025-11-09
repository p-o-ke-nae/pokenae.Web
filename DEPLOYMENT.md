# デプロイメントガイド

このドキュメントでは、pokenae.Webアプリケーションのデプロイメント方法と環境設定について説明します。

## ブランチ戦略

このプロジェクトでは以下のブランチ戦略を採用しています：

### mainブランチ（本番環境）

- **用途**: 本番環境へのデプロイ
- **環境**: Production
- **API URL**: 本番APIサーバー
- **デバッグモード**: OFF

### developブランチ（開発環境）

- **用途**: 開発環境へのデプロイ
- **環境**: Development/Staging
- **API URL**: 開発APIサーバー
- **デバッグモード**: ON

### feature/xxxブランチ

- **用途**: 機能開発
- **マージ先**: developブランチ

### PR（Pull Request）の作成

新機能やリファクタリングのPRは、**developブランチ**をマージ先として作成してください。

```bash
# 例: developブランチへのPR
git checkout develop
git pull origin develop
git checkout -b feature/new-feature
# ... 変更を実施 ...
git push origin feature/new-feature
# GitHubでPRを作成（Base: develop）
```

## 環境変数の設定

### Vercelでのデプロイ設定

#### mainブランチ（本番環境）

Vercel プロジェクト設定 > Environment Variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://collectionassistancetoolapi-geaca2fwetcsgthk.japanwest-01.azurewebsites.net` | Production |
| `NEXT_PUBLIC_DEBUG_MODE` | `false` | Production |

#### developブランチ（開発環境）

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `<開発用APIサーバーのURL>` | Preview (develop) |
| `NEXT_PUBLIC_DEBUG_MODE` | `true` | Preview (develop) |

### Azure Static Web Appsでのデプロイ設定

`azure-static-web-apps.yml`に環境変数を追加：

```yaml
# 本番環境（mainブランチ）
env:
  NEXT_PUBLIC_API_BASE_URL: https://collectionassistancetoolapi-geaca2fwetcsgthk.japanwest-01.azurewebsites.net
  NEXT_PUBLIC_DEBUG_MODE: false

# 開発環境（developブランチ）
env:
  NEXT_PUBLIC_API_BASE_URL: <開発用APIサーバーのURL>
  NEXT_PUBLIC_DEBUG_MODE: true
```

## ローカル開発環境

### 1. リポジトリのクローン

```bash
git clone https://github.com/p-o-ke-nae/pokenae.Web.git
cd pokenae.Web
git submodule update --init --recursive
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成（このファイルはGit管理外）：

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://localhost:7077
NEXT_PUBLIC_DEBUG_MODE=true
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3001 を開く

## ビルドとテスト

### 開発ビルド

```bash
npm run dev
```

### 本番ビルド

```bash
npm run build
npm start
```

### Lintとテスト

```bash
npm run lint
```

## トラブルシューティング

### APIサーバーに接続できない

1. 環境変数`NEXT_PUBLIC_API_BASE_URL`が正しく設定されているか確認
2. APIサーバーが起動しているか確認
3. CORS設定が正しいか確認（詳細は`CORS_SETUP_GUIDE.md`参照）

### ビルドエラー

1. `node_modules`を削除して再インストール: `rm -rf node_modules && npm install`
2. `.next`キャッシュをクリア: `rm -rf .next && npm run build`
3. サブモジュールを更新: `git submodule update --init --recursive`

### 環境変数が反映されない

1. 開発サーバーを再起動
2. `.env.local`ファイルの変数名に`NEXT_PUBLIC_`プレフィックスが付いているか確認
3. ビルド時に環境変数が読み込まれているか確認（ビルドログで"- Environments:"を確認）

## 参考資料

- [Next.js 環境変数](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel デプロイメント](https://vercel.com/docs)
- [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/)
