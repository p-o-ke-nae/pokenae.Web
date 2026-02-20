#!/usr/bin/env bash
# ===========================================================================
# Azure Container Apps 環境セットアップスクリプト
#
# 本スクリプトは docs/AZURE_CONTAINER_APPS_SETUP.md の手順を自動化します。
# 各ステップのコメントに対応するドキュメントのセクション番号を記載しています。
#
# 前提条件:
#   - Azure CLI がインストール済み (az --version)
#   - Azure にログイン済み (az login)
#   - GitHub CLI がインストール済み (gh --version) ※ GitHub シークレット登録を行う場合
#
# 使い方:
#   # 対話的に実行（デフォルト値を確認しながら進める）
#   bash scripts/setup-azure-aca.sh
#
#   # 環境変数で値を指定して非対話的に実行
#   RESOURCE_GROUP=rg-pokenae \
#   LOCATION=japaneast \
#   ENVIRONMENT_NAME=cae-pokenae \
#   APP_NAME_PROD=pokenae-web-prod \
#   APP_NAME_DEV=pokenae-web-dev \
#   GHCR_IMAGE=ghcr.io/your-user/pokenae-web \
#   bash scripts/setup-azure-aca.sh
# ===========================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 色付きログ出力
# ---------------------------------------------------------------------------
log_info()    { echo -e "\033[0;34m[INFO]\033[0m $*"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $*"; }
log_warn()    { echo -e "\033[0;33m[WARN]\033[0m $*"; }
log_error()   { echo -e "\033[0;31m[ERROR]\033[0m $*"; }

# ---------------------------------------------------------------------------
# 対話的入力ヘルパー（環境変数が未設定なら質問する）
# ---------------------------------------------------------------------------
ask_or_default() {
  local var_name="$1"
  local prompt="$2"
  local default="$3"
  local current_val="${!var_name:-}"

  if [ -n "${current_val}" ]; then
    echo "${current_val}"
    return
  fi

  read -rp "${prompt} [${default}]: " input
  echo "${input:-${default}}"
}

# ---------------------------------------------------------------------------
# Azure ログイン確認
# ---------------------------------------------------------------------------
log_info "Azure ログイン状態を確認中..."
if ! az account show > /dev/null 2>&1; then
  log_error "Azure にログインしていません。'az login' を実行してください。"
  exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id --output tsv)
SUBSCRIPTION_NAME=$(az account show --query name --output tsv)
log_info "サブスクリプション: ${SUBSCRIPTION_NAME} (${SUBSCRIPTION_ID})"

# ---------------------------------------------------------------------------
# パラメータ設定
# ---------------------------------------------------------------------------
RESOURCE_GROUP=$(ask_or_default "RESOURCE_GROUP" "リソースグループ名" "rg-pokenae")
LOCATION=$(ask_or_default "LOCATION" "リージョン" "japaneast")
ENVIRONMENT_NAME=$(ask_or_default "ENVIRONMENT_NAME" "Container Apps 環境名" "cae-pokenae")
APP_NAME_PROD=$(ask_or_default "APP_NAME_PROD" "本番 Container App 名" "pokenae-web-prod")
APP_NAME_DEV=$(ask_or_default "APP_NAME_DEV" "開発 Container App 名" "pokenae-web-dev")
GHCR_IMAGE=$(ask_or_default "GHCR_IMAGE" "GHCR イメージ名 (タグ無し)" "ghcr.io/your-user/pokenae-web")

echo ""
log_info "=== 設定値 ==="
log_info "RESOURCE_GROUP:   ${RESOURCE_GROUP}"
log_info "LOCATION:         ${LOCATION}"
log_info "ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}"
log_info "APP_NAME_PROD:    ${APP_NAME_PROD}"
log_info "APP_NAME_DEV:     ${APP_NAME_DEV}"
log_info "GHCR_IMAGE:       ${GHCR_IMAGE}"
echo ""

# ===========================================================================
# ステップ 1: リソースグループの作成
# ドキュメント: AZURE_CONTAINER_APPS_SETUP.md セクション 2
# ===========================================================================
log_info "ステップ 1: リソースグループ '${RESOURCE_GROUP}' を作成..."

