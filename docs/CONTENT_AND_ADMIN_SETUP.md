# コンテンツ・管理画面設定

公開ページは `p-o-ke-nae/pokenae.Content` の `main` にある `content/posts`、`content/tools`、`content/apps`、`content/home`、`content/updates` を Server Component から取得し、300秒キャッシュします。最初に `main` のcommit SHAとtree SHAを解決し、Git Trees APIとraw配信の双方をその不変commitへ固定します。GitHub App設定時は読み取りにもinstallation tokenを使用します。未設定時は公開リポジトリを匿名で読み取ります。

トップページと `/info` のINFO欄には、公開対象のブログ（`post`）、ツール開発室（`tool`）、Webアプリ（`app`）の追加・更新だけを表示します。バナー・ニュース（`home`）とナビゲーション（`navigation`）の更新履歴は表示しません。記事とツールの保存時は「INFOに表示しない」を選ぶと、更新履歴（`visible: false`）は残したままINFO欄から除外できます。

ローカルで固定データを使う場合とE2Eでは `.env.docker.debug` に `CONTENT_SOURCE=fixture` を明示してください。fixtureは読み取り確認専用であり、管理画面からPull Requestは作成できません。ローカルの管理画面から実際にPull Requestを作成する場合は `CONTENT_SOURCE=github` を設定し、debugコンテナを再起動してください。fixtureへの切替は明示設定またはtest環境だけで行い、GitHub取得失敗をfixture成功として隠しません。`reference/` は入力専用でGit管理対象外です。

## 管理者

1. Google OAuth2/NextAuthを通常どおり設定する。
2. `ADMIN_EMAILS` に管理者メールを小文字・カンマ区切りで設定する。認証済みGoogleメールと正規化後に完全一致します。
3. GitHub Appを `pokenae.Content` にインストールし、Contents: read/write、Pull requests: read/write のみを許可する。
4. `GITHUB_APP_ID`、`GITHUB_APP_INSTALLATION_ID`、`GITHUB_APP_PRIVATE_KEY` を設定する。本番では、PEM秘密鍵ファイル全体をbase64化した1行の値を `GITHUB_APP_PRIVATE_KEY_BASE64` に設定できます。`GITHUB_APP_PRIVATE_KEY_BASE64` はPEM文字列そのものや、引用符・改行エスケープを含む値ではなく、base64文字列だけを指定してください。

PEMファイルをbase64化する場合は、秘密鍵の内容を加工せず次のように変換します。

```bash
node -e "const fs=require('fs'); process.stdout.write(Buffer.from(fs.readFileSync('github-app-private-key.pem')).toString('base64'))" > secrets/github_app_private_key_base64
```

管理APIは画面表示とは別に毎回再認可します。保存は `content/<slug>-<timestamp>` ブランチ、単一commit、Pull Requestを作成し、mainへ直接書き込みません。資格情報不足時は失敗として扱います。

記事管理の記事一覧は、管理画面を開くたびに `CONTENT_REPOSITORY_REF` の最新mainを取得します。公開ページは従来どおり300秒キャッシュです。レビュー待ち一覧は `CONTENT_REPOSITORY_REF` 宛てのopenなPull Requestだけを対象にし、GitHub上でCloseしてから表示へ反映されるまで最大5分かかる場合があります。

既存記事の「非公開化」は、記事の `status` を `draft` に変更するPull Requestを作成します。記事本文、slug、画像は削除せず、mainにマージされるまで公開状態は変わりません。物理削除は行わないため、誤操作時もGit履歴または逆のstatus変更で復元できます。fixtureモードでは他のコンテンツ書き込みと同様にPull Requestを作成できません。

### 公開コンテンツ設定 Pull Request の修正

`/admin/content` は公開コンテンツ設定のハブです。編集対象はページごとに分かれています。

- `/admin/content/banners`: バナー
- `/admin/content/announcements`: ニュース
- `/admin/content/tools`: ツール
- `/admin/content/apps`: Webアプリ
- `/admin/content/tags`: タグ

旧URL `/admin/posts/home` は `/admin/content` へリダイレクトします。各ページでは項目の追加、編集、削除に対応し、ツールではWeb側schemaの任意項目も指定できます。Webアプリでは表示名、slug、概要、アプリ内href、画像、代替テキスト、メタラベル、公開状態、表示順、タグを編集します。画像を指定しない場合もContent側canonical schemaに従って `image: null` を保存します。

