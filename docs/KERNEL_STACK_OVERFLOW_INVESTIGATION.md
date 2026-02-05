# カーネルスタックオーバーフロー調査レポート

## 調査日
2026-02-05

## 問題の概要
開発環境および本番環境でカーネルスタックオーバーフローが発生していた。

## 原因の特定

### 主な問題: React Hooks の依存配列の不備

#### 1. `lib/hooks/useApi.ts` の問題

**問題箇所:**
```typescript
const execute = useCallback(async () => {
  // ... コード ...
  const response = await requestFn(client);
  // ... コード ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [serviceName]); // ❌ requestFn が依存配列に含まれていない
```

**問題の詳細:**
- `useCallback` の依存配列に `requestFn` が含まれていなかった
- `requestFn` は外部から渡されるパラメータであり、変更される可能性がある
- 依存配列に含まれていないため、`execute` 関数は古い `requestFn` を参照し続ける
- これにより、React の再レンダリングループや無限再帰が発生する可能性がある

#### 2. `app/api-example/page.tsx` の問題

**問題箇所:**
```typescript
const { data, error, loading, execute } = useApi(
  selectedService,
  (client) => client.get(endpoint) // ❌ 毎回新しい関数が作成される
);
```

**問題の詳細:**
- `endpoint` が変更されるたびに、インライン関数 `(client) => client.get(endpoint)` が新しく作成される
- この新しい関数が `useApi` の `requestFn` として渡される
- `useApi` 内の `useCallback` が適切に依存配列を持っていないため、無限ループが発生する

### スタックオーバーフローのメカニズム

1. `endpoint` が変更される（例: ユーザーが入力フィールドを変更）
2. `api-example/page.tsx` のコンポーネントが再レンダリングされる
3. 新しい `requestFn` 関数が作成される
4. `useApi` フックに新しい `requestFn` が渡される
5. しかし、`useCallback` の依存配列に `requestFn` がないため、`execute` は更新されない
6. 状態の不整合により、React が再レンダリングを繰り返す
7. **無限再レンダリングループが発生**
8. **スタックがオーバーフローする**

## 修正内容

### 修正1: `lib/hooks/useApi.ts`

**修正前:**
```typescript
}, [serviceName]);
```

**修正後:**
```typescript
}, [serviceName, requestFn]);
```

**効果:**
- `requestFn` が変更されたときに `execute` 関数も適切に再作成される
- 古い関数参照による問題を防ぐ

### 修正2: `app/api-example/page.tsx`

**修正前:**
```typescript
const { data, error, loading, execute } = useApi(
  selectedService,
  (client) => client.get(endpoint)
);
```

**修正後:**
```typescript
const requestFn = useCallback(
  (client: ReturnType<typeof createFrontendApiClient>) => client.get(endpoint),
  [endpoint]
);

const { data, error, loading, execute } = useApi(
  selectedService,
  requestFn
);
```

**効果:**
- `requestFn` を `useCallback` でメモ化
- `endpoint` が変更されない限り、同じ関数参照を保持
- 不必要な再レンダリングを防ぐ

## 推奨事項

### 1. 他のコンポーネントでの同様のパターンの確認

`useApi` フックを使用している他のコンポーネントも同様の問題を抱えている可能性があります。以下のパターンを確認してください：

```typescript
// ❌ 悪い例
useApi(serviceName, (client) => client.get(dynamicEndpoint))

// ✅ 良い例
const requestFn = useCallback(
  (client) => client.get(dynamicEndpoint),
  [dynamicEndpoint]
);
useApi(serviceName, requestFn)
```

### 2. ドキュメントの更新

`useApi` フックの使用方法を文書化し、以下の点を明記すべきです：

- `requestFn` は `useCallback` または `useMemo` でメモ化すること
- 動的なパラメータは適切に依存配列に含めること
- インライン関数は避けること

### 3. TypeScript の型定義の改善

`useApi` の型定義を改善して、メモ化されていない関数が渡された場合に警告を出すことを検討してください。

### 4. ESLint ルールの強化

`react-hooks/exhaustive-deps` ルールを無効化せず、適切な依存配列を設定することを徹底してください。

## 検証方法

以下の手順で修正内容を検証できます：

1. **開発サーバーの起動:**
   ```bash
   npm run dev
   ```

2. **API Example ページにアクセス:**
   ```
   http://localhost:3000/api-example
   ```

3. **以下の操作を実行:**
   - エンドポイント入力フィールドを何度も変更
   - サービス選択ドロップダウンを変更
   - APIリクエストボタンを複数回クリック

4. **確認事項:**
   - ブラウザのコンソールにエラーがないこと
   - ページがフリーズしないこと
   - メモリ使用量が異常に増加しないこと
   - ブラウザの開発者ツールで無限レンダリングが発生していないこと

## 結論

カーネルスタックオーバーフローの原因は、React Hooks の依存配列の不適切な管理によるものでした。

**主な原因:**
1. `useApi` フックの `useCallback` 依存配列に `requestFn` が欠落
2. コンポーネントでインライン関数を使用し、毎レンダリング時に新しい関数を作成

**修正内容:**
1. `useCallback` の依存配列に `requestFn` を追加
2. インライン関数を `useCallback` でメモ化

これらの修正により、無限再レンダリングループとスタックオーバーフローの問題が解決されます。

## 今後の予防策

1. ESLint の `react-hooks/exhaustive-deps` ルールを厳密に守る
2. Hooks の依存配列は常に完全に指定する
3. `// eslint-disable-next-line` コメントの使用を最小限にする
4. コードレビュー時に Hooks の使用方法を特に注意深く確認する
5. パフォーマンスモニタリングツールを導入し、異常な再レンダリングを検出する
