# Google認証の後実装について

このドキュメントでは、現在実装されているGoogle OAuth2認証について、今後フロントエンドプロジェクトとバックエンドプロジェクトでそれぞれ必要な対応事項を詳細に解説します。

## 目次

1. [現在の実装状況](#現在の実装状況)
2. [フロントエンド側の今後の対応](#フロントエンド側の今後の対応)
3. [バックエンド側の今後の対応](#バックエンド側の今後の対応)
4. [統合とテスト](#統合とテスト)
5. [セキュリティ考慮事項](#セキュリティ考慮事項)
6. [運用とモニタリング](#運用とモニタリング)

---

## 現在の実装状況

### フロントエンド（pokenae.Web）

現在、以下の機能が実装されています：

#### ✅ 実装済み機能

1. **NextAuth.jsによるGoogle OAuth2認証**
   - 設定ファイル: `lib/auth/auth-options.ts`
   - APIルート: `app/api/auth/[...nextauth]/route.ts`
   - JWTベースのセッション管理

2. **認証UIコンポーネント**
   - `AuthBadge`: ログイン/ログアウトボタン、ユーザー情報表示
   - `NavigationBar`: 認証状態を表示するナビゲーションバー
   - `EnvironmentBadge`: 開発環境表示

3. **アクセストークンとリフレッシュトークンの取得**
   - 初回認証時にGoogle APIのアクセストークンを取得
   - リフレッシュトークンの保存（`access_type: 'offline'`対応）
   - セッション内でのトークン保持

4. **Google APIスコープ**
   - `openid`, `email`, `profile`: 基本情報取得
   - `https://www.googleapis.com/auth/spreadsheets`: スプレッドシート読み書き
   - `https://www.googleapis.com/auth/drive.file`: Driveファイルアクセス

5. **APIクライアント基盤**
   - `FrontendApiClient`: 自動的にアクセストークンをヘッダーに追加
   - 複数バックエンドサービスへの統一的なアクセス

#### ⚠️ 未実装の課題

1. **アクセストークンの自動更新**
   - トークン有効期限（通常1時間）の管理
   - リフレッシュトークンを使用した自動更新機能

2. **エラーハンドリング**
   - トークン期限切れエラーの適切な処理
   - 認証エラー時のユーザーへのフィードバック

3. **認証状態の永続化**
   - ページリロード時のセッション復元
   - タブ間でのセッション同期

---

## フロントエンド側の今後の対応

### 1. アクセストークンの自動更新機能の実装

#### 優先度: 🔴 高（必須）

アクセストークンは通常1時間で期限切れになります。リフレッシュトークンを使用して自動的に更新する機能が必要です。

#### 実装方法

**a. トークンリフレッシュ関数の追加**

`lib/auth/auth-options.ts`に以下の機能を追加：

```typescript
/**
 * アクセストークンをリフレッシュする関数
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    // Google OAuth2のトークンエンドポイント
    const url = "https://oauth2.googleapis.com/token";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // リフレッシュトークンは通常返されないため、既存のものを保持
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
```

**b. JWTコールバックの更新**

`lib/auth/auth-options.ts`の`jwt`コールバックを更新：

```typescript
async jwt({ token, account, user }) {
  // 初回サインイン時
  if (account && user) {
    return {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      accessTokenExpires: account.expires_at! * 1000, // ミリ秒に変換
      user,
    };
  }

  // トークンがまだ有効な場合はそのまま返す
  if (Date.now() < (token.accessTokenExpires as number)) {
    return token;
  }

  // トークンの有効期限が切れている場合は更新
  return refreshAccessToken(token);
}
```

**c. セッションコールバックの更新**

エラーをクライアントに伝達できるようにする：

```typescript
async session({ session, token }) {
  session.accessToken = token.accessToken as string;
  session.refreshToken = token.refreshToken as string;
  session.error = token.error as string | undefined;
  session.user = token.user as any;
  return session;
}
```

**d. クライアント側でのエラーハンドリング**

セッションのエラーを検知し、再ログインを促す：

```typescript
// 例: app/layout.tsx や共通コンポーネント
'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { signIn } from 'next-auth/react';

export function SessionErrorHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      // トークンのリフレッシュに失敗した場合、再ログインを促す
      signIn('google');
    }
  }, [session]);

  return null;
}
```

#### テスト方法

1. ログイン後、1時間待つ（または手動でトークンの有効期限を短くする）
2. APIリクエストを実行
3. 自動的にトークンが更新され、リクエストが成功することを確認

---

### 2. エラーハンドリングの強化

#### 優先度: 🟡 中（推奨）

#### 必要な改善点

**a. 認証エラーの統一的な処理**

新しいファイル `lib/auth/auth-error-handler.ts` を作成：

```typescript
/**
 * 認証エラーの種類
 */
export enum AuthErrorType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 認証エラーのメッセージ取得
 */
export function getAuthErrorMessage(errorType: AuthErrorType): string {
  const messages: Record<AuthErrorType, string> = {
    [AuthErrorType.TOKEN_EXPIRED]: 'セッションの有効期限が切れました。再度ログインしてください。',
    [AuthErrorType.TOKEN_REFRESH_FAILED]: 'セッションの更新に失敗しました。再度ログインしてください。',
    [AuthErrorType.UNAUTHORIZED]: '認証に失敗しました。ログインしてください。',
    [AuthErrorType.NETWORK_ERROR]: 'ネットワークエラーが発生しました。',
    [AuthErrorType.UNKNOWN]: '予期しないエラーが発生しました。',
  };
  
  return messages[errorType];
}

/**
 * HTTPステータスコードから認証エラータイプを判定
 */
export function getAuthErrorTypeFromStatus(status: number): AuthErrorType {
  switch (status) {
    case 401:
      return AuthErrorType.UNAUTHORIZED;
    case 403:
      return AuthErrorType.TOKEN_EXPIRED;
    default:
      return AuthErrorType.UNKNOWN;
  }
}
```

**b. APIクライアントでのエラーハンドリング**

`lib/api/frontend-client.ts`を更新し、認証エラーを適切に処理：

```typescript
// リクエスト実行部分に以下を追加

if (response.status === 401 || response.status === 403) {
  // 認証エラーの場合、イベントを発行
  window.dispatchEvent(new CustomEvent('auth:error', {
    detail: {
      type: getAuthErrorTypeFromStatus(response.status),
      message: getAuthErrorMessage(getAuthErrorTypeFromStatus(response.status)),
    }
  }));
}
```

**c. グローバルなエラー通知コンポーネント**

`components/providers/AuthErrorProvider.tsx`を作成：

```typescript
'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

export function AuthErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      setError(event.detail.message);
      
      // 3秒後に自動でログインページへ
      setTimeout(() => {
        signIn('google');
      }, 3000);
    };

    window.addEventListener('auth:error', handleAuthError as EventListener);
    
    return () => {
      window.removeEventListener('auth:error', handleAuthError as EventListener);
    };
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg max-w-md">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            認証エラー
          </h3>
          <p className="text-zinc-700 dark:text-zinc-300 mb-4">
            {error}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            3秒後に自動的にログインページへ移動します...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

### 3. ユーザー体験の改善

#### 優先度: 🟢 低（任意）

#### a. ローディング状態の改善

認証処理中のローディング表示を改善：

```typescript
// components/organisms/NavigationBar/index.tsx を更新

const { data: session, status } = useSession();

if (status === 'loading') {
  return (
    <nav className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              pokenae
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-zinc-300 dark:bg-zinc-700 h-8 w-32 rounded"></div>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

#### b. セッション復元の最適化

`app/layout.tsx`でセッション状態を管理：

```typescript
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <SessionProvider
          // セッションを5分ごとにリフレッシュ
          refetchInterval={5 * 60}
          // ウィンドウがフォーカスされた時にセッションをリフレッシュ
          refetchOnWindowFocus={true}
        >
          <AuthErrorProvider>
            {children}
          </AuthErrorProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

### 4. 型定義の拡張

#### 優先度: 🟡 中（推奨）

`lib/auth/next-auth.d.ts`を更新してエラー情報を含める：

```typescript
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string; // 追加
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string; // 追加
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

---

## バックエンド側の今後の対応

### 1. Google認証トークンの受信と検証

#### 優先度: 🔴 高（必須）

バックエンドAPIでは、フロントエンドから送信されたGoogle認証トークンを受け取り、検証する必要があります。

#### 実装方法（例: ASP.NET Core / Python FastAPI）

**a. ASP.NET Coreの場合**

ミドルウェアまたはフィルターでトークンを検証：

```csharp
// GoogleAuthMiddleware.cs
public class GoogleAuthMiddleware
{
    private readonly RequestDelegate _next;

    public GoogleAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // X-Google-Access-Token ヘッダーからトークンを取得
        var accessToken = context.Request.Headers["X-Google-Access-Token"].FirstOrDefault();

        if (string.IsNullOrEmpty(accessToken))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "認証トークンが必要です" });
            return;
        }

        // トークンの検証
        var isValid = await ValidateGoogleToken(accessToken);
        if (!isValid)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "無効な認証トークンです" });
            return;
        }

        // コンテキストにトークンを保存
        context.Items["GoogleAccessToken"] = accessToken;

        await _next(context);
    }

    private async Task<bool> ValidateGoogleToken(string accessToken)
    {
        // Googleのトークン情報エンドポイントで検証
        using var httpClient = new HttpClient();
        var response = await httpClient.GetAsync($"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={accessToken}");
        
        if (!response.IsSuccessStatusCode)
        {
            return false;
        }

        var tokenInfo = await response.Content.ReadFromJsonAsync<GoogleTokenInfo>();
        
        // トークンの発行元と対象を確認
        return tokenInfo?.Audience == Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
    }
}

public class GoogleTokenInfo
{
    public string Audience { get; set; }
    public string UserId { get; set; }
    public int ExpiresIn { get; set; }
}
```

**b. Python FastAPIの場合**

依存性注入でトークンを検証：

```python
# auth.py
from fastapi import Header, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests
import os

async def get_google_token(
    x_google_access_token: str = Header(None)
) -> str:
    """
    Google認証トークンを検証
    """
    if not x_google_access_token:
        raise HTTPException(status_code=401, detail="認証トークンが必要です")
    
    try:
        # トークンの検証
        idinfo = id_token.verify_oauth2_token(
            x_google_access_token,
            requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID")
        )
        
        return x_google_access_token
    except ValueError:
        raise HTTPException(status_code=401, detail="無効な認証トークンです")

# エンドポイントでの使用例
from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/api/protected-endpoint")
async def protected_endpoint(
    google_token: str = Depends(get_google_token)
):
    # トークンが検証済みの状態でエンドポイント処理
    return {"message": "認証成功"}
```

---

### 2. Google API（Sheets/Drive）の統合

#### 優先度: 🟡 中（推奨）

バックエンドでGoogle Sheets APIやGoogle Drive APIを使用する実装。

#### 実装方法

**a. ASP.NET Coreの場合**

```csharp
// GoogleSheetsService.cs
using Google.Apis.Sheets.v4;
using Google.Apis.Auth.OAuth2;

public class GoogleSheetsService
{
    private readonly IHttpContextAccessor _contextAccessor;

    public GoogleSheetsService(IHttpContextAccessor contextAccessor)
    {
        _contextAccessor = contextAccessor;
    }

    public async Task<IList<IList<object>>> GetSpreadsheetData(
        string spreadsheetId,
        string range
    )
    {
        // リクエストコンテキストからトークンを取得
        var accessToken = _contextAccessor.HttpContext?.Items["GoogleAccessToken"] as string;
        
        if (string.IsNullOrEmpty(accessToken))
        {
            throw new UnauthorizedAccessException("認証トークンが見つかりません");
        }

        // Google Sheets APIクライアントを作成
        var credential = GoogleCredential.FromAccessToken(accessToken);
        var service = new SheetsService(new Google.Apis.Services.BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "pokenae-backend"
        });

        // スプレッドシートのデータを取得
        var request = service.Spreadsheets.Values.Get(spreadsheetId, range);
        var response = await request.ExecuteAsync();

        return response.Values;
    }

    public async Task UpdateSpreadsheetData(
        string spreadsheetId,
        string range,
        IList<IList<object>> values
    )
    {
        var accessToken = _contextAccessor.HttpContext?.Items["GoogleAccessToken"] as string;
        
        if (string.IsNullOrEmpty(accessToken))
        {
            throw new UnauthorizedAccessException("認証トークンが見つかりません");
        }

        var credential = GoogleCredential.FromAccessToken(accessToken);
        var service = new SheetsService(new Google.Apis.Services.BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "pokenae-backend"
        });

        var valueRange = new Google.Apis.Sheets.v4.Data.ValueRange
        {
            Values = values
        };

        var request = service.Spreadsheets.Values.Update(valueRange, spreadsheetId, range);
        request.ValueInputOption = SpreadsheetsResource.ValuesResource.UpdateRequest.ValueInputOptionEnum.USERENTERED;

        await request.ExecuteAsync();
    }
}
```

**b. Python FastAPIの場合**

```python
# google_sheets_service.py
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from fastapi import HTTPException

class GoogleSheetsService:
    def __init__(self, access_token: str):
        """
        Google Sheets APIサービスを初期化
        """
        credentials = Credentials(token=access_token)
        self.service = build('sheets', 'v4', credentials=credentials)
    
    async def get_spreadsheet_data(
        self,
        spreadsheet_id: str,
        range_name: str
    ):
        """
        スプレッドシートのデータを取得
        """
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            return result.get('values', [])
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"スプレッドシートの取得に失敗しました: {str(e)}"
            )
    
    async def update_spreadsheet_data(
        self,
        spreadsheet_id: str,
        range_name: str,
        values: list
    ):
        """
        スプレッドシートのデータを更新
        """
        try:
            body = {'values': values}
            result = self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            return result
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"スプレッドシートの更新に失敗しました: {str(e)}"
            )

# エンドポイントでの使用例
@router.get("/api/spreadsheet/{spreadsheet_id}")
async def get_spreadsheet(
    spreadsheet_id: str,
    range_name: str = "Sheet1!A1:Z100",
    google_token: str = Depends(get_google_token)
):
    service = GoogleSheetsService(google_token)
    data = await service.get_spreadsheet_data(spreadsheet_id, range_name)
    return {"data": data}
```

---

### 3. ユーザー情報の管理

#### 優先度: 🟡 中（推奨）

バックエンドでユーザー情報を管理し、データベースに保存する実装。

#### データベーススキーマ例

```sql
-- PostgreSQL / MySQL
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    google_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    profile_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_google_user_id ON users(google_user_id);
CREATE INDEX idx_users_email ON users(email);
```

#### 実装例（Python FastAPI + SQLAlchemy）

```python
# models.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    google_user_id = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), nullable=False)
    name = Column(String(255))
    profile_image_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))

# user_service.py
from sqlalchemy.orm import Session
from datetime import datetime

class UserService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_or_create_user(
        self,
        google_user_id: str,
        email: str,
        name: str = None,
        profile_image_url: str = None
    ) -> User:
        """
        ユーザーを取得または作成
        """
        user = self.db.query(User).filter(
            User.google_user_id == google_user_id
        ).first()
        
        if user:
            # 既存ユーザーの場合、最終ログイン日時を更新
            user.last_login_at = datetime.utcnow()
            user.name = name or user.name
            user.profile_image_url = profile_image_url or user.profile_image_url
        else:
            # 新規ユーザーの場合、作成
            user = User(
                google_user_id=google_user_id,
                email=email,
                name=name,
                profile_image_url=profile_image_url,
                last_login_at=datetime.utcnow()
            )
            self.db.add(user)
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
```

---

### 4. アクセス制御とパーミッション管理

#### 優先度: 🟢 低（任意）

ユーザーごとのアクセス権限を管理する実装。

#### データベーススキーマ例

```sql
-- ロール（役割）テーブル
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- ユーザーロール関連テーブル
CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- パーミッション（権限）テーブル
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- ロールパーミッション関連テーブル
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 初期データの挿入
INSERT INTO roles (name, description) VALUES
    ('admin', '管理者'),
    ('editor', '編集者'),
    ('viewer', '閲覧者');

INSERT INTO permissions (name, description) VALUES
    ('read:spreadsheet', 'スプレッドシート閲覧'),
    ('write:spreadsheet', 'スプレッドシート編集'),
    ('delete:spreadsheet', 'スプレッドシート削除'),
    ('manage:users', 'ユーザー管理');
```

#### 実装例（デコレータでの権限チェック）

```python
# auth_decorators.py
from functools import wraps
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session

def require_permission(permission_name: str):
    """
    指定された権限を持つユーザーのみアクセスを許可するデコレータ
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # ユーザー情報とDBセッションを取得
            google_token = kwargs.get('google_token')
            db = kwargs.get('db')
            
            if not google_token or not db:
                raise HTTPException(
                    status_code=401,
                    detail="認証が必要です"
                )
            
            # トークンからユーザー情報を取得
            user = get_user_from_token(google_token, db)
            
            # ユーザーの権限をチェック
            if not user_has_permission(user, permission_name, db):
                raise HTTPException(
                    status_code=403,
                    detail=f"権限が不足しています: {permission_name}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# エンドポイントでの使用例
@router.post("/api/spreadsheet/{spreadsheet_id}")
@require_permission("write:spreadsheet")
async def update_spreadsheet(
    spreadsheet_id: str,
    data: dict,
    google_token: str = Depends(get_google_token),
    db: Session = Depends(get_db)
):
    # 権限チェック済みの状態でエンドポイント処理
    return {"message": "スプレッドシートを更新しました"}
```

---

### 5. レート制限とクォータ管理

#### 優先度: 🟡 中（推奨）

Google APIには使用量制限があるため、レート制限を実装することを推奨します。

#### 実装例（Redis使用）

```python
# rate_limiter.py
import redis
from fastapi import HTTPException
from datetime import datetime, timedelta

class RateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def check_rate_limit(
        self,
        user_id: str,
        max_requests: int = 100,
        window_seconds: int = 60
    ):
        """
        レート制限をチェック
        """
        key = f"rate_limit:{user_id}:{datetime.now().strftime('%Y%m%d%H%M')}"
        
        current = self.redis.get(key)
        
        if current and int(current) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"リクエスト制限に達しました。{window_seconds}秒後に再試行してください。"
            )
        
        # カウントをインクリメント
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        pipe.execute()

# ミドルウェアでの使用
from fastapi import Request

async def rate_limit_middleware(request: Request, call_next):
    user_id = request.state.user_id  # 認証済みユーザーID
    
    rate_limiter = RateLimiter(redis_client)
    rate_limiter.check_rate_limit(user_id)
    
    response = await call_next(request)
    return response
```

---

## 統合とテスト

### 1. エンドツーエンドテスト

#### テストシナリオ

1. **ログインフロー**
   - ユーザーがGoogleでログイン
   - トークンが正しく保存される
   - セッションが作成される

2. **API呼び出し**
   - 認証済みユーザーがバックエンドAPIを呼び出す
   - アクセストークンが正しくヘッダーに含まれる
   - バックエンドがトークンを検証し、レスポンスを返す

3. **トークンリフレッシュ**
   - アクセストークンの有効期限が切れる
   - 自動的にトークンが更新される
   - API呼び出しが継続して成功する

4. **エラーハンドリング**
   - トークンが無効な場合、適切なエラーが返される
   - ユーザーに再ログインが促される

#### テストコード例（Frontend）

```typescript
// __tests__/auth/google-auth.test.ts
import { signIn, signOut, useSession } from 'next-auth/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Google Authentication', () => {
  test('ユーザーがログインできる', async () => {
    render(<AuthBadge isAuthenticated={false} />);
    
    const loginButton = screen.getByText('Googleでログイン');
    await userEvent.click(loginButton);
    
    // モックされたsignInが呼ばれることを確認
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
  });

  test('ログイン後にユーザー情報が表示される', async () => {
    const mockSession = {
      user: { name: 'Test User', email: 'test@example.com' },
      accessToken: 'mock-token',
    };
    
    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
    
    render(<AuthBadge isAuthenticated={true} userName="Test User" userEmail="test@example.com" />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
```

---

### 2. 統合テスト（Frontend + Backend）

#### テスト環境のセットアップ

```bash
# docker-compose.test.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "5000:5000"
    environment:
      - NEXTAUTH_URL=http://localhost:5000
      - NEXT_PUBLIC_API_BASE_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=testdb
      - POSTGRES_USER=test
      - POSTGRES_PASSWORD=test

  redis:
    image: redis:7
```

---

## セキュリティ考慮事項

### 1. トークンの保護

#### 🔴 必須対応

**a. HTTPS の使用**
- 本番環境では必ずHTTPSを使用
- すべてのAPIエンドポイントをHTTPS経由でのみアクセス可能にする

**b. トークンの保存**
- アクセストークンはメモリまたはHTTPOnlyクッキーにのみ保存
- LocalStorageやSessionStorageには保存しない（XSS攻撃のリスク）

**c. トークンの送信**
- カスタムヘッダー（`X-Google-Access-Token`）で送信
- URLパラメータには含めない

#### 実装例

```typescript
// lib/api/frontend-client.ts で既に実装済み
headers: {
  'X-Google-Access-Token': session?.accessToken || '',
  // ✅ Good: カスタムヘッダー
}

// ❌ Bad: URLパラメータは使用しない
const url = `/api/data?token=${accessToken}`;
```

---

### 2. CSRF（Cross-Site Request Forgery）対策

#### 🟡 推奨対応

NextAuth.jsはデフォルトでCSRFトークンを使用していますが、カスタムAPIエンドポイントでも対策が必要です。

#### 実装方法

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // POST, PUT, DELETE リクエストの場合、CSRFトークンをチェック
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const csrfToken = request.headers.get('X-CSRF-Token');
    const cookieToken = request.cookies.get('csrf-token')?.value;
    
    if (!csrfToken || csrfToken !== cookieToken) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

---

### 3. XSS（Cross-Site Scripting）対策

#### 🔴 必須対応

**a. 入力のサニタイゼーション**
- ユーザー入力は常にサニタイズ
- HTMLタグは適切にエスケープ

**b. Content Security Policy（CSP）の設定**

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://accounts.google.com https://www.googleapis.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};
```

---

### 4. ログとモニタリング

#### 🟡 推奨対応

セキュリティイベントをログに記録し、異常なアクティビティを検知します。

#### 実装例

```typescript
// lib/logging/security-logger.ts
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REFRESH_FAILURE = 'TOKEN_REFRESH_FAILURE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export class SecurityLogger {
  static log(event: SecurityEvent) {
    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // 例: DataDog, Sentry, CloudWatch Logs など
      console.log(JSON.stringify(event));
    } else {
      console.log('[Security Event]', event);
    }
  }
  
  static logLoginSuccess(userId: string, ipAddress: string) {
    this.log({
      type: SecurityEventType.LOGIN_SUCCESS,
      userId,
      ipAddress,
      timestamp: new Date(),
    });
  }
  
  static logUnauthorizedAccess(ipAddress: string, path: string) {
    this.log({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      ipAddress,
      timestamp: new Date(),
      details: { path },
    });
  }
}
```

---

## 運用とモニタリング

### 1. ヘルスチェックエンドポイント

#### フロントエンド

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'operational',
      api: 'operational',
    },
  });
}
```

#### バックエンド

```python
# health.py
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": check_database_connection(),
            "redis": check_redis_connection(),
            "google_api": check_google_api_connection(),
        }
    }
```

---

### 2. メトリクスの収集

#### 監視すべき指標

1. **認証関連**
   - ログイン成功率
   - ログイン失敗回数
   - トークンリフレッシュ成功率
   - セッション期間

2. **API関連**
   - リクエスト数（エンドポイント別）
   - レスポンスタイム
   - エラー率
   - Google APIクォータ使用量

3. **システム関連**
   - サーバーレスポンスタイム
   - メモリ使用量
   - CPU使用率

#### 実装例（Prometheus形式）

```typescript
// lib/metrics/prometheus.ts
import { Counter, Histogram, register } from 'prom-client';

export const loginCounter = new Counter({
  name: 'pokenae_login_total',
  help: 'Total number of login attempts',
  labelNames: ['status'], // 'success' or 'failure'
});

export const apiRequestDuration = new Histogram({
  name: 'pokenae_api_request_duration_seconds',
  help: 'Duration of API requests in seconds',
  labelNames: ['method', 'endpoint', 'status'],
});

// メトリクスエンドポイント
// app/api/metrics/route.ts
export async function GET() {
  return new Response(await register.metrics(), {
    headers: {
      'Content-Type': register.contentType,
    },
  });
}
```

---

### 3. アラート設定

#### 推奨アラート

1. **認証エラー率が5%を超えた場合**
   - 重大度: 警告
   - アクション: ログを確認し、原因を調査

2. **トークンリフレッシュ失敗率が10%を超えた場合**
   - 重大度: エラー
   - アクション: Google OAuth2設定を確認

3. **APIエラー率が10%を超えた場合**
   - 重大度: エラー
   - アクション: バックエンドサービスの状態を確認

4. **Google APIクォータが80%を超えた場合**
   - 重大度: 警告
   - アクション: クォータ増加を申請、またはレート制限を強化

---

## まとめ

### フロントエンド側の優先タスク

1. 🔴 **高優先度（必須）**
   - アクセストークンの自動更新機能の実装
   - HTTPS の使用（本番環境）
   - トークンの安全な保存と送信

2. 🟡 **中優先度（推奨）**
   - エラーハンドリングの強化
   - 型定義の拡張
   - セキュリティログの実装

3. 🟢 **低優先度（任意）**
   - ユーザー体験の改善
   - メトリクス収集とモニタリング

### バックエンド側の優先タスク

1. 🔴 **高優先度（必須）**
   - Google認証トークンの受信と検証
   - HTTPS の使用（本番環境）
   - 基本的なエラーハンドリング

2. 🟡 **中優先度（推奨）**
   - Google API（Sheets/Drive）の統合
   - ユーザー情報の管理
   - レート制限とクォータ管理
   - セキュリティログの実装

3. 🟢 **低優先度（任意）**
   - アクセス制御とパーミッション管理
   - 高度なモニタリングとアラート

### 次のステップ

1. **Phase 1: 基本機能の完成（1-2週間）**
   - フロントエンド: トークン自動更新
   - バックエンド: トークン検証とGoogle API統合

2. **Phase 2: セキュリティ強化（1週間）**
   - HTTPS設定
   - エラーハンドリング改善
   - セキュリティログ実装

3. **Phase 3: 運用基盤の整備（1週間）**
   - モニタリング設定
   - アラート設定
   - ドキュメント整備

4. **Phase 4: 本番リリース**
   - 統合テスト
   - セキュリティ監査
   - 段階的なロールアウト

---

## 参考資料

### 公式ドキュメント
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Drive API Documentation](https://developers.google.com/drive/api)

### セキュリティ
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

### 内部ドキュメント
- [Google Auth Setup Guide](./GOOGLE_AUTH_SETUP.md)
- [Google OAuth2認証機能について](./GOOGLE_AUTH_SETUP_JA.md)
- [API Routing Guide](./API_ROUTING.md)