新規作成に加え、管理画面が作成した open な `content/<kind>-YYYYMMDDhhmmss` Pull Request を種類ごとに選び、同じ head branch に修正commitを追加できます。Webアプリは `content/apps-YYYYMMDDhhmmss` branchで、各項目を `content/apps/<slug>.json`、更新情報を `content/updates/apps-YYYYMMDDhhmmss.json` へ保存します。対象は次をすべて満たすPRだけです。

- head/base がともに設定済みの `pokenae.Content` リポジトリである（forkは不可）
- base branch が `CONTENT_REPOSITORY_REF`
- branchと変更対象が選択した種類に一致する
- 変更対象が対応する設定ファイル、`content/updates/<kind>-*.json`、バナーの場合は `content/home/images/*.webp` のみ。Webアプリの場合は `content/apps/*.json` と対応するupdateファイルのみ
- 画面で読み込んだ head SHA と保存直前の head SHA が一致する

保存時は、バナーとニュースを同じcommit revisionに固定したhome canonical schema、ツールをtool canonical schema、Webアプリをapp canonical schema、全種類のupdate JSONをupdate canonical schemaで検証します。schemaを取得・解釈できない場合はfail closedで保存しません。ツールとWebアプリは各JSONを個別検証し、canonical schemaとの不整合を項目エラーとして返して、Pull Requestを作成・更新しません。削除された項目のファイルも同じcommitから削除します。tool/app の `image` に `./images/...` の相対パスを指定した場合は、公開表示時に同じ `content/tools` または `content/apps` 配下のcommit固定raw URLへ解決します。update JSONには種類に応じた `target` と `href` を生成し、公開変更は `visible: true`、タグ管理の内部変更は `visible: false` とします。

タグは `fixtures/tags.json` の安定 ID と `fixtures/tag-labels.json` の表示名を分離して管理します。記事 frontmatter の `tags` / `relatedTags` は従来どおり ID を保持するため、表示名の変更だけでは既存記事を書き換えません。タグを削除すると、同じ Pull Request 内で全記事の `tags` / `relatedTags` から対象 ID を除去します。

タグ ID は `000001` から `999999` の6桁連番です。新規タグは管理画面で表示名だけを入力し、保存時に main と管理対象の未完了 Pull Request にある最大 ID の次をサーバー側で採番します。競合を検出した場合は HTTP 409 を返すため、画面を再読込して再実行してください。

既存4桁IDの移行では、番号を変えず左側をゼロ埋めし、タグ定義と記事の `tags` / `relatedTags` を同じ対応表で更新します。移行期間中の公開読取は4桁参照を6桁へ正規化しますが、管理画面からの新規書込は6桁だけを受け付けます。Content側の移行PRを先にマージし、未定義参照・重複・旧4桁IDがないことを確認してからWeb側の変更をリリースしてください。

公開側の `/blog`、`/tools`、`/apps` は、ページ見出し・導入文の直下でキーワードとタグによる絞り込みを行えます。キーワードは `/blog` ではタイトル、`/tools` と `/apps` ではタイトルまたは概要の部分一致で検索します。複数タグは `?tags=000001&tags=000002` のように指定し、すべてのタグを含むコンテンツだけを表示します。各詳細ページ末尾のタグリンクも同じ検索 URL を使用します。

記事作成・編集画面では、既存タグを表示名または ID で検索して選択できます。新規タグは ID と表示名を入力して記事へ追加し、記事とタグ正本を同じ Pull Request に保存します。記事保存から既存タグ自体を削除することはできず、削除はタグ管理画面で行います。

記事の公開日は選択日の日本時間 00:00 として保存します。`status` が「公開」でも未来の公開日を指定した記事は予約公開となり、公開時刻までは一覧、詳細URL、PICKUP、関連記事、RSS、サイトマップ、INFOに表示されません。公開済み記事を未来日に変更した場合も、Pull Requestのマージ後は同様に一時非公開となり、公開時刻後に最大約5分のキャッシュ更新を経て自動的に再公開されます。Content schemaで必須の更新日時は公開前には公開日時と同値で保存し、公開後に編集した場合だけ実際の編集日時へ進めます。画面では更新日時が公開日時より後の場合だけ更新日を表示します。

