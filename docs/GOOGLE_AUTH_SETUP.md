# Google OAuth2認証の設定ガイド

このドキュメントでは、pokenae.WebでGoogle OAuth2認証を設定する方法を説明します。

## Google Cloud Consoleでの設定

### 1. プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択

### 2. OAuth同意画面の設定

1. 「APIとサービス」→「OAuth同意画面」に移動
2. ユーザータイプを選択（内部または外部）
3. アプリ情報を入力：
   - アプリ名: pokenae
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
4. スコープの設定：
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/spreadsheets`（スプレッドシート読み書き用）
   - `.../auth/drive.file`（Driveファイルアクセス用）

### 3. OAuth2クライアントの作成

1. 「APIとサービス」→「認証情報」に移動
2. 「認証情報を作成」→「OAuthクライアントID」を選択
3. アプリケーションの種類: Webアプリケーション
4. 名前: pokenae Web Client
5. 承認済みのリダイレクトURIを追加：
   - 開発環境: `http://localhost:5000/api/auth/callback/google`
   - 本番環境: `https://your-domain.com/api/auth/callback/google`
6. 作成後、クライアントIDとクライアントシークレットをコピー

### 4. Google Sheets APIとGoogle Drive APIの有効化

1. 「APIとサービス」→「ライブラリ」に移動
2. 「Google Sheets API」を検索して有効化
3. 「Google Drive API」を検索して有効化

## アプリケーションの設定

### 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定：

```bash
# NextAuth.js設定
NEXTAUTH_URL=http://localhost:5000  # 本番環境では実際のドメインに変更
NEXTAUTH_SECRET=ランダムな秘密鍵  # 以下のコマンドで生成可能: openssl rand -base64 32

# Google OAuth2認証
GOOGLE_CLIENT_ID=あなたのクライアントID
GOOGLE_CLIENT_SECRET=あなたのクライアントシークレット

# 環境設定
NEXT_PUBLIC_ENVIRONMENT=debug  # debug, development, production のいずれか

# バックエンドAPI設定（オプション）
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### NEXTAUTH_SECRETの生成

セキュアなランダム文字列を生成するには：

```bash
openssl rand -base64 32
```

または：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 本番環境へのデプロイ

### 環境変数の設定（Vercel等）

1. `NEXTAUTH_URL`: 本番環境のURL（例: `https://pokenae.example.com`）
2. `NEXTAUTH_SECRET`: 安全なランダム文字列
3. `GOOGLE_CLIENT_ID`: Google Cloudで作成したクライアントID
4. `GOOGLE_CLIENT_SECRET`: Google Cloudで作成したクライアントシークレット
5. `NEXT_PUBLIC_ENVIRONMENT`: `production`

### リダイレクトURIの追加

Google Cloud Consoleで、本番環境のリダイレクトURIを追加：
```
https://your-domain.com/api/auth/callback/google
```

## 使用方法

### ログイン

ユーザーは「Googleでログイン」ボタンをクリックすることでログインできます。

### ログアウト

NavigationBarに表示される「ログアウト」ボタンをクリックします。

### APIリクエストでの認証情報の利用

`FrontendApiClient`を使用すると、Google認証のアクセストークンが自動的に`X-Google-Access-Token`ヘッダーに含まれます：

```typescript
import { createFrontendApiClient } from '@/lib/api/frontend-client';

const client = createFrontendApiClient('your-service');

// アクセストークンが自動的にヘッダーに含まれる
const response = await client.get('/endpoint');
```

バックエンドAPIでは、このヘッダーを使用してGoogle APIにアクセスできます。

## トラブルシューティング

### エラー: "redirect_uri_mismatch"

Google Cloud Consoleで設定したリダイレクトURIが、アプリケーションで使用しているURLと一致していることを確認してください。

### エラー: "invalid_client"

`GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が正しく設定されていることを確認してください。

### セッションが保持されない

`NEXTAUTH_SECRET`が正しく設定されていることを確認してください。

### アクセストークンが取得できない

OAuth同意画面で必要なスコープが設定されていることを確認してください。

## セキュリティのベストプラクティス

1. **NEXTAUTH_SECRETを安全に管理**: 環境変数として設定し、コードにハードコードしないでください
2. **HTTPSを使用**: 本番環境では必ずHTTPSを使用してください
3. **リダイレクトURIを制限**: 必要なURIのみを追加してください
4. **クライアントシークレットを共有しない**: Google Cloudのクライアントシークレットは機密情報です
5. **定期的なトークンの更新**: リフレッシュトークンを使用してアクセストークンを定期的に更新してください

## 参考資料

- [NextAuth.js ドキュメント](https://next-auth.js.org/)
- [Google OAuth2 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Google Sheets API ドキュメント](https://developers.google.com/sheets/api)
