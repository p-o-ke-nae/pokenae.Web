# API サーバー CORS 設定ガイド

## 概要

開発環境でフロントエンド（Next.js）から API サーバー（ASP.NET Core）へのリクエストで CORS エラーが発生する場合の対応方法です。

## CORS エラーの原因

- フロントエンド: `http://localhost:3000` または `http://localhost:3001`
- API サーバー: `https://localhost:7077` （デフォルト）または `http://localhost:7077`

異なるオリジン間でのリクエストのため、ブラウザの CORS ポリシーによってブロックされます。

## ASP.NET Core での CORS 設定

### 1. パッケージの追加（必要に応じて）

```bash
dotnet add package Microsoft.AspNetCore.Cors
```

### 2. Program.cs または Startup.cs での設定

#### Program.cs（.NET 6 以降）

```csharp
var builder = WebApplication.CreateBuilder(args);

// CORS ポリシーの追加
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:3000",  // Next.js デフォルトポート
            "http://localhost:3001",  // カスタムポート
            "https://localhost:3000",
            "https://localhost:3001"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials(); // 必要に応じて
    });

    // 開発環境用（すべてのオリジンを許可）
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();

var app = builder.Build();

// 開発環境でのCORS設定
if (app.Environment.IsDevelopment())
{
    app.UseCors("AllowAll");
}
else
{
    app.UseCors("AllowFrontend");
}

app.UseRouting();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

#### Startup.cs（.NET 5 以前）

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:3001",
                "https://localhost:3000",
                "https://localhost:3001"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
        });

        options.AddPolicy("AllowAll", policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });

    services.AddControllers();
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    if (env.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
        app.UseCors("AllowAll");
    }
    else
    {
        app.UseCors("AllowFrontend");
    }

    app.UseRouting();
    app.UseAuthorization();
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
    });
}
```

### 3. コントローラーレベルでの設定（オプション）

```csharp
[ApiController]
[Route("api/[controller]")]
[EnableCors("AllowFrontend")]
public class CollectionTableController : ControllerBase
{
    // ...
}
```

## フロントエンド側の対応

### 1. 環境変数の設定

```bash
# .env.local（デフォルトはHTTPS）
NEXT_PUBLIC_API_BASE_URL=https://localhost:7077

# CORS問題がある場合はHTTPに変更
# NEXT_PUBLIC_API_BASE_URL=http://localhost:7077
```

### 2. HTTPS と HTTP の使い分け

- **HTTPS（推奨）**: API サーバーで CORS 設定と SSL 証明書が適切に設定されている場合
- **HTTP**: 開発環境で CORS 問題や SSL 証明書エラーを回避したい場合

## 検証方法

### 1. ブラウザでの直接アクセス

```
# HTTPS（デフォルト）
https://localhost:7077/api/CollectionTable

# HTTP（CORS回避用）
http://localhost:7077/api/CollectionTable
```

### 2. API テストページでの確認

```
http://localhost:3000/api-test
```

### 3. 開発者ツールでの確認

1. ブラウザの開発者ツールを開く
2. Network タブでリクエストを確認
3. CORS エラーがなくなっていることを確認

## トラブルシューティング

### よくある問題

1. **ポート番号の不一致**: API サーバーとフロントエンドのポート番号を確認
2. **HTTP と HTTPS の混在**: 両方とも HTTP または両方とも HTTPS に統一
3. **AllowCredentials**: 認証が必要な場合は適切に設定

### 設定確認のコマンド

```bash
# APIサーバーの起動確認
netstat -an | findstr 7077

# フロントエンドの起動確認
netstat -an | findstr 3000
```

## セキュリティ注意事項

- 本番環境では `AllowAnyOrigin()` は使用しない
- 必要最小限のオリジンのみを許可する
- 認証が必要な場合は適切な CORS 設定を行う

## 参考リンク

- [ASP.NET Core での CORS (Cross-Origin Requests) の有効化](https://docs.microsoft.com/ja-jp/aspnet/core/security/cors)
- [MDN - CORS](https://developer.mozilla.org/ja/docs/Web/HTTP/CORS)
