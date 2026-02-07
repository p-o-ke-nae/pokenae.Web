# Google OAuth2認証機能について

このドキュメントでは、pokenae.Webに実装されたGoogle OAuth2認証機能について日本語で解説します。

## 概要

本プロジェクトでは、NextAuth.jsを使用してGoogle OAuth2認証を実装しています。この認証機能により、ユーザーはGoogleアカウントでログインでき、バックエンドAPIはユーザーのGoogle認証情報を使用してスプレッドシートやDriveにアクセスできます。

## 主な機能

### 1. Google OAuth2認証

- **認証プロバイダー**: Google OAuth2
- **セッション管理**: JWTベース
- **スコープ**: 
  - `openid`: ユーザーID取得
  - `email`: メールアドレス取得
  - `profile`: プロフィール情報取得
  - `https://www.googleapis.com/auth/spreadsheets`: スプレッドシート読み書き
  - `https://www.googleapis.com/auth/drive.file`: Driveファイルアクセス

### 2. UIコンポーネント

#### EnvironmentBadge（環境バッジ）
開発環境やデバッグ環境であることを示すバッジです。

- **DEBUG**: 赤色バッジ（ローカル開発時）
- **開発環境**: 黄色バッジ（開発サーバー）
- **本番環境**: 表示なし

#### AuthBadge（認証バッジ）
認証状態を表示するバッジです。

**未ログイン時:**
- 「Googleでログイン」ボタンを表示
- Googleアイコン付きの青いボタン

**ログイン時:**
- ユーザー名を表示
- メールアドレスを表示（任意）
- 「ログアウト」ボタンを表示

#### NavigationBar（ナビゲーションバー）
画面上部のナビゲーションバーです。

**表示ロジック:**
- **本番環境**: 認証バッジのみ表示
- **開発環境**: 認証バッジ + 環境バッジを表示

### 3. API連携

#### 自動的なトークン付与

`FrontendApiClient`を使用すると、Google認証のアクセストークンが自動的にリクエストヘッダーに含まれます。

```typescript
import { createFrontendApiClient } from '@/lib/api/frontend-client';

// クライアントを作成
const client = createFrontendApiClient('your-service');

// APIリクエスト（自動的にX-Google-Access-Tokenヘッダーが付与される）
const response = await client.get('/spreadsheet-data');
```

#### バックエンドでの利用

バックエンドAPIでは、リクエストヘッダーからGoogle認証トークンを取得できます。

```typescript
// Next.js API Route
export async function GET(request: Request) {
  // Google認証トークンを取得
  const accessToken = request.headers.get('X-Google-Access-Token');
  
  if (!accessToken) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  
  // Google Sheets APIを使用
  const sheets = google.sheets({ version: 'v4', auth: accessToken });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: 'your-spreadsheet-id',
    range: 'Sheet1!A1:D10',
  });
  
  return NextResponse.json(response.data);
}
```

## アーキテクチャ

### 認証フロー

1. ユーザーが「Googleでログイン」ボタンをクリック
2. Google OAuth2認証画面にリダイレクト
3. ユーザーがGoogleアカウントでログイン・承認
4. NextAuth.jsがコールバックを受け取り、セッションを作成
5. アクセストークンとリフレッシュトークンをJWTに保存
6. ユーザーがアプリケーションにリダイレクトされる

### セッション管理

- **戦略**: JWT（JSON Web Token）
- **保存場所**: HTTPOnlyクッキー
- **有効期限**: デフォルト30日（NextAuth.jsの設定）
- **更新**: リフレッシュトークンを使用して自動更新

### トークンの保存

```typescript
// lib/auth/auth-options.ts
callbacks: {
  async jwt({ token, account }) {
    if (account) {
      token.accessToken = account.access_token;
      if (account.refresh_token) {
        token.refreshToken = account.refresh_token;
      }
      token.accessTokenExpires = account.expires_at;
    }
    return token;
  },
  async session({ session, token }) {
    session.accessToken = token.accessToken as string;
    session.refreshToken = token.refreshToken as string;
    return session;
  },
}
```

## コンポーネントの使用方法

### EnvironmentBadge

```typescript
import EnvironmentBadge from '@/components/atoms/EnvironmentBadge';

// 使用例
<EnvironmentBadge className="custom-class" />
```

### AuthBadge

```typescript
import AuthBadge from '@/components/atoms/AuthBadge';

// 未ログイン時
<AuthBadge isAuthenticated={false} />

// ログイン時
<AuthBadge 
  isAuthenticated={true}
  userName="山田太郎"
  userEmail="yamada@example.com"
/>
```

### NavigationBar

```typescript
import NavigationBar from '@/components/organisms/NavigationBar';

// 使用例（layout.tsxなど）
<NavigationBar />
```

## セキュリティに関する考慮事項

### 1. 環境変数の管理

- `NEXTAUTH_SECRET`: 32バイト以上のランダムな文字列を使用
- `GOOGLE_CLIENT_SECRET`: 絶対にコードにハードコードしない
- `.env.local`ファイルを`.gitignore`に追加（デフォルトで含まれています）

### 2. HTTPSの使用

本番環境では必ずHTTPSを使用してください。これにより、アクセストークンが暗号化された状態で送信されます。

### 3. スコープの最小化

必要最小限のスコープのみを要求してください。現在の実装では、スプレッドシートとDriveファイルアクセスのスコープを含んでいます。

### 4. トークンの有効期限

アクセストークンには有効期限があります。リフレッシュトークンを使用して、期限切れ時に自動的に更新する実装を検討してください。

## トラブルシューティング

### ログインボタンをクリックしても何も起こらない

1. 環境変数が正しく設定されているか確認
2. Google Cloud ConsoleでリダイレクトURIが正しく設定されているか確認
3. ブラウザのコンソールでエラーを確認

### "redirect_uri_mismatch"エラー

Google Cloud Consoleで設定したリダイレクトURIと、アプリケーションで使用しているURLが一致していません。

**正しいリダイレクトURI:**
- 開発: `http://localhost:5000/api/auth/callback/google`
- 本番: `https://your-domain.com/api/auth/callback/google`

### トークンが取得できない

1. OAuth同意画面で必要なスコープが設定されているか確認
2. Google Sheets APIとGoogle Drive APIが有効化されているか確認
3. `access_type: 'offline'`と`prompt: 'consent'`が設定されているか確認

### セッションが保持されない

1. `NEXTAUTH_SECRET`が正しく設定されているか確認
2. クッキーが正しく送信されているか（ブラウザの開発者ツールで確認）
3. `NEXTAUTH_URL`が現在のドメインと一致しているか確認

## 参考資料

- [NextAuth.js公式ドキュメント](https://next-auth.js.org/)
- [Google OAuth2ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Google Sheets APIドキュメント](https://developers.google.com/sheets/api)
- [Google Drive APIドキュメント](https://developers.google.com/drive/api)

## 追加の設定方法

詳細な設定手順については、以下のドキュメントを参照してください：

- [Google Auth Setup Guide (英語)](./GOOGLE_AUTH_SETUP.md)
