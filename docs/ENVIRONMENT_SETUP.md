# 環境モードの設定と区別方法

このドキュメントでは、pokenae.Web プロジェクトの3つの環境モード（debug, development, production）と、シークレット管理の方法について説明します。

## 開発・認証・実装の共通方針

- 本プロジェクトは Docker ベースの開発手順を前提とし、ローカル実行・検証・運用手順は Docker Compose を優先します。
- 認証は Google OAuth2（NextAuth）を使用します。認証情報は既存の環境変数・シークレット管理に従って扱います。
- API リクエストには Google 認証のアクセストークンを含める前提です。API クライアント／Route Handler の変更時はトークンの受け渡し・付与・検証を考慮してください。
- 実装は Next.js の標準機能（App Router / Route Handlers / Server Components）を最大限活用し、独自実装より推奨パターンを優先します。
- UI はコンポーネント指向を順守し、再利用可能な単位で責務分離します。既存の階層（atoms / molecules / organisms）と命名規則を尊重します。

## シークレット管理

**重要**: シークレット（秘密鍵・認証情報）は Docker Compose secrets で管理します。  
Git 管理されるファイルには含めず、`secrets/` ディレクトリ（`.gitignore` で除外済み）にローカル保持します。

### 必要なシークレット

| ファイル名                     | 展開先の環境変数       | 説明                                   | 取得方法                                                                  |
| ------------------------------ | ---------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `secrets/nextauth_secret`      | `NEXTAUTH_SECRET`      | NextAuth.jsのJWT暗号化キー             | 下記コマンドで生成                                                        |
| `secrets/google_client_id`     | `GOOGLE_CLIENT_ID`     | Google OAuth2 クライアントID           | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `secrets/google_client_secret` | `GOOGLE_CLIENT_SECRET` | Google OAuth2 クライアントシークレット | 同上                                                                      |

### セットアップ手順

#### 1. シークレットファイルの作成

```powershell
# secrets/ ディレクトリは .gitignore で除外されているためGitにコミットされません

# NEXTAUTH_SECRET を生成して保存
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > secrets/nextauth_secret

# Google OAuth2 のクライアント情報を保存（値を置き換えてください）
Set-Content -NoNewline -Path secrets/google_client_id -Value "あなたのクライアントID"
Set-Content -NoNewline -Path secrets/google_client_secret -Value "あなたのクライアントシークレット"
```

#### 2. 動作確認

```powershell
# ファイルが正しく作成されたか確認
Get-ChildItem secrets/ -Name
# → google_client_id, google_client_secret, nextauth_secret, README.md
```

### 仕組み

1. `docker-compose.yml` のトップレベル `secrets` で `secrets/` ディレクトリのファイルを定義
2. コンテナ起動時にファイルが `/run/secrets/` にマウントされる
3. `docker/entrypoint.sh` が `/run/secrets/` 内のファイルを読み取り、ファイル名を大文字に変換して環境変数に展開
4. アプリケーションが `process.env.NEXTAUTH_SECRET` 等で参照

> **CI/CD 環境**: GitHub Actions では GitHub Secrets から直接環境変数として渡すため、`secrets/` ディレクトリは不要です。

### CI/CD（GitHub Actions）でのシークレット管理

GitHub Actions でのデプロイ時は、GitHub Secrets に登録した値をワークフロー内で VPS の `secrets/` ディレクトリに書き込みます。

#### GitHub リポジトリに登録が必要な Secrets

**Settings → Secrets and variables → Actions → New repository secret** で以下を登録：

| Secret 名              | 説明                                                            |
| ---------------------- | --------------------------------------------------------------- |
| `NEXTAUTH_SECRET`      | NextAuth.jsのJWT暗号化キー                                      |
| `GOOGLE_CLIENT_ID`     | Google OAuth2 クライアントID                                    |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 クライアントシークレット                          |
| `PROD_NEXTAUTH_URL`    | 本番環境のNextAuth URL（例: `https://pokenae.example.com`）     |
| `DEV_NEXTAUTH_URL`     | 開発環境のNextAuth URL（例: `https://dev.pokenae.example.com`） |

デプロイワークフロー（`.github/workflows/main.yml`）が自動的に VPS 上の `~/pokenae-web/secrets/` にファイルを作成し、Docker Compose secrets として利用します。