if az group show --name "${RESOURCE_GROUP}" > /dev/null 2>&1; then
  log_warn "リソースグループ '${RESOURCE_GROUP}' は既に存在します。スキップします。"
else
  az group create \
    --name "${RESOURCE_GROUP}" \
    --location "${LOCATION}" \
    --output none
  log_success "リソースグループ '${RESOURCE_GROUP}' を作成しました。"
fi

# ===========================================================================
# ステップ 2: Container Apps 環境の作成
# ドキュメント: AZURE_CONTAINER_APPS_SETUP.md セクション 3
# ===========================================================================
log_info "ステップ 2: Container Apps 環境 '${ENVIRONMENT_NAME}' を作成..."

# containerapp 拡張機能の確認・インストール
if ! az extension show --name containerapp > /dev/null 2>&1; then
  log_info "containerapp 拡張機能をインストール中..."
  az extension add --name containerapp --upgrade --yes
fi

if az containerapp env show \
  --name "${ENVIRONMENT_NAME}" \
  --resource-group "${RESOURCE_GROUP}" > /dev/null 2>&1; then
  log_warn "Container Apps 環境 '${ENVIRONMENT_NAME}' は既に存在します。スキップします。"
else
  az containerapp env create \
    --name "${ENVIRONMENT_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --location "${LOCATION}" \
    --output none
  log_success "Container Apps 環境 '${ENVIRONMENT_NAME}' を作成しました。"
fi

# ===========================================================================
# ステップ 3: Container App の作成（本番 + 開発）
# ドキュメント: AZURE_CONTAINER_APPS_SETUP.md セクション 4
# ===========================================================================
create_container_app() {
  local app_name="$1"
  local image_tag="$2"
  local min_replicas="$3"
  local max_replicas="$4"

  log_info "Container App '${app_name}' を作成..."

  if az containerapp show \
    --name "${app_name}" \
    --resource-group "${RESOURCE_GROUP}" > /dev/null 2>&1; then
    log_warn "Container App '${app_name}' は既に存在します。スキップします。"
    return
  fi

  az containerapp create \
    --name "${app_name}" \
    --resource-group "${RESOURCE_GROUP}" \
    --environment "${ENVIRONMENT_NAME}" \
    --image "${GHCR_IMAGE}:${image_tag}" \
    --target-port 3000 \
    --ingress external \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas "${min_replicas}" \
    --max-replicas "${max_replicas}" \
    --env-vars "NODE_ENV=production" "PORT=3000" \
    --output none

  log_success "Container App '${app_name}' を作成しました。"
}

# 本番: 最小 1 レプリカ（即応性重視）
create_container_app "${APP_NAME_PROD}" "main" 1 3

# 開発: 最小 0 レプリカ（ゼロスケール有効、コスト節約）
create_container_app "${APP_NAME_DEV}" "develop" 0 1

