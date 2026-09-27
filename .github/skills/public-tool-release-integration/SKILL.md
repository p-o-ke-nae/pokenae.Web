# Public Tool Release Integration

公開ツールをpokenae.comへ安全に掲載するための手順。

1. `pokenae.Content/content/tools` にschema準拠metadataを追加する。
2. Windowsアプリは同一GitHub Releaseへ `manifest.json`、manifest記載名のMSI、`<msi>.sha256` を添付する。
3. manifestのSemVer、tag、product、architecture、minimumWindowsVersion、installer filename、SHA-256、publishedAt、releaseUrlを一致させる。
4. Web側はschema、Release tag/URL、同一Release内asset、SHAファイル値をすべて検証できた場合だけCTAを表示する。失敗時にURLを推測しない。
5. ライブラリはMSIを表示せず、NuGet、README、docs、consumer skillへ案内する。
6. 未署名MSIは明記する。GitHub App秘密鍵やtokenはサーバーsecretのみで扱い、`NEXT_PUBLIC_*`へ置かない。
