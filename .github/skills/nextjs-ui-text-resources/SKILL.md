---
name: nextjs-ui-text-resources
description: "Manage UI labels, button text, dialog titles, table headers, validation messages, and page copy in Next.js with App Router best practices. Use when centralizing screen text resources, removing hardcoded UI strings, preparing for localization, separating page-level text from component-level text, or passing typed texts from Server Components to Client Components. Covers both whole pages and reusable components."
argument-hint: "対象画面や component、現在の文言配置、直したい問題、locale 方針があれば入力してください。"
user-invocable: true
---

# Next.js UI Text Resources

## What This Skill Produces

このスキルは、Next.js App Router 前提で画面文言と component 文言の責務を分離し、将来の多言語対応に耐えるリソース管理へ整理する。

出力には少なくとも以下を含める。

- 文言の棚卸し結果
- 文言の責務分類
- page と component それぞれの管理方針
- 実装順序
- 検証手順と完了条件

## When to Use

- 画面に表示する名称、説明、ボタン文言、ダイアログタイトル、テーブル見出し、確認文言が直書きされているとき
- Next.js で i18n や locale 追加を見据えて UI 文言の構造を整理したいとき
- App Router の page や layout で辞書を解決し、Client Component に型付き props で渡したいとき
- atoms、molecules、organisms、page のどこに文言を置くべきか曖昧なとき
- feature 固有文言を reusable component から切り離したいとき
- Loading、保存、削除確認、空状態、エラー表示などの文言管理を統一したいとき

## Core Outcome

最終的な目標は、文言の直書きを単に減らすことではない。次の責務分離を実現すること。

1. page や layout などの Server Component が locale と feature 文脈を解決する。
2. Client Component は描画と操作に専念し、feature 固有文言を直接 import しない。
3. atoms と molecules は原則文言非依存に保ち、必要なら props で受け取る。
4. 共通 UI 文言、feature 文言、API/validation 文言、ドメインメタデータを混在させない。

## Resource Layers

### 1. Common UI Resources

対象:

- 閉じる
- 読み込み中
- 一般的な空状態
- 汎用検索 UI のラベル

置き場所:

- 共通 resources モジュール

ルール:

- atoms と molecules が保持してよいのは、feature に依存しない共通 UI 文言だけ
- feature 固有の保存、採用、定義編集、公開、下書きなどはここに置かない

### 2. Feature or Page Resources

対象:

- 画面タイトル
- セクション説明
- feature 固有ボタン文言
- ダイアログタイトル
- 確認メッセージ
- DataTable の列見出し
- 状態表示ラベル

置き場所:

- feature 専用の resources ファイル
- locale ごとに束ねられる構造

ルール:

- page または layout で辞書を解決し、Client Component に typed props で渡す
- Client Component から feature 辞書を直接 import しない

### 3. Validation and API Message Resources

対象:

- 入力不備
- 重複エラー
- 保存失敗
- 削除失敗
- 権限エラー

置き場所:

- 共通 API エラー resources
- feature 専用 validation resources

ルール:

- HTTP 系メッセージと feature 専用 validation 文言を分ける
- local validation も最終的に resources から供給できる形に揃える

### 4. Domain Metadata

対象:

- ResourceDefinition の label
- shortLabel
- 固定ドメイン名

ルール:

- ドメイン定義そのものと、UI 文脈で変化する説明文を分ける
- locale で変えるべき UI copy をドメイン定義に閉じ込めない

## Decision Rules

### Page Whole or Component Only

- 画面全体の見出し、説明、セクション構造に関わるなら page or layout で解決する
- reusable component 単体の見た目だけに関わるなら props 経由で渡す

### Can a Client Component Import Text Directly?

- 共通 UI resources だけなら限定的に許容できる
- feature 固有文言は不可。必ず親の Server Component から渡す

### Should a Component Own Text?

- atoms と molecules: 基本は持たない
- organisms: feature 文言を受け取る
- page and layout: locale と feature 文脈を解決する

### Should You Introduce an i18n Library Immediately?

- 必須ではない
- まずは locale 切り替え可能な辞書ロード層を用意する
- 将来 next-intl などに差し替えやすい構造を優先する

## Procedure

### Step 1. Reframe the Goal

