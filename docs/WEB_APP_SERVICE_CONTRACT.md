# Webアプリサービス契約

ブラウザは独立APIへ直接接続せず、`/api/services/[service]/...` を利用します。Route HandlerはNextAuthセッションのGoogleアクセストークンを `Authorization: Bearer` と `X-Google-Access-Token` に付与する既存契約を維持します。

新規Webアプリ追加時:

1. `API_SERVICES` と `API_SERVICE_<NAME>_BASE_URL` を設定する。
2. backendに `GET /capabilities`（`version`, `capabilities[]`）を実装する。
3. `lib/config/service-contracts.ts` に対応SemVer範囲と必須capabilityを追加する。
4. `/api/services/<service>/compatibility` が200になることを確認する。
5. Navigationまたは`/apps`へ導線を追加し、停止・非互換・401を別表示する。
6. OpenAPIのbreaking change検査をbackend CIで実行し、契約範囲外を同時デプロイしない。
