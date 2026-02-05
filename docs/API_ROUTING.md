# APIルーティング基盤

このプロジェクトは、複数のAppService（APIプロジェクト）を操作するGUIアプリケーションとして機能します。

## 概要

Next.jsのAPI Routesを活用した統一的なAPIアクセス基盤を提供します。

### 主な特徴

- 📡 **複数APIサービスへの統一的なアクセス**: サービス名を指定するだけで異なるAPIにアクセス可能
- 🔄 **プロキシパターン**: フロントエンドからNext.js API Routes経由でバックエンドAPIにアクセス
- 🛡️ **型安全**: TypeScriptによる完全な型定義
- ⚡ **簡単な利用**: Reactフック（`useApi`）による直感的なAPI呼び出し
- 🔧 **拡張可能**: 新しいサービスの追加が容易

## アーキテクチャ

```
フロントエンド (React)
    ↓ useApi フック / FrontendApiClient
Next.js API Routes (/api/services/[service]/[...path])
    ↓ ApiClient
バックエンド AppService (外部API)
```

## 設定

### 環境変数

`.env.local` ファイルを作成し、各AppServiceのエンドポイントを設定します：

```bash
# AppService 1
API_SERVICE_1_BASE_URL=http://localhost:8001
API_SERVICE_1_API_KEY=your-api-key-here

# AppService 2
API_SERVICE_2_BASE_URL=http://localhost:8002
API_SERVICE_2_API_KEY=your-api-key-here

# AppService 3
API_SERVICE_3_BASE_URL=http://localhost:8003
API_SERVICE_3_API_KEY=your-api-key-here
```

`.env.local.example` をコピーして使用してください。

## 使用方法

### 1. Reactコンポーネントでの使用

最も簡単な方法は `useApi` フックを使用することです：

```tsx
'use client';

import { useApi } from '@/lib/hooks/useApi';

export default function UsersPage() {
  // 静的なエンドポイントの場合、requestFnをコンポーネント外で定義可能
  const { data, error, loading, execute } = useApi(
    'service1',
    (client) => client.get('/users') // 静的な場合はこれでOK
  );

  const handleLoadUsers = async () => {
    await execute();
  };

  return (
    <div>
      <button onClick={handleLoadUsers} disabled={loading}>
        ユーザー一覧を取得
      </button>
      
      {loading && <p>読み込み中...</p>}
      {error && <p>エラー: {error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

**動的なパラメータを使用する場合:**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useApi } from '@/lib/hooks/useApi';

export default function DynamicUsersPage() {
  const [userId, setUserId] = useState('1');
  
  // 動的なパラメータを含む場合は useCallback でメモ化
  const requestFn = useCallback(
    (client) => client.get(`/users/${userId}`),
    [userId] // userId が変更されたときのみ再作成
  );
  
  const { data, error, loading, execute } = useApi(
    'service1',
    requestFn
  );

  const handleLoadUser = async () => {
    await execute();
  };

  return (
    <div>
      <input 
        value={userId} 
        onChange={(e) => setUserId(e.target.value)}
        placeholder="User ID"
      />
      <button onClick={handleLoadUser} disabled={loading}>
        ユーザーを取得
      </button>
      
      {loading && <p>読み込み中...</p>}
      {error && <p>エラー: {error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### 2. クライアント側で直接APIクライアントを使用

```tsx
'use client';

import { createFrontendApiClient } from '@/lib/api/frontend-client';

async function fetchUsers() {
  const client = createFrontendApiClient('service1');
  const response = await client.get('/users');
  
  if (response.success) {
    console.log('Users:', response.data);
  } else {
    console.error('Error:', response.error);
  }
}
```

### 3. サーバーサイド（Server Components/API Routes）での使用

```tsx
import { getApiClient } from '@/lib/api/client-factory';

export async function GET() {
  const client = getApiClient('service1');
  const response = await client.get('/users');
  
  if (response.success) {
    return Response.json(response.data);
  } else {
    return Response.json(
      { error: response.error.message },
      { status: 500 }
    );
  }
}
```

## API エンドポイント

### プロキシエンドポイント

すべてのAppServiceへのリクエストは以下のパターンでアクセスします：

```
/api/services/{service}/{...path}
```

**パラメータ:**
- `{service}`: サービス名（`service1`, `service2`, `service3`）
- `{...path}`: AppServiceのエンドポイントパス

**サポートされるHTTPメソッド:**
- GET
- POST
- PUT
- PATCH
- DELETE

### 例

```bash
# Service1の /users エンドポイントにアクセス
GET /api/services/service1/users

# Service2の /posts エンドポイントにデータをPOST
POST /api/services/service2/posts
Content-Type: application/json
{
  "title": "New Post",
  "content": "Post content"
}

