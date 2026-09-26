# コンテンツ・管理画面設定

公開ページは `p-o-ke-nae/pokenae.Content` の `main` にある `content/posts`、`content/tools`、`content/home`、`content/updates` を Server Component から取得し、300秒キャッシュします。最初に `main` のcommit SHAとtree SHAを解決し、Git Trees APIとraw配信の双方をその不変commitへ固定します。GitHub App設定時は読み取りにもinstallation tokenを使用します。未設定時は公開リポジトリを匿名で読み取ります。

ローカル・E2Eでは `.env.docker.debug` に `CONTENT_SOURCE=fixture` を明示してください。fixtureへの切替は明示設定またはtest環境だけで行い、GitHub取得失敗をfixture成功として隠しません。`reference/` は入力専用でGit管理対象外です。

## 管理者

1. Google OAuth2/NextAuthを通常どおり設定する。
2. `ADMIN_EMAILS` に管理者メールを小文字・カンマ区切りで設定する。認証済みGoogleメールと正規化後に完全一致します。
3. GitHub Appを `pokenae.Content` にインストールし、Contents: read/write、Pull requests: read/write のみを許可する。
4. `GITHUB_APP_ID`、`GITHUB_APP_INSTALLATION_ID`、`GITHUB_APP_PRIVATE_KEY` を設定する。本番では秘密鍵をbase64化して `GITHUB_APP_PRIVATE_KEY_BASE64` に設定できます。

管理APIは画面表示とは別に毎回再認可します。保存は `content/<slug>-<timestamp>` ブランチ、単一commit、Pull Requestを作成し、mainへ直接書き込みません。資格情報不足時は失敗として扱います。

記事・ホーム・ツール編集画面は取得時のcommit SHAをbase revisionとして保存要求へ含めます。保存前、commit作成前、Pull Request作成結果でmainのcommit SHAを確認し、不一致ならHTTP 409で拒否します。Pull Request作成と同時に競合を検出した場合は、そのPull Requestを閉じて作業branchを削除します。画面を再読込して最新内容から編集し直してください。

## GitHub Actions / VPS / ACA

Repository/Environment Secrets:

- `ADMIN_EMAILS`
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY_BASE64`

ACAデプロイでは、スペース区切りの `KEY=VALUE` のうち値が設定されたsecretだけを登録します。未設定の管理用secretは警告して省略されるため公開サイトのデプロイは継続しますが、管理APIは資格情報不足としてfail closedのままです。空または環境変数名として不正なKEYは設定ミスとしてデプロイを停止します。`NEXTAUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` は従来どおり、設定されている場合にACAへsecret参照として渡されます。

公開設定 `CONTENT_REPOSITORY_OWNER`、`CONTENT_REPOSITORY_NAME`、`CONTENT_REPOSITORY_REF` はVariablesまたはCompose環境変数として注入します。秘密鍵はクライアント向け `NEXT_PUBLIC_*` に設定しないでください。
