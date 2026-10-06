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
3. runner コンテナは root で entrypoint を開始し、`docker/entrypoint.sh` が `/run/secrets/` 内の `600` ファイルを読み取る
4. ファイル名を大文字に変換して環境変数へ展開した後、`su-exec` で `nextjs:nodejs`（UID/GID 1001）へ権限降格する
5. `node server.js` は非 root で実行され、アプリケーションが `process.env.NEXTAUTH_SECRET` 等で参照する

entrypoint 自体を非 root で起動した場合は追加の権限変更を行わず、そのユーザーのままコマンドを `exec` します。デバッグ用 dev ステージも `nextjs:nodejs` で動作し、ホットリロード用の `/app/.next` は書き込み可能に設定されています。

> **CI/CD 環境**: VPS デプロイでは GitHub Secrets を一時ファイルとして安全に転送し、VPS の `secrets/` ディレクトリから Docker Compose secrets として読み込みます。

### CI/CD（GitHub Actions）でのシークレット管理

デプロイ設定は GitHub Environment を正本にします。VPS は `production`、ACA は
`development` / `copilot` を使用します。公開可能な設定は各 Environment の
Variables、認証情報は Secrets に同じキー名で登録します。

#### Environment Variables

| Variable 名                                | 説明 |
| ------------------------------------------ | ---- |
| `NEXTAUTH_URL`                             | その環境の公開 URL |
| `NEXT_PUBLIC_API_BASE_URL`                 | 既定 API の公開 URL |
| `NEXT_PUBLIC_API_URL`                      | 互換用の既定 API URL |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI`          | Google OAuth2 callback URL |
| `API_SERVICES`                             | 利用する API サービス ID |
| `API_SERVICE_GAME_LIBRARY_API_BASE_URL`    | game-library-api の URL |
| `CONTENT_REPOSITORY_OWNER`                 | 公開コンテンツのリポジトリ owner |
| `CONTENT_REPOSITORY_NAME`                  | 公開コンテンツのリポジトリ名 |
| `CONTENT_REPOSITORY_REF`                   | 公開コンテンツの参照 branch |
| `GAME_LIBRARY_API_VERSION_RANGE`           | 対応 API バージョン範囲 |

##### game-library API の接続先

| GitHub Environment | デプロイ先 | `API_SERVICE_GAME_LIBRARY_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_API_URL` |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------- |
| `production`       | VPS（main） | `https://gamelibrarytool.delightfulground-2e3fd153.japanwest.azurecontainerapps.io` |
| `development`      | ACA（develop） | `https://gamelibrarytool-develop.delightfulground-2e3fd153.japanwest.azurecontainerapps.io` |
| `copilot`          | ACA（copilot/**） | develop と同じ |

`NEXT_PUBLIC_*` はビルド時に埋め込まれるため、変更後は対象 branch の再ビルド・再デプロイが必要です。
本番 VPS デプロイの最後に `${NEXTAUTH_URL}/api/public/account-type-masters` を取得し、
Web 経由で本番 game-library API へ到達できることを検証します（API はゼロスケールのためリトライ付き）。

ACA の min replicas 0 構成では、コールドスタート中に game-library API が一時的に
502/503/504 またはタイムアウトを返すことがあります。Next.js 側は 1 リクエストあたり
最大 45 秒の範囲で GET のみ再試行し、復帰待ちの最終応答は `API_STARTING`（503）として返します。
そのため nginx の既定 `proxy_read_timeout 60s` でも、通常は Next 側の応答が先に返ります。
ブラウザ側の GET 再試行と UI の自動再読込で、45 秒を超えるコールドスタートを継続して待機します。
VPS のリバースプロキシには安全余裕として次を推奨します。

```nginx
proxy_connect_timeout 10s;
proxy_read_timeout 90s;
proxy_send_timeout 90s;
```

Next コンテナ自体の再起動中にリバースプロキシが返す 502 は、API コールドスタート
とは別系統です。コンテナヘルスチェックとデプロイ時の起動確認で切り分けてください。

#### Environment Secrets

| Secret 名                  | コンテナ内の環境変数              | 説明 |
| -------------------------- | --------------------------------- | ---- |
| `NEXTAUTH_SECRET`          | `NEXTAUTH_SECRET`                 | NextAuth.js の暗号化キー |
| `GOOGLE_CLIENT_ID`         | `GOOGLE_CLIENT_ID`                | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET`     | `GOOGLE_CLIENT_SECRET`            | Google OAuth2 client secret |
| `ADMIN_EMAILS`             | `ADMIN_EMAILS`                    | 管理者 allowlist |
| `GH_APP_ID`                | `GITHUB_APP_ID`                   | GitHub App ID |
| `GH_APP_INSTALLATION_ID`   | `GITHUB_APP_INSTALLATION_ID`      | GitHub App installation ID |
| `GH_APP_PRIVATE_KEY_BASE64`| `GITHUB_APP_PRIVATE_KEY_BASE64`   | GitHub App PEM の base64 |

GitHub は `GITHUB_` で始まる Secret 名を予約しているため、GitHub App の登録名には
`GH_APP_*` を使い、workflow がアプリ用の `GITHUB_APP_*` へマッピングします。
GitHub App 未構成時は順に `0`、`0`、`ZGlzYWJsZWQ=` を登録します。この 3 値は
アプリが対応済みの無効化センチネルであり、公開表示は継続し、管理 API は
「資格情報未設定」として fail closed になります。実値とセンチネルを混在させないでください。

VPS の SSH 接続情報は引き続き `HOST`、`USERNAME`、`SSH_PRIVATE_KEY` として
GitHub Secrets に保持します。Azure の resource group、ACR、managed identity
など環境間で共有する値は Repository Variables に保持します。
既存の Repository Secrets は、同名の Environment Secret を登録するまで
reusable workflow への明示的なフォールバックとして利用できます。GitHub は
Secret の値を読み戻せないため、移行時は保持している正本から各 Environment へ
再登録し、動作確認後に不要な Repository Secret を削除してください。

デプロイワークフロー（`.github/workflows/main.yml`）は
個別の production Environment Variables を検証して env ファイルを生成し、VPS 上の
`~/pokenae-web/.env.docker.production` へデプロイユーザー所有・`600` で
原子的に配置します。その後、稼働中コンテナを停止する前に
`docker compose config` を実行します。設定が不足・不正な場合は現行
コンテナを停止せずデプロイを終了するため、VPS 上で env ファイルを手動作成する
必要はありません。

認証用ファイルは従来どおり VPS 上の `~/pokenae-web/secrets/` に作成します。
VPS 上ではデプロイ用ユーザーを所有者として、`secrets/` を `700`、既存ファイルを
含む配下の全シークレットファイルを `600` に毎回矯正します。Docker runner は
secrets の読み取り時だけ root で動作し、読み取り後は必ず UID/GID 1001 に
降格します。デプロイ検証では Node.js プロセスの UID が 1001 であることも
確認します。

Environment Variable / Secret を更新した場合は対象 branch のデプロイを再実行してください。
`is not configured in the selected GitHub Environment` が表示された場合は、対象
Environment と Variable 名を確認します。VPS 上の `.env.docker.production` は
Actions の生成物であり、手動編集や Git へのコミットは行いません。

旧 `VPS_RUNTIME_ENV` Secret は、新 workflow が main に反映されて最初の production
デプロイが成功した後に削除します。反映前に削除すると、旧 workflow のデプロイが
失敗するため、移行作業中は残しておいてください。

entrypoint のコンテナ単体テストは、Docker daemon が利用可能な環境で次のように実行できます。

```bash
docker build --target entrypoint-test -f docker/Dockerfile .
```

## 環境モードの種類

### 1. **DEBUG モード**（ローカル開発）

- **実行コマンド**: `npm run dev`
- **用途**: ローカルマシンでの開発時
- **特徴**:
  - Next.js 開発サーバーが起動（ポート 5000）
  - ホットリロード機能が有効
  - 詳細なエラーメッセージが表示
  - ナビゲーションバーに赤色の「DEBUG」バッジが表示

Docker Compose の debug 環境で `gray-matter` など、`package.json` と
`package-lock.json` に記載済みのモジュールが解決できない場合は、古い匿名
`node_modules` ボリュームが残っている可能性があります。対象プロジェクトだけの
ボリュームを再作成してイメージをビルドします。

```bash
docker compose --env-file .env.docker.debug -p pokenae-debug -f docker-compose.yml -f docker-compose.debug.yml down -v
docker compose --env-file .env.docker.debug -p pokenae-debug -f docker-compose.yml -f docker-compose.debug.yml up --build
```

#### 設定方法：

```bash
# .env.local ファイルを作成または編集
echo "NEXT_PUBLIC_ENVIRONMENT=debug" >> .env.local
npm run dev
```

または環境変数を直接指定：

```bash
NEXT_PUBLIC_ENVIRONMENT=debug npm run dev
```

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
