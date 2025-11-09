# Google OAuth2 セキュリティガイド

このドキュメントでは、pokenae.WebにおけるGoogle OAuth2認証のセキュリティ実装について説明します。

## 概要

pokenae.Webは、Google OAuth2を使用してユーザー認証を行います。認証フローは以下の通りです：

1. **フロントエンド（pokenae.Web）**: ユーザーがログインボタンをクリック
2. **Google**: ユーザーがGoogleアカウントを選択して認証
3. **フロントエンド**: 認証コードとstateパラメータを受け取る
4. **バックエンド（pokenae.Web API）**: 認証情報を受け取り、UserManagerに委譲
5. **UserManager**: Googleとトークン交換を行い、アクセストークンを生成
6. **フロントエンド**: トークンを受け取り、ローカルストレージに保存

## セキュリティ対策

### 1. CSRF（Cross-Site Request Forgery）攻撃対策

#### State パラメータの生成
```typescript
// Login.tsx
const generateStateParam = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array); // 暗号学的に安全な乱数
  const nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
  const state = {
    nonce: nonce,
    timestamp: Date.now(),
    userAgent: navigator.userAgent
  };
  
  const stateString = btoa(JSON.stringify(state));
  sessionStorage.setItem('auth_state', stateString);
  
  return stateString;
};
```

**ポイント:**
- `crypto.getRandomValues()`を使用して暗号学的に安全なランダム値（nonce）を生成
- タイムスタンプを含めて有効期限をチェック
- sessionStorageに保存して後で検証

#### State パラメータの検証
```typescript
// Callback.tsx
const validateState = (receivedState) => {
  // sessionStorageから保存されたstateを取得
  const storedState = sessionStorage.getItem('auth_state');
  
  // stateの一致を確認
  if (storedState !== receivedState) {
    throw new Error('State mismatch. Possible CSRF attack.');
  }
  
  // タイムスタンプの検証（5分以内）
  const decoded = atob(receivedState);
  const parsed = JSON.parse(decoded);
  const currentTime = Date.now();
  const STATE_EXPIRY_TIME = 5 * 60 * 1000; // 5分
  
  if (currentTime - parsed.timestamp > STATE_EXPIRY_TIME) {
    throw new Error('State has expired.');
  }
  
  // 使用済みstateを削除（リプレイアタック対策）
  sessionStorage.removeItem('auth_state');
  
  return true;
};
```

**ポイント:**
- sessionStorageに保存されたstateと受信したstateを照合
- タイムスタンプをチェックして有効期限を確認（5分）
- 検証成功後、使用済みstateを削除

### 2. リプレイアタック対策

**問題:** 攻撃者が正規の認証レスポンスを傍受し、再利用する

**対策:**
- 使用済みのstateパラメータをsessionStorageから削除
- タイムスタンプによる有効期限チェック（5分）

```typescript
// 検証成功後、使用済みstateを削除
sessionStorage.removeItem('auth_state');
```

### 3. Client Secret の保護

**重要:** Client SecretはフロントエンドのコードやブラウザのDevToolsから見えてはいけません。

**実装:**
- Client Secretはバックエンドのみで管理
- トークン交換はバックエンド（UserManager）で実行
- フロントエンドはcodeとstateのみをバックエンドに送信

```typescript
// authUtils.ts
export const exchangeCodeForTokens = async (code, state) => {
  // フロントエンドからバックエンドにcodeとstateを送信
  const backendUrl = `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.OAUTH_CALLBACK}`;
  
  const tokenResponse = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      code: code,
      state: state
    })
  });
  
  // バックエンドはUserManagerに委譲して、トークンを取得
  // UserManagerがGoogleとトークン交換を実行
};
```

### 4. エラーハンドリング

**Google認証エラーの検出:**
```typescript
// Callback.tsx
const error = urlParams.get('error');
if (error) {
  const errorDescription = urlParams.get('error_description') || 'Unknown error';
  throw new Error(`認証エラー: ${error} - ${errorDescription}`);
}
```

**ユーザーフレンドリーなエラー表示:**
- セキュリティエラーの場合は、詳細なメッセージを表示
- 5秒後に自動的にホームページにリダイレクト

## 認証フロー図

```
┌─────────────┐
│   ユーザー   │
└──────┬──────┘
       │ 1. ログインボタンをクリック
       ▼
┌──────────────────────┐
│  フロントエンド       │
│  (pokenae.Web)       │
│                      │
│  - state生成         │
│  - sessionStorage保存│
└──────┬───────────────┘
       │ 2. Googleの認証ページへリダイレクト
       ▼
┌──────────────────────┐
│      Google          │
│  OAuth2 Server       │
│                      │
│  - ユーザー認証      │
│  - 同意画面          │
└──────┬───────────────┘
       │ 3. 認証コードとstateを返却
       ▼
┌──────────────────────┐
│  フロントエンド       │
│  (/callback)         │
│                      │
│  - state検証         │
│  - CSRF対策          │
└──────┬───────────────┘
       │ 4. codeとstateを送信
       ▼
┌──────────────────────┐
│  バックエンド        │
│  (pokenae.Web API)   │
└──────┬───────────────┘
       │ 5. 認証情報を委譲
       ▼
┌──────────────────────┐
│   UserManager        │
│   Web API            │
│                      │
│  - Googleとトークン交換│
│  - ユーザー情報取得   │
│  - トークン生成       │
└──────┬───────────────┘
       │ 6. アクセストークンを返却
       ▼
┌──────────────────────┐
│  フロントエンド       │
│                      │
│  - トークン保存       │
│  - ホームへリダイレクト│
└──────────────────────┘
```

## セキュリティチェックリスト

### 実装時
- [x] 暗号学的に安全なランダム値を使用
- [x] stateパラメータをsessionStorageに保存
- [x] タイムスタンプによる有効期限チェック
- [x] 使用済みstateの削除
- [x] Client Secretの保護（バックエンドのみ）
- [x] エラーハンドリング

### デプロイ時
- [ ] HTTPS通信の確認
- [ ] CORS設定の確認
- [ ] 環境変数の設定（Client ID、バックエンドURL）
- [ ] リダイレクトURIの設定（Google Cloud Console）

### 運用時
- [ ] ログ監視（異常なアクセスパターン）
- [ ] トークンの有効期限管理
- [ ] セキュリティアップデートの適用

## 参考資料

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [RFC 6749 - The OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
