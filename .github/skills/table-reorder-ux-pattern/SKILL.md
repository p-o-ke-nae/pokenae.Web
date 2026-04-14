---
name: table-reorder-ux-pattern
description: "Implement or unify list/table reorder UX when a screen has display order, row ordering, drag and drop, move up/down controls, or explicit order saving. Use when adding並び替え, displayOrder, row reorder, drag/drop, multi-select reorder, sort/filter suppression, hierarchy-aware reorder, or when reviewing inconsistent一覧表の並び替えユースケース. If no role model is specified, use the default reorder interaction pattern as the baseline and describe it as a behavior contract rather than a workspace-specific implementation."
argument-hint: "対象一覧、既存実装、階層有無、保存方法、既知の制約があれば入力してください。特に指定がなければ既定の並び替えインタラクションパターンを基準として進めます。"
user-invocable: true
---

# Table Reorder UX Pattern

## What This Skill Produces

このスキルは、一覧表の並び替えユースケースを共通ロールモデルに合わせて統一するための分析、実装、レビュー手順を提供する。

出力または実装には少なくとも以下を含める。

- 対象一覧とロールモデルの差分整理
- 並び替え UX の共通契約
- 平坦一覧と階層一覧の実装方針
- 保存、抑止、レビュー、検証の完了条件
- 必要な helper や reorder ロジックに対する unit test 方針

## When to Use

- 一覧表に displayOrder や表示順編集を追加するとき
- 複数の一覧で並び替え UX がばらついており統一したいとき
- drag and drop、上下移動、複数選択、明示保存の扱いを揃えたいとき
- sort や filter が有効な状態で reorder をどう抑止すべきか決めたいとき
- 親子展開や階層一覧でも平坦一覧と同じ原則で並び替えを導入したいとき
- 実装後に既定の並び替えインタラクションパターン相当の完成度でレビューしたいとき

## Default Assumptions

- 特に指定がなければ、既定の並び替えインタラクションパターンをロールモデルとして使う
- 目的はドメイン固有の見た目を複製することではなく、並び替えユースケースの振る舞いを統一すること
- 実装ではゲームや業務固有の文言をそのまま持ち込まず、一覧、行、親一覧、子一覧、保存、抑止理由のような一般化した表現で考える
- 並び替えは編集モードや明示的な編集可能状態でのみ有効にする
- 並び替え結果は自動保存せず、明示保存を基本にする
- sort や filter が有効な間は reorder を無効化し、理由を画面に表示する
- sort/filter を消すためだけの key remount は避け、状態を保持したまま reorder だけを抑止する
- scope selector による対象切替は、同一一覧の一時的フィルタとは区別して扱う

## Abstract Role Model: Default Reorder Interaction Pattern

このスキルでいう既定の並び替えインタラクションパターンとは、特定のリポジトリやファイル実装を指すものではなく、次の振る舞い契約を持つ一覧のことを指す。

- 編集可能状態に入ったときだけ reorder を有効化する
- 単一移動と複数選択移動を同じ規則で扱う
- Shift 範囲選択をサポートする
- ボタン移動と drag and drop が同じ結果になる
- 保存は明示操作で行い、未保存変更を dirty として扱う
- sort または filter 中は reorder を抑止し、理由を表示する
- 保存後は再同期してサーバーまたは永続化先の正を反映する

他のワークスペースで使う場合も、この抽象契約に合っていれば同じロールモデルとして扱ってよい。

## Core UX Contract

一覧表の並び替え UX は、特に別指示がない限り次の契約に揃える。

1. 編集可能時のみ並び替えできる
2. 単一行移動と複数選択移動の両方を扱える
3. Shift 範囲選択を含む複数選択をサポートする
4. ボタン移動と drag and drop が同じルールで動く
5. 保存は明示操作で行い、dirty 状態を持つ
6. sort または filter 中は reorder を抑止し、理由を表示する
7. 境界行では不正な移動操作を無効化する
8. 保存後は再読込してサーバーの正を反映する

## Decision Rules

### 1. ロールモデルの扱い

- ユーザーが別ロールモデルを指定しない限り既定の並び替えインタラクションパターンを基準にする
- ロールモデルの文言やレイアウトではなく、状態管理、抑止条件、保存フロー、選択ルールを抽出して適用する

### 2. Flat List か Hierarchical List か

- 平坦一覧なら 1 つの rowOrder、selectedKeys、dirty、saving、sortState、filteredCount を持つ
- 階層一覧なら親一覧と子一覧を分離し、親ごとに reorder state を独立管理する
- 真のツリー構造と展開行ベースの擬似階層は分けて考える。展開行なら親行 drag を許可できる余地がある

### 3. Scope 切替か Filter か

- 対象コンテキストの切替は reorder 対象スコープの再定義として扱う
- 同じ一覧の部分表示を変える filter は reorder 抑止要因として扱う
- スコープ切替時は selectedKeys、dirty、local order を必要に応じて初期化する

### 4. Dirty 判定

- dirty は実際に順序が変わったときだけ true にする
- 先頭行の上移動や末尾行の下移動など no-op では dirty を立てない
- 保存 payload は差分のみ送る

### 5. 選択ルール

- 選択行のいずれかで move 操作した場合、選択行全体を同時移動させる
- 非選択行で move 操作した場合はその行だけを移動する
- データセットやスコープが変わったら古い selectedKeys をクリアする

## Procedure

### Step 1. 依頼を並び替えユースケースとして再定義する

まず対象を明確にする。

- どの一覧が対象か
- 保存先は何か
- 平坦一覧か階層一覧か
- 既存ロールモデルを変える指定があるか
- 先に差分分析を返すべきか、すぐ実装すべきか

