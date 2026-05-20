# Pokemon Damage Calculator API 契約差分メモ

## 概要

このドキュメントは、Issue #97 のポケモンダメージ計算フロントエンド統合に向けた設計骨子を整理するためのメモです。実装前段階のため、ここでは確定仕様ではなく、Phase 3 で詳細化するための観点と TODO をまとめます。

| 項目 | 設計骨子 |
|------|----------|
| feature entry | `/pokemon-damage-calculator` |
| Run workspace | `/pokemon-damage-calculator/runs/[runId]` |
| 利用 API | `pokemon-damage-calculator-api` |
| API 呼び出し方式 | `createFrontendApiClient` + `/api/services/{service}/{...path}` proxy |
| 認証伝搬 | `Authorization` と `X-Google-Access-Token` を維持 |
| 所有者判定 | `googleUserId` と `RunDto.OwnerUserId` の比較を採用予定 |
| ドキュメント状態 | Phase 2 の暫定骨子。Phase 3 で実装差分を反映して最終確定 |

## 背景

- バックエンド API 契約を前提に、既存の Next.js フロントエンドへポケモンダメージ計算機能を統合する
- 既存の認証・proxy 基盤を再利用し、feature 固有の例外実装を最小化する
- 実装完了後に API 契約との差分が追跡しやすいよう、先に論点を固定する

## 画面とルーティングの予定

| 画面 | 役割 | 備考 |
|------|------|------|
| `/pokemon-damage-calculator` | feature entry | RuleSet 一覧、Run 一覧の表示を想定 |
| `/pokemon-damage-calculator/runs/[runId]` | Run workspace | Run 詳細、Battle、Party State、ダメージ計算の作業画面を想定 |

## API 利用方針

### 1. proxy 利用

- フロントエンドからバックエンドへ直接接続せず、`/api/services/pokemon-damage-calculator-api/{...path}` を経由する予定
- 呼び出しクライアントは `createFrontendApiClient("pokemon-damage-calculator-api")` を採用する予定
- サービス追加は既存の `API_SERVICES` 方式で行い、feature 固有の client factory 分岐は増やさない

### 2. 匿名 GET allowlist

匿名参照を許可する GET エンドポイントがあるため、Issue #97 / backend PR #6 で確認済みの契約に合わせ、Step 2.4 時点では以下を骨子として維持します。

| 区分 | 想定する proxy パス | 用途 |
|------|----------------------|------|
| RuleSet 一覧 | `GET /api/services/pokemon-damage-calculator-api/api/rule-sets` | feature entry の初期表示 |
| Run 一覧 | `GET /api/services/pokemon-damage-calculator-api/api/runs` | feature entry の一覧表示 |
| Run 詳細 | `GET /api/services/pokemon-damage-calculator-api/api/runs/{runId}` | workspace 初期表示 |
| Battle 一覧 | `GET /api/services/pokemon-damage-calculator-api/api/runs/{runId}/battles` | workspace の参照データ取得 |
| Party State 参照 | `GET /api/services/pokemon-damage-calculator-api/api/runs/{runId}/party-state` | workspace の状態参照 |

認証必須操作は、Issue #97 / backend PR #6 の契約に合わせて以下を骨子として確定します。

| 区分 | 想定する proxy パス | 方針 |
|------|----------------------|------|
| Run 作成・更新・削除 | `POST /api/services/pokemon-damage-calculator-api/api/runs`、`PUT/DELETE /api/services/pokemon-damage-calculator-api/api/runs/{runId}` | 認証必須 |
| Battle 作成・更新・削除 | `POST /api/services/pokemon-damage-calculator-api/api/runs/{runId}/battles`、`PUT/DELETE /api/services/pokemon-damage-calculator-api/api/runs/{runId}/battles/{id}` | 認証必須 |
| Party State 進行イベント追加 | `POST /api/services/pokemon-damage-calculator-api/api/runs/{runId}/party-state` | 認証必須 |
| Damage Calculation 実行 | `POST /api/services/pokemon-damage-calculator-api/api/runs/{runId}/battles/{id}/calculate` | 認証必須 |

以下の観点は Phase 3 で最終確定します。

- allowlist 対象の GET パス一覧
- middleware と Route Handler の責務分担
- 匿名 GET と認証必須操作の境界
- 計算結果は `POST /api/runs/{runId}/battles/{id}/calculate` のレスポンスで扱い、専用 GET / CRUD は存在しない前提の UI 設計
- 実装差分を踏まえた最終パス名と DTO 対応

### 3. 認証ヘッダー伝搬

認証が必要な通信では、以下 2 ヘッダーを維持する予定です。

| ヘッダー | 目的 |
|----------|------|
| `Authorization` | bearer token としての一般的な認証伝搬 |
| `X-Google-Access-Token` | Google 連携前提のバックエンド処理向け |

## DTO / 所有者判定の論点

### `RunDto.OwnerUserId`

- フロントエンドでは `RunDto.OwnerUserId` を保持し、編集可否の判定に利用する予定
- 比較対象として、NextAuth の session / JWT に `googleUserId` を保持する予定
- 所有者でない Run は read-only 表示を基本方針とする予定

### Phase 3 で詳細化する項目

- DTO 変換ルール
- nullable / enum / 日時文字列の扱い
- not-found / validation error / unauthorized の UI 表現

## 実装追従用 TODO

Phase 3 では、少なくとも以下を更新します。

- 実際に利用した API エンドポイント一覧
- 匿名 GET allowlist の確定内容
- session / JWT 拡張内容（`googleUserId`）
- Run 所有者判定と read-only 制御の詳細
- 画面構成と状態管理の確定事項
- Step 2.4 で補正した GET / 認証必須操作一覧の実装結果との差分反映

## 関連ドキュメント

- [../README.md](../README.md)
- [./API_ROUTING.md](./API_ROUTING.md)
- [./ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