# FQDN の取得
PROD_FQDN=$(az containerapp show \
  --name "${APP_NAME_PROD}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv 2>/dev/null || echo "（取得失敗）")

DEV_FQDN=$(az containerapp show \
  --name "${APP_NAME_DEV}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv 2>/dev/null || echo "（取得失敗）")

log_info "本番 FQDN: https://${PROD_FQDN}"
log_info "開発 FQDN: https://${DEV_FQDN}"

# ===========================================================================
# ステップ 4: サービスプリンシパルの作成
# ドキュメント: AZURE_CONTAINER_APPS_SETUP.md セクション 5
# ===========================================================================
SP_NAME="sp-pokenae-github-actions"
log_info "ステップ 4: サービスプリンシパル '${SP_NAME}' を作成..."

# 既存の SP を確認
EXISTING_SP=$(az ad sp list --display-name "${SP_NAME}" --query "[0].appId" --output tsv 2>/dev/null || echo "")

if [ -n "${EXISTING_SP}" ]; then
  log_warn "サービスプリンシパル '${SP_NAME}' は既に存在します (AppId: ${EXISTING_SP})。"
  log_warn "認証情報を再生成するには、Azure Portal またはコマンドで手動で行ってください。"
  SP_JSON=""
else
  SP_JSON=$(az ad sp create-for-rbac \
    --name "${SP_NAME}" \
    --role contributor \
    --scopes "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}" \
    --sdk-auth)

  log_success "サービスプリンシパルを作成しました。"
  echo ""
  log_warn "=== 以下の JSON を GitHub Secrets の AZURE_CREDENTIALS に登録してください ==="
  echo "${SP_JSON}"
  echo ""
  log_warn "=============================================================================="
fi

# ===========================================================================
# ステップ 5: GitHub リポジトリへのシークレット・変数登録
# ドキュメント: AZURE_CONTAINER_APPS_SETUP.md セクション 6
# ===========================================================================
log_info "ステップ 5: GitHub シークレット・変数の登録..."

if command -v gh > /dev/null 2>&1; then
  log_info "GitHub CLI が見つかりました。シークレット・変数を登録しますか？"
  read -rp "GitHub に登録する？ (y/N): " gh_confirm

  if [[ "${gh_confirm}" =~ ^[Yy]$ ]]; then
    # Variables（公開情報）
    gh variable set AZURE_RESOURCE_GROUP --body "${RESOURCE_GROUP}" 2>/dev/null && \
      log_success "Variable AZURE_RESOURCE_GROUP を設定" || \
      log_warn "Variable AZURE_RESOURCE_GROUP の設定に失敗（既に存在する可能性あり）"

    if [ -n "${PROD_FQDN}" ] && [ "${PROD_FQDN}" != "（取得失敗）" ]; then
      gh variable set PROD_NEXTAUTH_URL_ACA --body "https://${PROD_FQDN}" 2>/dev/null && \
        log_success "Variable PROD_NEXTAUTH_URL_ACA を設定" || \
        log_warn "Variable PROD_NEXTAUTH_URL_ACA の設定に失敗"
    fi

    if [ -n "${DEV_FQDN}" ] && [ "${DEV_FQDN}" != "（取得失敗）" ]; then
      gh variable set DEV_NEXTAUTH_URL_ACA --body "https://${DEV_FQDN}" 2>/dev/null && \
        log_success "Variable DEV_NEXTAUTH_URL_ACA を設定" || \
        log_warn "Variable DEV_NEXTAUTH_URL_ACA の設定に失敗"
    fi

    # Secrets（機密情報 — SP JSON がある場合のみ）
    if [ -n "${SP_JSON}" ]; then
      echo "${SP_JSON}" | gh secret set AZURE_CREDENTIALS 2>/dev/null && \
        log_success "Secret AZURE_CREDENTIALS を設定" || \
        log_warn "Secret AZURE_CREDENTIALS の設定に失敗"
    fi

    log_info "GHCR_USERNAME と GHCR_PASSWORD は手動で登録してください。"
    log_info "  gh secret set GHCR_USERNAME"
    log_info "  gh secret set GHCR_PASSWORD"
  fi
else
  log_warn "GitHub CLI (gh) が見つかりません。シークレット・変数は手動で登録してください。"
  log_info "インストール: https://cli.github.com/"
fi

# ===========================================================================
# 完了サマリー
# ===========================================================================
echo ""
echo "============================================================"
log_success "Azure Container Apps 環境のセットアップが完了しました！"
echo "============================================================"
echo ""
log_info "リソースグループ:       ${RESOURCE_GROUP}"
log_info "Container Apps 環境:    ${ENVIRONMENT_NAME}"
log_info "本番 Container App:     ${APP_NAME_PROD}"
log_info "  URL: https://${PROD_FQDN}"
log_info "開発 Container App:     ${APP_NAME_DEV}"
log_info "  URL: https://${DEV_FQDN}"
log_info "サービスプリンシパル:   ${SP_NAME}"
echo ""
log_info "=== 次のステップ ==="
log_info "1. GitHub Secrets に以下を登録:"
log_info "   - AZURE_CREDENTIALS（サービスプリンシパル JSON）"
log_info "   - GHCR_USERNAME / GHCR_PASSWORD"
log_info "2. Google Cloud Console でリダイレクト URI を追加:"
log_info "   - https://${PROD_FQDN}/api/auth/callback/google"
log_info "   - https://${DEV_FQDN}/api/auth/callback/google"
log_info "3. main / develop ブランチに push してデプロイを確認"
echo ""
