# Azure Container Apps (ACA) デプロイ環境構築ガイド

本ドキュメントでは、GitHub Actions から Azure Container Apps へ Docker コンテナをデプロイするために必要な Azure 側の準備手順を説明します。

> **対象読者**: Azure Portal の GUI 操作でセットアップを行う方  
> **CLI で自動化する場合**: [`scripts/setup-azure-aca.sh`](../scripts/setup-azure-aca.sh) を参照してください。各セクションに対応する CLI コマンドを記載しています。

---

## 目次

1. [前提条件](#1-前提条件)
2. [リソースグループの作成](#2-リソースグループの作成)
3. [Container Apps 環境の作成](#3-container-apps-環境の作成)
4. [Container App の作成](#4-container-app-の作成)
5. [サービスプリンシパルの作成（GitHub Actions 認証用）](#5-サービスプリンシパルの作成github-actions-認証用)
6. [GitHub リポジトリへのシークレット・変数登録](#6-github-リポジトリへのシークレット変数登録)
7. [カスタムドメインと TLS の設定（任意）](#7-カスタムドメインと-tls-の設定任意)
8. [動作確認](#8-動作確認)
9. [トラブルシューティング](#9-トラブルシューティング)

---

## 1. 前提条件

- Azure アカウント（無料アカウントでも可）
- GitHub リポジトリへの管理者権限
- GHCR（GitHub Container Registry）に Docker イメージが push 済み  
  （既存の CI/CD ワークフローで `build-main` / `build-develop` ジョブが成功していれば OK）

---

## 2. リソースグループの作成

> **CLI 自動化**: `setup-azure-aca.sh` の **ステップ 1** に該当

リソースグループは Azure リソースをまとめて管理する論理的なコンテナです。

### Azure Portal での手順

1. [Azure Portal](https://portal.azure.com) にサインイン
2. 上部の検索バーに「**リソースグループ**」と入力し、選択
3. **「+ 作成」** をクリック
4. 以下を入力:
   | 項目 | 値の例 |
   |------|--------|
   | サブスクリプション | （自分のサブスクリプション） |
   | リソースグループ名 | `ASPGroup` |
   | リージョン | `Japan East`（東日本） |
5. **「確認および作成」** → **「作成」** をクリック

---

## 3. Container Apps 環境の作成

> **CLI 自動化**: `setup-azure-aca.sh` の **ステップ 2** に該当

Container Apps 環境は、複数の Container App が共有するネットワーク・ログ基盤です。  
**本番用と開発用で同じ環境を共有してもよいですし、分けても構いません。**

### Azure Portal での手順

1. 上部の検索バーに「**Container Apps 環境**」と入力し、選択
2. **「+ 作成」** をクリック
3. **「基本」** タブ:
   | 項目 | 値の例 |
   |------|--------|
   | サブスクリプション | （自分のサブスクリプション） |
   | リソースグループ | `ASPGroup` |
   | 環境名 | `cae-pokenae` |
   | リージョン | `Japan East` |
   | プランの種類 | **従量課金** |
4. **「監視」** タブ:
   - Log Analytics ワークスペース: **新規作成**（デフォルトのまま OK）
5. **「確認および作成」** → **「作成」** をクリック

> **ポイント**: 従量課金プランを選択すると、毎月の無料枠（vCPU 180,000秒 / メモリ 360,000 GiB秒）が適用されます。

---

## 4. Container App の作成

> **CLI 自動化**: `setup-azure-aca.sh` の **ステップ 3** に該当

本番用 (`pokenae-web-prod`)、開発用 (`pokenae-web-develop`)、Copilot 検証用 (`pokenae-web-copilot`) をそれぞれ作成します。  
以下は本番用の例ですが、開発用・Copilot 用も同じ手順で名前を変えて作成してください。

### Azure Portal での手順

1. 上部の検索バーに「**Container Apps**」と入力し、選択
2. **「+ 作成」** をクリック
3. **「基本」** タブ:
   | 項目 | 値の例 |
   |------|--------|
   | サブスクリプション | （自分のサブスクリプション） |
   | リソースグループ | `ASPGroup` |
   | コンテナアプリ名 | `pokenae-web-prod` |
   | Container Apps 環境 | `cae-pokenae`（前ステップで作成） |
   | リージョン | `Japan East` |

   > **開発用**: コンテナアプリ名を `pokenae-web-develop` にして同様に作成してください。  
   > **Copilot 検証用**: コンテナアプリ名を `pokenae-web-copilot` にして同様に作成してください。

4. **「コンテナー」** タブ:
   | 項目 | 値 |
   |------|-----|
   | イメージソース | **Docker Hub またはその他のレジストリ** |
   | イメージの種類 | **パブリック** または **プライベート** |
   | レジストリサーバー | `ghcr.io` |
   | イメージとタグ | `<GitHubユーザー名>/pokenae-web:develop` |

   **リソース割り当て**:
   | 項目 | 値 |
   |------|-----|
   | CPU | `0.5` |
   | メモリ | `1 Gi` |

5. **「イングレス」** タブ:
   | 項目 | 値 |
   |------|-----|
   | イングレス | **有効** |
   | イングレスの種類 | **どこからでもトラフィックを受け入れる** |
   | ターゲットポート | `3000` |
   | トランスポート | **HTTP/1** |

6. **「確認および作成」** → **「作成」** をクリック

### スケール設定の変更（作成後）

1. 作成した Container App を開く
2. 左メニュー **「スケールとレプリカ」** を選択
3. 以下を設定:
   | 項目 | 開発用 | 本番用（即応性重視） |
   |------|--------|----------------------|
   | 最小レプリカ | `0` | `1` |
   | 最大レプリカ | `1` | `3` |
4. **「保存」** をクリック

> **ポイント**: 最小レプリカを `0` にするとゼロスケール（=アイドル時の課金 $0）が有効になります。  
> ただし、最初のリクエスト時にコールドスタート（数秒〜十数秒）が発生します。

---

## 5. サービスプリンシパルの作成（GitHub Actions 認証用）

> **CLI 自動化**: `setup-azure-aca.sh` の **ステップ 4** に該当

GitHub Actions から Azure にデプロイするには、サービスプリンシパル（SP）を作成して認証情報を GitHub Secrets に登録します。

### Azure Portal での手順

#### 5-1. サービスプリンシパルの作成

**この手順は Azure Portal 単体では完結しないため、Azure Cloud Shell を使用します。**

1. Azure Portal 右上の **Cloud Shell**（`>_` アイコン）をクリック
2. **Bash** を選択
3. 以下のコマンドを実行:

```bash
# サブスクリプション ID を確認
az account show --query id --output tsv

# サービスプリンシパルを作成（ASPGroup に対する Contributor 権限）
az ad sp create-for-rbac \
  --name "sp-pokenae-github-actions" \
  --role contributor \
  --scopes /subscriptions/d16e8e20-bd14-41c1-b546-d3eeccf38c6c/resourceGroups/ASPGroup\
  --sdk-auth
```

4. 出力された JSON をコピーして保存（次のステップで使用）

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  ...
}
```

#### 5-2. サービスプリンシパルへの追加ロール割り当て（任意）

Container Apps のデプロイに必要な最小権限を付与する場合:

1. Azure Portal →「**リソースグループ**」→ `ASPGroup` を選択
2. 左メニュー **「アクセス制御 (IAM)」** を選択
3. **「+ 追加」** → **「ロールの割り当ての追加」**
4. 以下のロールを割り当て:
   - **共同作成者 (Contributor)**: リソースの作成・更新・削除

   > 既に `create-for-rbac` で Contributor を付与済みであれば追加不要です。

---

## 6. GitHub リポジトリへのシークレット・変数登録

> **CLI 自動化**: `setup-azure-aca.sh` の **ステップ 5** に該当（GitHub CLI 使用）

GitHub Actions のワークフローが参照するシークレットと変数を登録します。

### GitHub での手順

1. GitHub リポジトリページ → **「Settings」** → **「Secrets and variables」** → **「Actions」**

#### Secrets（機密情報）

**「New repository secret」** で以下を追加:

| Secret 名              | 値                                    | 説明                         |
| ---------------------- | ------------------------------------- | ---------------------------- |
| `AZURE_CREDENTIALS`    | サービスプリンシパルの JSON 全体      | ステップ 5-1 で取得した JSON |
| `NEXTAUTH_SECRET`      | NextAuth のシークレット               | （既存のシークレットを流用） |
| `GOOGLE_CLIENT_ID`     | Google OAuth クライアント ID          | （既存のシークレットを流用） |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | （既存のシークレットを流用） |

> **注**: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` は既に VPS デプロイ用に登録済みの場合、追加不要です。

#### Variables（公開可能な設定値）

**「Variables」** タブ → **「New repository variable」** で以下を追加:

| Variable 名                | 値の例                                                           | 説明                       |
| -------------------------- | ---------------------------------------------------------------- | -------------------------- |
| `AZURE_RESOURCE_GROUP`     | `ASPGroup`                                                       | リソースグループ名         |
| `PROD_NEXTAUTH_URL_ACA`    | `https://pokenae-web-prod.<リージョン>.azurecontainerapps.io`    | 本番 ACA の FQDN           |
| `DEV_NEXTAUTH_URL_ACA`     | `https://pokenae-web-develop.<リージョン>.azurecontainerapps.io` | 開発 ACA の FQDN           |
| `COPILOT_NEXTAUTH_URL_ACA` | `https://pokenae-web-copilot.<リージョン>.azurecontainerapps.io` | Copilot 検証用 ACA の FQDN |

> **FQDN の確認方法**: Azure Portal → Container App → **「概要」** → **「アプリケーション URL」** に表示されます。

---

## 7. カスタムドメインと TLS の設定（任意）

ACA ではカスタムドメインの設定とマネージド TLS 証明書の取得が可能です。

### Azure Portal での手順

1. Container App を開く
2. 左メニュー **「カスタムドメイン」** を選択
3. **「+ カスタムドメインの追加」** をクリック
4. ドメイン名を入力（例: `app.pokenae.com`）
5. 表示される **CNAME レコード** と **TXT レコード** を DNS プロバイダに登録
6. DNS 伝播を待って **「検証」** をクリック
7. 証明書の種類: **マネージド証明書**（無料）を選択
8. **「追加」** をクリック

> **重要**: カスタムドメインを設定した場合、`NEXTAUTH_URL` を新しいドメインに更新する必要があります。  
> GitHub Variables の `PROD_NEXTAUTH_URL_ACA` をカスタムドメインに変更してください。

---

## 8. 動作確認

### デプロイの実行

1. `main`、`develop`、または `copilot/**` ブランチに push
2. GitHub Actions の **「Actions」** タブでワークフローの実行を確認
3. `deploy-main-aca` / `deploy-develop-aca` / `deploy-copilot-aca` ジョブが成功することを確認

### アプリケーションの確認

1. Azure Portal → Container App → **「概要」** → **「アプリケーション URL」** をクリック
2. アプリケーションが正常に表示されることを確認
3. Google OAuth ログインが動作することを確認

### ログの確認

1. Container App → 左メニュー **「ログストリーム」**
2. リアルタイムのコンテナログが表示されます
3. 詳細なログは **「ログ」** メニューから Log Analytics で KQL クエリを実行

---

## 9. トラブルシューティング

### コンテナが起動しない

1. Container App → **「リビジョン管理」** → 対象リビジョンを選択
2. **「プロビジョニングの状態」** を確認
3. **「ログストリーム」** でエラーメッセージを確認

よくある原因:

- **ポート不一致**: イングレスのターゲットポートとコンテナの EXPOSE ポートが一致しているか確認
- **環境変数不足**: `NEXTAUTH_SECRET` 等のシークレットが正しく設定されているか確認
- **イメージ pull 失敗**: GHCR の認証情報が正しいか確認

### Google OAuth が動作しない

- Google Cloud Console で **承認済みのリダイレクト URI** に ACA の FQDN を追加
  - 例: `https://pokenae-web-prod.<リージョン>.azurecontainerapps.io/api/auth/callback/google`
- `NEXTAUTH_URL` が正しい FQDN に設定されているか確認

### ゼロスケール後のコールドスタートが遅い

- Node.js standalone サーバーの起動に数秒かかるのは正常です
- 許容できない場合は、最小レプリカを `1` に設定してください

---

## リソース構成図

```
Azure サブスクリプション
└── ASPGroup（リソースグループ）
    ├── cae-pokenae（Container Apps 環境）
    │   ├── pokenae-web-prod（Container App: 本番）
    │   ├── pokenae-web-develop（Container App: 開発）
    │   └── pokenae-web-copilot（Container App: Copilot 検証用）
    ├── Log Analytics ワークスペース（ログ基盤）
    └── sp-pokenae-github-actions（サービスプリンシパル）
```

## CI/CD フロー

```
GitHub (push to main / develop / copilot/**)
  │
  ├── test（lint + テスト）
  │
  ├── build-main / build-develop / build-copilot
  │     └── Docker イメージを GHCR に push
  │         └── copilot/** ブランチは全て :copilot タグで上書き
  │
  ├── deploy-*-vps（既存の VPS デプロイ）
  │
  └── deploy-*-aca（Azure Container Apps デプロイ）
        ├── Azure にログイン（サービスプリンシパル）
        ├── シークレットを ACA に登録
        ├── コンテナイメージを更新
        └── ヘルスチェックで検証

      branch と Container App の対応:
        main       → pokenae-web-prod    (GHCR タグ: :main)
        develop    → pokenae-web-develop (GHCR タグ: :develop)
        copilot/** → pokenae-web-copilot (GHCR タグ: :copilot)
```