依頼を次の形に言い換える。

- 直書き文言の削減が目的か
- 多言語対応の準備が目的か
- page と component の責務整理が目的か
- 特定 feature のみか、複数画面にまたがるか

目的が曖昧なら、以下を確認する。

- 対象範囲はどこか
- locale は ja 固定か将来拡張前提か
- 今回は計画だけか、実装まで含むか

### Step 2. Inventory Existing Text

まずハードコード文言を棚卸しする。

見る対象:

- page.tsx
- layout.tsx
- organisms
- atoms と molecules の default labels
- window.confirm
- DataTable columns
- placeholders
- loading labels
- success and error messages

確認観点:

- どの文言が feature 固有か
- どの文言が共通 UI か
- どの文言が API や validation か
- どの文言が domain metadata か

### Step 3. Classify Every Text by Layer

文言を次のどれかに必ず分類する。

1. Common UI
2. Feature or page-specific
3. Validation or API messaging
4. Domain metadata

分類できない文言は、その component の責務が曖昧な可能性が高い。先に責務を見直す。

### Step 4. Design the Resource Shape

feature ごとに typed texts を定義する。

最低限含める候補:

- hero
- sections
- buttons
- columns
- dialogs
- messages
- placeholders
- statuses
- options

型設計ルール:

- render 側で必要なまとまり単位でネストする
- ランダムな flat key 羅列にしない
- format 用テンプレートは `{count}` や `{label}` のように明示する

### Step 5. Resolve Text on the Server Boundary

App Router の page または layout で locale を決め、resource loader を呼ぶ。

推奨:

- `app/<feature>/page.tsx` で feature texts を取得する
- 認証や feature 全体の共通文言がある場合は `layout.tsx` も候補にする

避けること:

- 不要に `use client` を広げること
- Client Component で locale 判定すること

### Step 6. Push Feature Text into Client Components

organism や大型 Client Component には `texts` や `labels` を props で渡す。

ルール:

- section title や dialog title は props で受け取る
- action buttons も props で受け取る
- table columns は `texts` から builder で生成する
- status text や confirm messages も `texts` に寄せる

### Step 7. Keep Shared Components Text-Light

atoms と molecules を見直す。

判断基準:

- 共通 UI として成立する default 文言なら共通 resources に置く
- feature 依存なら props 化する

代表例:

- CustomButton の loading label
- Dialog の close text
- SearchField の placeholder

### Step 8. Handle Edge Cases Explicitly

次の文言は漏れやすいので別途確認する。

- `window.confirm`
- success and error messages
- local validation messages
- empty states
- badge or status suffixes
- placeholders
- override or detail title templates
- row actions in tables

### Step 9. Verify

最低限、以下を確認する。

1. page or layout で辞書をロードしている
2. Client Component が feature 辞書を直接 import していない
3. 主要文言の直書きが残っていない
4. typed props に不足がない
5. lint と型チェックが通る
6. Docker Compose 環境で画面を開いて配線漏れがない

## Completion Checks

次を満たしたら完了。

- page 全体文言は Server Component 側で解決されている
- feature 固有文言は Client Component へ typed props で注入されている
- atoms と molecules は feature 固有文言を保持していない
- 共通 UI 文言と feature 文言が分離されている
- API/validation 文言と UI copy が分離されている
- grep で残存直書き文言を棚卸し済み
- Docker ベースの確認手順まで定義されている

## Output Format

このスキルを使うときは、次の順で結果を返す。

1. 対象範囲の要約
2. 文言の分類結果
3. 採用する resource structure
4. page 側の変更方針
5. component 側の変更方針
6. 実装順序
7. 検証結果または検証計画
8. 未解決事項

## Anti-patterns

- Client Component が feature resources を直接 import する
- atoms が feature 固有ボタン名を内包する
- DataTable 列名や confirm 文言だけ直書きのまま残る
- domain metadata と画面説明文を同じ場所に置く
- locale を client state で決める
- feature ごとに異なる構造の辞書を乱立させる

## Suggested Follow-ups

このスキルの次に作る候補:

- feature 辞書の型整合と未使用キー検出を行う skill
- Next.js App Router で locale を解決する loader 設計 skill
- reusable component から feature 依存を剥がす review skill
