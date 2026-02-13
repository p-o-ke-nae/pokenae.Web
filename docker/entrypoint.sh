#!/bin/sh
# Docker Compose secrets を環境変数に展開するエントリポイントスクリプト
# /run/secrets/ 配下のファイルを読み取り、ファイル名を大文字に変換して環境変数に設定する
#
# マッピング:
#   /run/secrets/nextauth_secret      → NEXTAUTH_SECRET
#   /run/secrets/google_client_id     → GOOGLE_CLIENT_ID
#   /run/secrets/google_client_secret → GOOGLE_CLIENT_SECRET

set -e

# /run/secrets/ ディレクトリが存在する場合のみ処理
if [ -d /run/secrets ]; then
  for secret_file in /run/secrets/*; do
    if [ -f "$secret_file" ]; then
      # ファイル名を取得し大文字に変換
      secret_name=$(basename "$secret_file" | tr '[:lower:]' '[:upper:]')
      # ファイル内容を読み取り（末尾の改行をtrim）
      secret_value=$(tr -d '\n\r' < "$secret_file")
      # 環境変数に設定
      export "$secret_name"="$secret_value"
    fi
  done
fi

# 渡されたコマンドを実行
exec "$@"
