# Pokemon Damage Calculator API 契約差分メモ

## 概要

このドキュメントは、Issue #97 のポケモンダメージ計算フロントエンド統合について、実装結果と API 契約の対応を整理するためのメモです。feature route、proxy 経由の API 利用、匿名 GET allowlist、所有権ベースの read-only 制御をまとめます。

| 項目 | 実装内容 |
|------|----------|
| feature entry | `/pokemon-damage-calculator` |
| Run workspace | `/pokemon-damage-calculator/runs/[runId]` |
| 利用 API | `pokemon-damage-calculator-api` |
| API 呼び出し方式 | `createFrontendApiClient` + `/api/services/{service}/{...path}` proxy |
| 認証伝搬 | `Authorization` と `X-Google-Access-Token` を維持 |
| 所有者判定 | `googleUserId` と `RunDto.OwnerUserId` の比較で read-only 制御 |
| ドキュメント状態 | Phase 3 の実装反映済み |

## 背景

- バックエンド API 契約を前提に、既存の Next.js フロントエンドへポケモンダメージ計算機能を統合した
- 既存の認証・proxy 基盤を再利用し、feature 固有の例外実装を最小化した
- 実装完了後の契約差分確認と運用引き継ぎをしやすくするため、確定事項を文書化する

## 画面とルーティング

| 画面 | 役割 | 備考 |
|------|------|------|
| `/pokemon-damage-calculator` | feature entry | RuleSet 一覧、Run 一覧、Run 作成 |
| `/pokemon-damage-calculator/runs/[runId]` | Run workspace | Run 詳細、Battle 管理、Party State、ダメージ計算 |

## API 利用方針

### 1. proxy 利用

- フロントエンドからバックエンドへ直接接続せず、`/api/services/pokemon-damage-calculator-api/{...path}` を経由する
- 呼び出しクライアントは `createFrontendApiClient("pokemon-damage-calculator-api")` を採用した
- サービス追加は既存の `API_SERVICES` 方式で行い、feature 固有の client factory 分岐は増やしていない

### 2. 匿名 GET allowlist

匿名参照を許可する GET エンドポイントがあるため、以下の GET のみ allowlist で匿名通過させています。

| 区分 | 想定する proxy パス | 用途 |
|------|----------------------|------|
| RuleSet 一覧 | `GET /api/services/pokemon-damage-calculator-api/api/rule-sets` | feature entry の初期表示 |
| Run 一覧 | `GET /api/services/pokemon-damage-calculator-api/api/runs` | feature entry の一覧表示 |
| Run 詳細 | `GET /api/services/pokemon-damage-calculator-api/api/runs/{runId}` | workspace 初期表示 |
| Battle 一覧 | `GET /api/services/pokemon-damage-calculator-api/api/runs/{runId}/battles` | workspace の参照データ取得 |
| Party State 参照 | `GET /api/services/pokemon-damage-calculator-api/api/runs/{runId}/party-state` | workspace の状態参照 |

認証必須操作は以下のとおりです。

| 区分 | 想定する proxy パス | 方針 |
|------|----------------------|------|
| Run 作成・更新・削除 | `POST /api/services/pokemon-damage-calculator-api/api/runs`、`PUT/DELETE /api/services/pokemon-damage-calculator-api/api/runs/{runId}` | 認証必須 |
| Battle 作成・更新・削除 | `POST /api/services/pokemon-damage-calculator-api/api/runs/{runId}/battles`、`PUT/DELETE /api/services/pokemon-damage-calculator-api/api/runs/{runId}/battles/{id}` | 認証必須 |
| Party State 進行イベント追加 | `POST /api/services/pokemon-damage-calculator-api/api/runs/{runId}/party-state` | 認証必須 |
| Damage Calculation 実行 | `POST /api/services/pokemon-damage-calculator-api/api/runs/{runId}/battles/{id}/calculate` | 認証必須 |

補足:

- allowlist 判定は `lib/pokemon-damage-calculator/proxy-policy.ts` に実装し、`proxy.ts` と Route Handler の双方で利用する
- allowlist 対象外は GET でも認証必須とする
- 計算結果は `POST /api/runs/{runId}/battles/{id}/calculate` のレスポンスで扱い、専用 GET / CRUD は持たない

### 3. 認証ヘッダー伝搬

認証が必要な通信では、以下 2 ヘッダーを維持します。

| ヘッダー | 目的 |
|----------|------|
| `Authorization` | bearer token としての一般的な認証伝搬 |
| `X-Google-Access-Token` | Google 連携前提のバックエンド処理向け |

## DTO / 所有者判定の論点

### `RunDto.OwnerUserId`

- フロントエンドでは `RunDto.OwnerUserId` を保持し、編集可否の判定に利用する
- 比較対象として、NextAuth の session / JWT に `googleUserId` を保持する
- `googleUserId` は Google profile の `sub` を優先し、未取得時は token の `sub` を利用する
- 所有者でない Run は read-only 表示とし、guest はログイン導線、viewer は閲覧専用メッセージを表示する

## 実装済み API 利用一覧

| 区分 | 実装したフロントエンド呼び出し |
|------|-------------------------------|
| RuleSet 一覧 | `GET /api/rule-sets` |
| Run 一覧 | `GET /api/runs` |
| Run 詳細 | `GET /api/runs/{runId}` |
| Run 作成 | `POST /api/runs` |
| Run 更新 | `PUT /api/runs/{runId}` |
| Run 削除 | `DELETE /api/runs/{runId}` |
| Battle 一覧 | `GET /api/runs/{runId}/battles` |
| Battle 作成 | `POST /api/runs/{runId}/battles` |
| Battle 更新 | `PUT /api/runs/{runId}/battles/{id}` |
| Battle 削除 | `DELETE /api/runs/{runId}/battles/{id}` |
| Party State 参照 | `GET /api/runs/{runId}/party-state` |
| Party State 進行イベント追加 | `POST /api/runs/{runId}/party-state` |
| Damage Calculation 実行 | `POST /api/runs/{runId}/battles/{id}/calculate` |

## UI / 状態管理の確定事項

- entry page では RuleSet / Run 一覧を同時取得し、未ログインでも閲覧可能
- Run 作成は認証必須で、未ログイン時は Google sign-in に遷移する
- workspace では Run / Battle / Party State を再取得し、更新後に一覧とフォーム状態を同期する
- Party State は append-only とし、既存スナップショットは表示のみ提供する
- ダメージ計算結果は最新 1 件を画面内に保持し、Damage Rolls と送信パラメータを表示する

## 関連ドキュメント

- [../README.md](../README.md)
- [./API_ROUTING.md](./API_ROUTING.md)
- [./ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