ユーザーが先に差分を求めている場合は、実装前に差分一覧を返す。

### Step 2. ロールモデルと対象一覧の差分を整理する

対象一覧ごとに、少なくとも次の観点で差分を洗い出す。

- 編集モード制御
- selectable と Shift 範囲選択
- ボタンによる上下移動
- drag and drop
- 明示保存と dirty tracking
- sort/filter 抑止と理由表示
- 階層や展開行の扱い

差分整理では、単に機能が無いかだけでなく、別方式で代替されていないかを見る。たとえば key remount で sort/filter を消している場合は、ロールモデルとの差分として扱う。

### Step 3. 共通契約を先に決める

一覧単位で以下の state をどう持つか決める。

- rowOrder
- selectedKeys
- dirty
- saving
- sortState
- filteredCount

必要なら visible rows と full order をマージする helper を用意する。filter や階層が絡む場合は、表示中の並び替え結果を全体順序へ反映する手順を先に設計する。

### Step 4. Reorder 有効条件と抑止理由を定義する

優先順位を持つ単一の enable/disable 判定を作る。

推奨順序は次の通り。

1. 編集不可状態
2. sort 有効
3. filter 有効
4. その他の画面固有制約

抑止理由は enable 判定と同じ条件順で 1 つだけ表示する。

### Step 5. ボタン移動を selection-aware にする

上下移動ボタンは常に同じ規則で動かす。

- 選択対象に対する操作なら選択行全体を移動する
- そうでなければ対象行だけを移動する
- 実際に順序が変わった場合だけ dirty を true にする
- 先頭と末尾のボタンは無効化する

### Step 6. Drag and Drop を同じ契約に合わせる

drag and drop でもボタン移動と同じ move ルールを使う。

- ドラッグした行が選択集合に含まれ、かつ複数選択されているなら選択集合全体を動かす
- そうでなければドラッグした 1 行だけを動かす
- no-op ドロップでは dirty を立てない

### Step 7. 保存フローを統一する

保存は次の構成に揃える。

- 明示的な保存ボタン
- saving state
- 現在順序と元データの displayOrder の差分抽出
- 差分のみ送信
- 成功後の再読込
- 再読込後の dirty reset

保存処理では、全件送信より差分送信を優先する。

### Step 8. Sort と Filter の状態を保持したまま抑止する

ロールモデルに合わせるなら、並び替え導入時に sort/filter state を消してはいけない。

- sortState と filteredCount を外出しする
- DataTable などの一覧基盤がそれらを親で持てるようにする
- 並び替え抑止中でも一覧の閲覧機能はそのまま使えるようにする

### Step 9. 階層一覧を扱う

階層一覧では次を確認する。

- 親一覧と子一覧で state を共有しない
- 子一覧は親単位で rowOrder、selectedKeys、dirty、saving、sortState、filteredCount を独立させる
- 展開行を持つ一覧基盤が drag を不必要に抑止していないか確認する
- 親の抑止理由と子の抑止理由を混同しない

### Step 10. 実装後にレビューする

実装後はコードレビュー観点で問題点を洗い出し、必要なら修正まで行う。

最低限見る点は次の通り。

- no-op move で dirty が立たないか
- スコープ切替時に selectedKeys が残らないか
- save 成功後に再読込しているか
- sort/filter 抑止理由の文言と優先順位が一貫しているか
- drag/drop とボタン移動の挙動が一致しているか
- 階層子一覧どうしの未保存状態が干渉しないか
- key remount 依存を残していないか

### Step 11. 必要な unit test を追加する

並び替えロジックを helper や純粋関数に寄せている場合は、少なくとも次を固定化する。

- 複数選択の一括移動
- 先頭と末尾の no-op move
- drag target 前後の移動結果
- visible rows と full order のマージ
- filter や非表示行を含む並び替え

UI だけで保証しようとせず、選択移動や並び順合成の中核ロジックは unit test を優先する。

## Verification

検証手順は対象ワークスペースの標準実行手順に従う。

- Docker Compose 前提のプロジェクトなら Compose ベースで確認する
- package.json scripts やタスクランナーが標準ならそれに従う
- ローカル UI 確認手段が複数ある場合は、チーム標準を優先する

少なくとも次を確認する。

1. view と edit の切替で reorder 可否が正しく変わる
2. 単一移動、複数選択移動、Shift 範囲選択が期待通りに動く
3. drag and drop がボタン移動と同じ結果になる
4. sort 中と filter 中に reorder が抑止され、理由が表示される
5. 保存ボタンの有効条件が dirty 状態と一致する
6. 保存後に一覧が再同期される
7. 階層一覧では親と子の保存状態が独立している
8. selection-aware move や order merge の helper に unit test がある

## Output Format

ユーザーへの返答や作業結果は、必要に応じて次の順でまとめる。

1. 対象一覧とロールモデルの要約
2. 差分一覧
3. 実装方針
4. 実装結果
5. レビュー findings と修正結果
6. 検証状況

## Completion Criteria

次の条件を満たしたら完了とみなす。

- 対象一覧が共通の reorder UX 契約に揃っている
- dirty、selection、sort/filter 抑止、保存の流れが一貫している
- hierarchy を含む場合も親子で状態干渉がない
- 実装後レビューで主要な問題点が洗い出され、修正済みまたは明示済みである
- 重要な reorder helper や順序合成ロジックに unit test が追加されている、または追加不要の理由が説明されている
- 対象ワークスペースの標準手順に沿った検証手順または実施結果が示されている