記事の `legacyUrl` は移行元ページが存在する場合だけ保存する任意項目です。記事画像は `content/posts/<slug>/images/` に格納し、frontmatter と Markdown では `./images/<file>` の相対パスを正本とします。管理画面のプレビューと公開ページだけが commit SHA 固定の raw URL に解決します。同じ Content リポジトリ・同じ記事配下の raw URL が古い下書きや既存 PR に残っている場合は保存時に相対パスへ戻しますが、その他の外部画像 URL は保存できません。新規作成時だけでなく既存の記事 Pull Request を修正するときも、paste した画像は同じ head branch へ追加します。

バナー画像は5MB以下・4096×4096以下のPNG/JPEG/WebPのみ受け付け、回転補正・縮小後にWebPへ変換して `content/home/images/<banner-id>-<hash>.webp` に保存します。バナーの画像参照は、既存head treeと今回追加する画像を合成したproposed tree内に存在する相対pathだけを許可します。`/mock/...` や外部URLはContent用画像として保存できません。

競合時はHTTP 409を返します。画面で対象PRを選び直して最新headを読み込み、変更を再適用してください。

タグID導入前に作成された記事PRを編集する場合、記事frontmatterのタグ表示名は現在の `main` にあるタグ正本の表示名と照合してタグIDへ正規化します。表示名がタグ定義に存在しない、または複数のタグに一致する場合は自動変換せず、管理画面に原因を表示します。タグ管理で対応するID・表示名を先に定義してから、PRを再読込してください。PR取得やfrontmatter検証の失敗は、原因確認のため404ではなく管理画面のエラーとして表示されます。

記事・ホーム・ツール編集画面は取得時のcommit SHAをbase revisionとして保存要求へ含めます。保存前、commit作成前、Pull Request作成結果でmainのcommit SHAを確認し、不一致ならHTTP 409で拒否します。Pull Request作成と同時に競合を検出した場合は、そのPull Requestを閉じて作業branchを削除します。画面を再読込して最新内容から編集し直してください。

## GitHub Actions / VPS / ACA

Repository/Environment Secrets:

- `ADMIN_EMAILS`
- `GH_APP_ID`（コンテナでは `GITHUB_APP_ID`）
- `GH_APP_INSTALLATION_ID`（コンテナでは `GITHUB_APP_INSTALLATION_ID`）
- `GH_APP_PRIVATE_KEY_BASE64`（コンテナでは `GITHUB_APP_PRIVATE_KEY_BASE64`）

GitHubは`GITHUB_`で始まるSecret名を予約しているため、GitHub上では`GH_APP_*`を使用し、workflowがコンテナ用の`GITHUB_APP_*`へ変換します。未構成環境では`GH_APP_ID=0`、`GH_APP_INSTALLATION_ID=0`、`GH_APP_PRIVATE_KEY_BASE64=ZGlzYWJsZWQ=`を登録します。3値が揃った場合だけ無効化センチネルとして扱われ、公開サイトのデプロイは継続しますが、管理APIは資格情報不足としてfail closedのままです。

秘密鍵がログ、画面共有、チャットなどへ露出した場合は再利用せず、GitHub App設定でその鍵を削除して新しい秘密鍵を発行します。新しいPEMをbase64化し、対象GitHub Environmentの `GH_APP_PRIVATE_KEY_BASE64` を上書きして再デプロイしてください。必要に応じて `GH_APP_ID` と `GH_APP_INSTALLATION_ID` も同じEnvironmentで更新します。値をログやコマンド出力へ表示せず、デプロイ後に認証済み管理画面からPR一覧取得とテスト用PR作成で確認します。

管理APIはGitHub障害を安全なコードへ分類します。`GITHUB_APP_NOT_CONFIGURED` / `GITHUB_APP_INVALID` は資格情報、`GITHUB_APP_FORBIDDEN` はContents・Pull requests権限、`GITHUB_APP_NOT_INSTALLED` はContentリポジトリへのインストール、`GITHUB_RATE_LIMITED` / `GITHUB_UNAVAILABLE` は再試行時期やGitHub状態を確認してください。GitHubレスポンス本文や秘密情報は画面へ返しません。

ACAデプロイでは、Environment SecretsをAzure secretsへ設定し、常に同じsecretrefでコンテナへ渡します。必須secretの空値、またはGitHub Appの実値とセンチネルの混在は設定ミスとして拒否します。`NEXTAUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`も同じEnvironment Secretsから渡します。

公開設定 `CONTENT_REPOSITORY_OWNER`、`CONTENT_REPOSITORY_NAME`、`CONTENT_REPOSITORY_REF` はVariablesまたはCompose環境変数として注入します。秘密鍵はクライアント向け `NEXT_PUBLIC_*` に設定しないでください。