## 環境モードの種類

### 1. **DEBUG モード**（ローカル開発）

- **実行コマンド**:
  `docker compose --env-file .env.docker.debug -p pokenae-debug -f docker-compose.yml -f docker-compose.debug.yml up --build`
- **用途**: ローカルマシンでの開発時
- **特徴**:
  - Docker 内で Next.js 開発サーバーが起動（ホスト側ポート 5000）
  - ホットリロード機能が有効
  - Docker Compose secrets が `NEXTAUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` として注入される
  - 詳細なエラーメッセージが表示
  - ナビゲーションバーに赤色の「DEBUG」バッジが表示

#### 起動方法

1. Game Library WebAPI リポジトリで Debug 用 Docker Compose を起動します。

   ```powershell
   docker compose -p gamelibrarytool-debug up -d --build
   curl.exe -k https://localhost:10081/health
   ```

2. Web リポジトリで Debug 用 Docker Compose を起動します。

   ```powershell
   docker compose --env-file .env.docker.debug -p pokenae-debug -f docker-compose.yml -f docker-compose.debug.yml up --build
   ```

3. `http://localhost:5000/api/auth/session` が JSON を返すことを確認してから、Google でログインします。

> 認証を含む動作確認では、ホスト上で `npm run dev` を直接実行しないでください。Docker Compose secrets が注入されないため、`NEXTAUTH_SECRET` などが未設定になり、`/api/auth/session` が失敗します。

#### ゲームライブラリのトラブルシュート

| 症状 | 確認内容 |
| --- | --- |
| Docker CLI が Linux Engine に接続できない | Docker Desktop を起動し、`docker info` が成功することを確認する |
| `/api/auth/session` が HTML または 500 を返す | Web を Debug Compose で起動し、`secrets/nextauth_secret`、`secrets/google_client_id`、`secrets/google_client_secret` が存在することを確認する |
| 公開マスタを取得できない | `curl.exe -k https://localhost:10081/health` と WebAPI の `/api/public/...` を確認する |
| 認証付き一覧だけ 401 になる | WebAPI の `GOOGLE_CLIENT_ID` と Web が転送する Google OAuth2 access token を確認する。ID token で代用しない |
| 10081 に接続できない | Game Library WebAPI の Debug Compose と DB の health、Web の `API_SERVICE_GAME_LIBRARY_API_BASE_URL` を確認する |

### 2. **DEVELOPMENT モード**（開発環境サーバー）

- **実行コマンド**: `npm run build && npm run start`
- **用途**: 開発環境サーバー上での動作確認
- **特徴**:
  - ビルド済みのアプリケーションを実行
  - 本番環境に近い実行環境
  - ナビゲーションバーに黄色の「開発環境」バッジが表示

#### 設定方法：

```bash
# .env.local または環境変数で設定
NEXT_PUBLIC_ENVIRONMENT=development npm run build
npm run start
```

### 3. **PRODUCTION モード**（本番環境）

- **実行コマンド**: `npm run build && npm run start`
- **用途**: 本番環境サーバーでの実行
- **特徴**:
  - パフォーマンス最適化されたビルド
  - ナビゲーションバーにバッジなし
  - エラーメッセージは簡潔

#### 設定方法：

```bash
# .env.local または環境変数で設定
NEXT_PUBLIC_ENVIRONMENT=production npm run build
npm run start
```

## 環境の判定方法

### コード内での判定

```typescript
import { isDebug, isDevelopment, isProduction, isDev } from "@/lib/config/env";

// デバッグモードの判定
if (isDebug()) {
  console.log("ローカル開発モード");
}

// 開発環境の判定
if (isDevelopment()) {
  console.log("開発環境サーバー");
}

// 本番環境の判定
if (isProduction()) {
  console.log("本番環境");
}

// 本番環境以外（debug または development）の判定
if (isDev()) {
  console.log("非本番環境");
}
```

### 環境変数での判定

Next.js では以下の環境変数で判定できます：

| モード      | NEXT_PUBLIC_ENVIRONMENT | NODE_ENV      |
| ----------- | ----------------------- | ------------- |
| DEBUG       | `debug`                 | `development` |
| DEVELOPMENT | `development`           | `production`  |
| PRODUCTION  | `production`            | `production`  |

