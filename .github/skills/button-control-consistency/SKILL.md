---
name: button-control-consistency
description: "Standardize hidden vs disabled button control in web UIs. Use when defining button availability rules, reviewing inconsistent action states, aligning dialogs and tables, deciding whether actions should be hidden or disabled, or applying Google Material-inspired button control policy to React and Next.js screens."
argument-hint: "対象画面、迷っている操作、hidden と disabled の揺れ、ダイアログや一覧の制約があれば入力してください。"
user-invocable: true
---

# Button Control Consistency

## What This Skill Produces

このスキルは、Web UI におけるボタンやアクションの利用可否を、hidden と disabled のどちらで表現すべきかを整理し、画面全体で一貫した制御方針に落とし込む。

出力には少なくとも次を含める。

- 対象画面と対象操作の整理
- 各操作を hidden / disabled / enabled のどれにすべきかの分類
- 判断根拠
- 実装時の分岐ルール
- ダイアログ、一覧、処理中状態の扱い
- 検証観点

## When to Use

- hidden と disabled が画面ごとに混在していて統一したいとき
- 一覧画面、テーブル、選択操作、ダイアログの action 制御を設計するとき
- 選択件数、入力不足、権限、画面モード、処理中状態に応じたボタン制御を整理したいとき
- Google Material 系の考え方を参考に、押せない理由が伝わる UI にしたいとき
- 実装前に policy を決めたいとき
- 実装後に UI の一貫性レビューをしたいとき

## Core Policy

基本ルールは次の 2 つ。

1. hidden は、その操作が今の文脈では存在しない場合に使う
2. disabled は、同じ文脈のまま条件が満たされれば実行可能になる場合に使う

このルールを崩さないために、操作不能の理由を次の 4 分類で考える。

- 文脈不在: その画面モードや権限では提供しない
- 前提不足: 選択件数や入力条件が未達
- 一時停止: 保存中、送信中、再計算中
- 構造制約: 先頭行の上移動不可、最終行の下移動不可など

## Decision Rules

### Rule 1. 文脈不在は hidden

以下は hidden を選ぶ。

- view / edit のような画面モード差で、そもそも提供する操作集合が変わる
- 権限差で操作を見せるべきでない
- 削除済みや対象外状態で、その操作自体が意味を持たない
- 画面目的が切り替わるため、操作を出すと誤解を招く

### Rule 2. 条件未達は disabled

以下は disabled を選ぶ。

- 行や項目の未選択
- 必須入力の未完了
- 複数選択数不足
- 並び替え可能件数不足
- 送信条件を満たしていない

### Rule 3. 処理中は dismissive action の意味を確認する

処理中のキャンセルや閉じるは、まずダイアログのライフサイクルを確認する。

- 閉じても文脈が壊れず、処理継続をユーザーが理解できるなら閉じてもよい
- 閉じるとコンポーネントが unmount されて、ユーザー期待と保存結果がずれるなら close を禁止する

close を禁止する場合は次をそろえる。

- footer のキャンセルを disabled にする
- close button を隠すか無効化する
- Esc や dialog close も抑止する
- 「保存中はダイアログを閉じられません」のような理由表示を出す

### Rule 4. disabled には理由を近接表示する

disabled のみでは理由が伝わらない場合は、補助文を近くに置く。

例:

- 1 件以上選択してください
- 表示順は 1 以上の整数で入力してください
- 保存中はダイアログを閉じられません

### Rule 5. enabled 条件と submit 条件を一致させる

ボタンが有効でもクリック後に即エラーになる状態を避ける。

特に確認する。

- disabled 条件が実際の validation 条件と一致しているか
- 選択候補が stale になっていないか
- 送信先や対象一覧が現在の state と一致しているか

## Procedure

### Step 1. 対象画面と対象操作を列挙する

まず画面内の操作を洗い出す。

- ツールバー action
- テーブル行 action
- 一括操作 action
- ダイアログの confirm / dismissive action
- reorder 系 action

操作を洗い出すときは、見えているものだけでなく、条件分岐で消えるものも確認する。

### Step 2. 各操作の unavailable 理由を分類する

各操作について、今押せない理由を 1 つ選ぶ。

- 文脈不在
- 前提不足
- 一時停止
- 構造制約

ここで複数理由が混ざる場合は、最も上位の理由を採用する。
文脈不在があるなら hidden を優先し、それ以外は disabled を検討する。

### Step 3. hidden / disabled / enabled を決める

分類に基づいて決める。

- 文脈不在なら hidden
- 前提不足なら disabled
- 一時停止なら disabled か closeDisabled
- 構造制約なら disabled

### Step 4. ダイアログは close 経路まで確認する

dialog footer のボタンだけを見ない。

- × button
- Esc
- backdrop click
- onClose の呼び出し経路
- 親側で unmount されるか

close 禁止が必要なら、UI と内部実装の両方で閉じられないようにする。

### Step 5. disabled 理由の表現を追加する

次のどれかで理由を出す。

- 補助テキスト
- エラー文
- 選択件数表示
- aria-invalid や role=status を用いた補助状態

### Step 6. 実装を統一する

実装時は画面内でルールをそろえる。

- 同じ理由なら同じ制御方法を使う
- 同じ画面内で hidden と disabled を無秩序に混在させない
- confirm action の disabled 条件を pure に切り出せるなら切り出す
- 状態変数名も意味が分かる形にそろえる

### Step 7. レビューする

レビューでは次を確認する。

1. enabled 条件と実行条件が一致しているか
2. close 経路に漏れがないか
3. hidden と disabled の使い分けが同一画面で一貫しているか
4. assistive technology に理由が伝わるか
5. 処理中に二重送信できないか

## Special Cases

### Tables and Bulk Actions

- 行未選択や件数不足は disabled
- 権限不足や mode 不一致は hidden
- 選択件数は近くに表示する

### Reorder Actions

- 順序変更モード自体は、対象件数不足なら disabled
- 行の上下移動は、先頭 / 末尾で disabled
- 保存中は save と cancel を含めて整合を確認する

### Form Dialogs

- 必須入力未完了は confirm を disabled
- validation 条件が明確ならクリック後エラーではなく事前 disabled を優先
- ただし field 単位の詳細エラーは inline 表示も併用する

### Async Operations

- confirm は isPending 中 disabled
- dismissive action は、閉じても意味が崩れないときのみ許可
- close を禁止したら理由表示も追加する

## Quality Checks

完了条件は次のとおり。

- 対象操作ごとに unavailable 理由を説明できる
- hidden と disabled の選択理由が明確
- dialog の close 経路まで実装が揃っている
- disabled 理由が UI 上で把握できる
- 二重送信や stale state 送信の余地がない
- lint と型チェックが通る
- 必要なら Docker ベースで画面確認ができる

## Output Format

このスキルを使うときは、結果を次の順で返す。

1. 対象画面と操作一覧
2. hidden / disabled の判断表
3. 実装ルール
4. ダイアログと処理中状態の注意点
5. 検証観点

## Anti-patterns

- 同じ理由なのに画面ごとに hidden と disabled が揺れる
- footer のキャンセルだけ disabled にして、× や Esc が生きている
- disabled なのに理由が出ていない
- enabled 条件と submit 条件が一致していない
- stale な選択値で confirm できる
- mode 差と前提不足を同じルールで扱ってしまう

## Suggested Follow-ups

次に作る候補。

- dialog-close-safety: dialog の close 経路と pending 制御を点検する skill
- ui-state-audit: loading / empty / error / disabled 状態を棚卸しする skill
- nextjs-ui-text-resources: disabled 理由や補助文を typed texts へ整理する skill