# Service3の /items/123 を取得
GET /api/services/service3/items/123
```

## 新しいサービスの追加

1. **環境変数の追加**: `.env.local` に新しいサービスの設定を追加

```bash
API_SERVICE_4_BASE_URL=http://localhost:8004
API_SERVICE_4_API_KEY=your-api-key-here
```

2. **設定ファイルの更新**: `lib/config/api-config.ts` を編集

```typescript
export type ApiServiceName = 'service1' | 'service2' | 'service3' | 'service4';

export function getApiConfig(serviceName: ApiServiceName): ApiServiceConfig {
  const configs: Record<ApiServiceName, ApiServiceConfig> = {
    // ... 既存のサービス
    service4: {
      baseUrl: process.env.API_SERVICE_4_BASE_URL || 'http://localhost:8004',
      apiKey: process.env.API_SERVICE_4_API_KEY,
      timeout: 30000,
    },
  };

  return configs[serviceName];
}

export function getAvailableServices(): ApiServiceName[] {
  return ['service1', 'service2', 'service3', 'service4'];
}
```

3. **使用**: すぐに新しいサービスが利用可能になります

```tsx
const client = createFrontendApiClient('service4');
const response = await client.get('/endpoint');
```

## ディレクトリ構造

```
/app/api/services/[service]/[...path]
  └── route.ts                      # プロキシAPIルート

/lib
  ├── api
  │   ├── api-client.ts            # バックエンドAPIクライアント
  │   ├── client-factory.ts        # クライアントファクトリー
  │   ├── frontend-client.ts       # フロントエンド用クライアント
  │   └── route-helpers.ts         # API Routes用ヘルパー
  ├── config
  │   └── api-config.ts            # API設定
  ├── hooks
  │   └── useApi.ts                # React API フック
  └── types
      └── api.ts                   # 型定義
```

## エラーハンドリング

すべてのAPIレスポンスは以下の形式に統一されています：

### 成功レスポンス

```typescript
{
  success: true,
  data: T,
  message?: string
}
```

### エラーレスポンス

```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

### エラーコード

- `INVALID_SERVICE`: 無効なサービス名
- `METHOD_NOT_ALLOWED`: サポートされていないHTTPメソッド
- `TIMEOUT`: リクエストタイムアウト
- `NETWORK_ERROR`: ネットワークエラー
- `HTTP_{status}`: HTTPステータスコードエラー
- `INTERNAL_ERROR`: 内部エラー

## ベストプラクティス

1. **環境変数の管理**: `.env.local` を使用し、本番環境では適切に設定
2. **エラーハンドリング**: すべてのAPIコールで `success` フラグをチェック
3. **型定義**: レスポンスの型を明示的に定義
4. **タイムアウト**: 長時間かかる可能性がある処理には適切なタイムアウトを設定
5. **キャッシング**: 必要に応じてSWRやReact Queryなどと組み合わせる

### ⚠️ 重要: useApi フックの正しい使用方法

`useApi` フックを使用する際は、**requestFn を必ず `useCallback` でメモ化してください**。これを怠ると、無限再レンダリングやスタックオーバーフローが発生する可能性があります。

**❌ 悪い例（スタックオーバーフローの原因）:**
```tsx
// endpoint が変更されるたびに新しい関数が作成される
const { data, error, loading, execute } = useApi(
  'service1',
  (client) => client.get(endpoint) // 危険！
);
```

**✅ 良い例:**
```tsx
import { useCallback } from 'react';

// requestFn を useCallback でメモ化
const requestFn = useCallback(
  (client) => client.get(endpoint),
  [endpoint] // endpoint が変更されたときのみ再作成
);

const { data, error, loading, execute } = useApi(
  'service1',
  requestFn
);
```

**詳細な説明:**
- `useApi` の第2引数（`requestFn`）は、React の `useCallback` の依存配列に含まれています
- インライン関数を使用すると、コンポーネントが再レンダリングされるたびに新しい関数が作成されます
- これにより、`useApi` 内部の `useCallback` が毎回再実行され、無限ループが発生します
- 必ず `useCallback` または `useMemo` でメモ化してください

詳細は [カーネルスタックオーバーフロー調査レポート](./KERNEL_STACK_OVERFLOW_INVESTIGATION.md) を参照してください。

## サンプルコード

完全な使用例は `/app/api-example` ページを参照してください。

## トラブルシューティング

### CORS エラー

Next.js API Routesを経由することでCORSの問題を回避できます。

### タイムアウトエラー

デフォルトのタイムアウトは30秒です。長時間かかる処理の場合は、設定で調整してください。

### 環境変数が反映されない

開発サーバーを再起動してください：

```bash
npm run dev
```

## まとめ

このAPIルーティング基盤により、複数のAppServiceへのアクセスが統一的かつ型安全に実現できます。新しいサービスの追加も容易で、拡張性の高いアーキテクチャとなっています。