## .env ファイルの優先順位

Next.js では以下の順序で環境ファイルが読み込まれます：

1. `.env.local` （最優先、ローカルマシンのみ）
2. `.env.{NEXT_PUBLIC_ENVIRONMENT}` （環境別）
3. `.env` （デフォルト）

### 推奨される設定方法

```bash
# ローカル開発用：.env.local
NEXT_PUBLIC_ENVIRONMENT=debug
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
API_SERVICES=game-library-api
API_SERVICE_GAME_LIBRARY_API_BASE_URL=http://localhost:10080
# API_SERVICES=game-library-api,inventory-api,reporting-api
# API_SERVICE_INVENTORY_API_BASE_URL=http://localhost:8011
# API_SERVICE_REPORTING_API_BASE_URL=http://localhost:8012
ADMIN_ALLOWED_EMAILS=admin@example.com,another-admin@example.com

# 開発環境用：.env.development
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_API_BASE_URL=https://api-dev.example.com
API_SERVICES=game-library-api
API_SERVICE_GAME_LIBRARY_API_BASE_URL=https://game-library-dev.example.com
# API_SERVICES=game-library-api,inventory-api,reporting-api
# API_SERVICE_INVENTORY_API_BASE_URL=https://inventory-dev.example.com
# API_SERVICE_REPORTING_API_BASE_URL=https://reporting-dev.example.com
ADMIN_ALLOWED_EMAILS=admin@example.com,another-admin@example.com

# 本番環境用：.env.production
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
API_SERVICES=game-library-api
API_SERVICE_GAME_LIBRARY_API_BASE_URL=https://game-library.example.com
# API_SERVICES=game-library-api,inventory-api,reporting-api
# API_SERVICE_INVENTORY_API_BASE_URL=https://inventory.example.com
# API_SERVICE_REPORTING_API_BASE_URL=https://reporting.example.com
ADMIN_ALLOWED_EMAILS=admin@example.com,another-admin@example.com
```

### 複数 Web API を使う場合

- `NEXT_PUBLIC_API_BASE_URL` は全体の既定 API です。
- 業務機能 API は `game-library-api` のように、画面名ではなく業務ドメインが分かる名前を推奨します。
- `API_SERVICES` に追加サービス名をカンマ区切りで列挙すると、`/api/services/{service}` 経由で利用できます。
- 追加サービスの URL は `API_SERVICE_<サービス名>_BASE_URL` で指定します。
- サービス名にハイフンが含まれる場合は `_` に変換して大文字で指定します。
  - 例: `inventory-api` → `API_SERVICE_INVENTORY_API_BASE_URL`

### 管理画面用の許可リスト

- `/game-management` 配下は管理者専用です。
- 管理者判定は `ADMIN_ALLOWED_EMAILS` または `ADMIN_EMAIL_ALLOWLIST` に設定したメールアドレスのカンマ区切り許可リストで行います。
- 判定対象は Google OAuth2 / NextAuth セッションの `session.user.email` です。
- 例: `ADMIN_ALLOWED_EMAILS=admin@example.com,owner@example.com`

## ナビゲーションバーのバッジ表示

ナビゲーションバーは各環境に応じて自動的にバッジを表示します：

- **DEBUG** モード: 赤色バッジ ⚠️
- **DEVELOPMENT** モード: 黄色バッジ ℹ️
- **PRODUCTION** モード: バッジなし

この仕組みは [components/organisms/NavigationBar/index.tsx](../components/organisms/NavigationBar/index.tsx) で実装されています。

## トラブルシューティング

### バッジが表示されない

- `NEXT_PUBLIC_ENVIRONMENT` 環境変数が正しく設定されているか確認
- `.env.local` ファイルが存在するか確認
- `npm run dev` または `npm run build` 後に環境変数を変更した場合、再度実行してください

### 環境が正しく認識されていない

```bash
# 現在の環境変数を確認
echo $NEXT_PUBLIC_ENVIRONMENT  # macOS/Linux
echo %NEXT_PUBLIC_ENVIRONMENT%  # Windows
```

### ビルド時にデフォルト設定になる

- `NEXT_PUBLIC_ENVIRONMENT` が設定されていない場合は自動的に `development` になります
