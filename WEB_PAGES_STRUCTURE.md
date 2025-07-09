# Pokenae Web - Web アプリケーション

## 概要

このプロジェクトは `pokenae.WebComponent` ライブラリを使用したコレクション管理 Web アプリケーションです。

## 役割分担

- **pokenae.Web**: 実際の Web アプリケーション（このプロジェクト）
- **pokenae.WebComponent**: UI コンポーネントライブラリ

## ページ構成

### 1. トップページ (`/`)

- **ファイル**: `src/app/page.js`
- **説明**: アプリケーションのホームページ
- **機能**:
  - アプリケーションの概要表示
  - 各機能へのナビゲーション
  - WebComponent ライブラリのデモ機能

### 2. コレクション支援ツール (`/CollectionAssistanceTool`)

- **ファイル**: `src/app/CollectionAssistanceTool/page.js`
- **説明**: コレクション管理のメインページ
- **機能**:
  - 利用可能なコレクションテーブルの一覧表示
  - 各テーブルの管理画面への遷移

### 3. コレクション詳細管理 (`/CollectionAssistanceTool/[tableId]`)

- **ファイル**: `src/app/CollectionAssistanceTool/[tableId]/page.js`
- **説明**: 特定のコレクションテーブルの詳細管理
- **機能**:
  - アイテムの一覧表示（動的データ生成）
  - アイテムの追加・編集・削除
  - フィルタリング・検索機能
  - データエクスポート機能

### 4. 統計情報 (`/stats`)

- **ファイル**: `src/app/stats/page.js`
- **説明**: コレクションの統計情報表示
- **機能**:
  - 総コレクション数、アイテム数の表示
  - 完成度の表示
  - 最近のアクティビティ表示

### 5. サブページ（テスト用） (`/subpage`)

- **ファイル**: `src/app/subpage/page.js`
- **説明**: WebComponent ライブラリのテスト用ページ
- **機能**:
  - 各種メッセージダイアログのテスト
  - UI コンポーネントの動作確認

### 6. コールバックページ (`/callback`)

- **ファイル**: `src/app/callback/page.js`
- **説明**: 認証処理のコールバックページ
- **機能**:
  - 認証情報の処理
  - リダイレクト処理

## ディレクトリ構造

```
src/
├── app/                           # App Router ページ
│   ├── layout.js                  # ルートレイアウト
│   ├── page.js                    # トップページ
│   ├── page.module.css            # トップページスタイル
│   ├── globals.css                # グローバルスタイル
│   ├── CollectionAssistanceTool/  # コレクション管理
│   │   ├── page.js                # コレクション一覧
│   │   ├── CollectionAssistanceTool.module.css
│   │   └── [tableId]/             # 動的ルート（未実装）
│   └── subpage/                   # テスト用ページ
│       ├── page.js
│       └── subpage.module.css
├── components/                    # ページ固有コンポーネント（未使用）
└── pages/                         # Pages Router（非推奨）
```

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **UI ライブラリ**: React 19
- **コンポーネントライブラリ**: pokenae.WebComponent
- **スタイリング**: CSS Modules
- **状態管理**: React Context API (WebComponent ライブラリから提供)
- **API 通信**: Fetch API + カスタム API クライアント

## API 統合

### API 仕様

- **ベース URL**: `https://localhost:7077` (開発環境) / 環境変数で設定可能
- **主要エンドポイント**:
  - `GET /api/CollectionTable` - コレクションテーブル一覧取得
  - `GET /api/CollectionTable/{tableId}` - コレクションテーブル詳細取得
  - `POST /api/CollectionTable` - コレクションテーブル新規作成
  - `PUT /api/CollectionTable/{tableId}` - コレクションテーブル更新
  - `DELETE /api/CollectionTable/{tableId}` - コレクションテーブル削除
  - `GET /api/Record/table/{tableId}` - 特定テーブルのレコード一覧取得
  - `POST /api/Record/table/{tableId}` - レコード新規作成
  - `PUT /api/Record/{recordId}` - レコード更新
  - `DELETE /api/Record/{recordId}` - レコード削除
  - `GET /api/Column?sheetId={sheetId}` - カラム情報取得（下位互換性のため残存）

### 環境設定

API のベース URL は環境変数で設定可能です：

```bash
# .env.local に設定
NEXT_PUBLIC_API_BASE_URL=https://localhost:7077

# プロダクション環境の例
# NEXT_PUBLIC_API_BASE_URL=https://your-production-api.com
```

### エラーハンドリング

- API エラー時は自動的にデモデータにフォールバック
- ユーザーフレンドリーなエラーメッセージを表示
- ネットワークエラー、認証エラー、サーバーエラーを適切に処理

#### API エラー対応機能

