# Issue #94 実装追従: Game Library 保守履歴と横断セーブデータ検索

> 対象 Issue: #94
> 対象範囲: `/game-library/maintenance`、`/game-library/save-data-search`、保守履歴ダイアログ UX、ダッシュボード導線、検索ヘルパー/テスト

---

## 概要

Issue #94 の Phase 3 実装差分に合わせて、Game Library 向けの新規ルートと関連 UI の最終挙動を整理する。

| 項目 | 実装内容 |
|------|----------|
| ダッシュボード導線 | `/game-library` に「保守履歴」「横断セーブデータ検索」のカードを追加 |
| 保守ページ | `/game-library/maintenance` で 3 リソース横断の保守状態一覧と順次記録を提供 |
| 検索ページ | `/game-library/save-data-search` で `variant` + 複数条件グループ検索を提供 |
| ネストダイアログ | `EditorDialog` から保守履歴ダイアログを子表示し、変更後に親サマリーを再読込 |
| テスト | 保守サマリー helper と横断検索 helper の unit test を追加 |

---

## 1. ルート構成

| ルート | 役割 |
|--------|------|
| `/game-library` | ユーザー向けダッシュボード。既存管理対象に加えて 2 つの追加カードを表示 |
| `/game-library/maintenance` | ゲーム機・ゲームソフト・メモリーカードを横断した保守対象一覧 |
| `/game-library/save-data-search` | 作品横断のセーブデータ検索ページ |

---

## 2. 保守履歴 UI

### `/game-library/maintenance`

- `MaintenanceDashboardPage` を表示する
- 保守状態フィルタは `All` / `ExcludeUnhealthy` / `OnlyUnhealthy`
- 一覧は overdue、状態、次回予定日を基準に並べ替える
- 複数選択した対象を「順次記録」で 1 件ずつダイアログ表示する
- 自動遷移は **新規記録の保存時のみ** 次対象へ進む

### `EditorDialog` のネストダイアログ

- 保守対応リソースの編集ダイアログ内に「保守履歴」セクションを表示する
- `[履歴を見る]` で子ダイアログを開き、`MaintenanceRecordsSection` を再利用する
- 子ダイアログで変更が完了すると、親レコードを再取得して保守サマリーを更新する
- trial mode では子ダイアログは開けるが、保守記録の保存は無効

---

## 3. 横断セーブデータ検索

- 検索条件は URL の `criteria` JSON に保存し、共有 URL から復元する
- 「削除済みデータを含む」をオンにした場合のみ、`includeDeleted=1` を URL に保存し、API へ `includeDeleted=true` を渡す
- 既定では削除済みセーブデータを検索対象に含めない
- schema / story progress schema は、読み込んだセーブデータの `gameSoftwareMasterId` に応じて遅延読込する
- 検索結果はカード表示し、削除済みレコードには「削除済み」バッジを表示する
- 結果から `SaveData` 詳細ダイアログを **view mode** で開ける
- 削除済み `SaveData` は詳細・編集ダイアログで削除日時と削除理由のバナーを表示し、通常項目は編集可能とする

### schema 条件の評価

| fieldType | 評価方法 |
|-----------|----------|
| 文字列 / 複数行文字列 | 部分一致 |
| 真偽値 | `true` / `false` の完全一致 |
| 数値 / 小数 / 日付 / 選択肢 | 完全一致 |

---

## 3.1 セーブデータ一覧・削除

- `/game-library/save-datas` の一覧も「削除済みデータを含む」をオンにした場合のみ削除済みを取得する
- 一覧の「状態」列で有効 / 削除済みを確認できる
- 削除済みレコードの削除ボタンは非表示とする
- 削除確認では置換先 SaveData の指定を廃止し、削除理由のみ送信する
- 「削除して新規作成」は削除成功後に `/game-library/save-datas/new` へ遷移し、保存先関連 ID をクエリから新規フォームへ引き継ぐ

---

## 4. テスト反映

| ファイル | 対象 |
|---------|------|
| `lib/game-management/maintenance.test.ts` | 保守対応判定、状態ラベル、保守サマリー文言 |
| `lib/game-management/save-data-search.test.ts` | variant 判定、条件グループ一致、OR/AND 評価 |

---

## 5. 実装上の補足

- 保守ページ・検索ページとも `PageFrame` / `PageCard` を再利用し、Game Library 配下の見た目を統一している
- README のセットアップ手順や運用前提には変更がないため、本件では更新していない
