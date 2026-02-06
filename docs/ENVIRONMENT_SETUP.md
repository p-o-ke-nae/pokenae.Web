# 環境モードの設定と区別方法

このドキュメントでは、pokenae.Web プロジェクトの3つの環境モード（debug, development, production）について説明します。

## 環境モードの種類

### 1. **DEBUG モード**（ローカル開発）

- **実行コマンド**: `npm run dev`
- **用途**: ローカルマシンでの開発時
- **特徴**:
  - Next.js 開発サーバーが起動（ポート 5000）
  - ホットリロード機能が有効
  - 詳細なエラーメッセージが表示
  - ナビゲーションバーに赤色の「DEBUG」バッジが表示

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

# 開発環境用：.env.development
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_API_BASE_URL=https://api-dev.example.com

# 本番環境用：.env.production
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

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