1. **自動フォールバック機能**:

   - API に接続できない場合、自動的にデモデータを使用
   - ユーザーには「デモモード」として明確に表示
   - アプリケーションが完全に動作停止することを防止

2. **詳細なエラーロギング**:

   - CORS エラー、SSL 証明書エラー、ネットワークエラーの詳細ログ
   - 開発者コンソールでの詳細情報表示
   - エラーパターンの自動判定と適切なメッセージ表示

3. **開発用診断ツール**:
   - `/api-test` ページで API の詳細診断が可能
   - 各エンドポイントの個別テスト機能
   - エラー原因の特定とデバッグ情報の提供

#### エラー対応ファイル

- **API クライアント**: `src/utils/collectionApi.js` - 詳細なエラーハンドリング
- **フォールバック機能**: `src/utils/demoData.js` - デモデータとフォールバック処理
- **診断ツール**: `src/app/api-test/page.js` - 開発用 API 診断ページ
- **エラー対応ガイド**: `API_ERROR_GUIDE.md` - 詳細なトラブルシューティング手順

### データフロー

1. **コレクション一覧**: API からコレクション一覧を取得、エラー時はデモデータ表示
2. **コレクション詳細**: `tableId`を使用して API から詳細データとカラム情報を取得
3. **データ更新**: テーブル編集時はローカル状態を更新、将来的に API で永続化
4. **エクスポート**: CSV エクスポート機能を提供

## 開発・運用

### 前提条件

1. pokenae.WebComponent ライブラリが利用可能であること
2. Node.js がインストールされていること
3. CollectionAssistanceTool API サーバーが `https://localhost:7077` で動作していること

### セットアップ

1. **環境変数の設定**:

   ```bash
   # .env.example をコピー
   cp .env.example .env.local

   # .env.local を編集して API の URL を設定
   NEXT_PUBLIC_API_BASE_URL=https://localhost:7077
   ```

2. **依存関係のインストール**:

   ```bash
   npm install
   ```

3. **WebComponent ライブラリの更新**:
   ```bash
   npm run update-components
   ```

### 開発サーバーの起動

```bash
npm run dev
```

デフォルトでポート 3001 で起動します。

### API サーバーとの連携

- API サーバーが `https://localhost:7077` で動作している必要があります
- API エラー時は自動的にデモデータにフォールバックします
- `.env.local` ファイルで API の URL を変更可能です

### ビルド

```bash
npm run build
```

### 本番環境での起動

```bash
npm start
```

ポート 80 で起動し、プロセス ID を.pidfile に保存します。

### サーバーの停止

```bash
npm run stop
```

## WebComponent ライブラリの使用例

```javascript
import {
  Layout,
  CustomButton,
  CustomTable,
  AppProvider,
  useAppContext,
} from "../../pokenae.WebComponent/src/components";

function MyPage() {
  const { showInfo } = useAppContext();

  return (
    <Layout>
      <CustomButton onClick={() => showInfo("メッセージ")} label="クリック" />
    </Layout>
  );
}
```

## 新しいページの追加方法

1. `src/app/` 以下に新しいディレクトリを作成
2. `page.js` ファイルを作成
3. WebComponent ライブラリから必要なコンポーネントをインポート
4. 必要に応じて CSS Modules ファイルを作成
5. 他のページからのリンクを追加

## 注意事項

- App Router を使用しているため、全てのページコンポーネントで 'use client' ディレクティブが必要
- WebComponent ライブラリのコンポーネントは Context API を使用するため、AppProvider で囲む必要があります
- Layout コンポーネントの使用を推奨します

### API エラーの診断手順

1. **基本的な確認**:

   ```bash
   # APIサーバーの起動確認
   netstat -an | findstr 7077
   ```

2. **診断ツールの使用**:

   - ブラウザで `http://localhost:3000/api-test` にアクセス
   - 「API テスト実行」ボタンをクリックして詳細診断
   - エラー内容とレスポンスデータを確認

3. **環境設定の確認**:

   ```bash
   # .env.local の内容確認
   cat .env.local

   # Next.jsアプリケーションの再起動
   npm run dev
   ```

4. **よくある問題と解決方法**:
   - **CORS エラー**: API サーバー側の CORS 設定を確認
   - **SSL 証明書エラー**: HTTP での接続に変更（`NEXT_PUBLIC_API_BASE_URL=http://localhost:7077`）
   - **接続エラー**: API サーバーの起動状況を確認

詳細な診断手順とトラブルシューティングについては `API_ERROR_GUIDE.md` を参照してください。

### tableId について

- **形式**: UUID (Globally Unique Identifier)
- **例**: `f1dbf3a5-3b86-4939-99e8-d564a11b4326`
- **用途**: コレクションテーブルとレコードの一意識別子として使用
- **注意**: 以前のシンプルな ID（1, 2, 3...）とは異なり、UUID を使用
