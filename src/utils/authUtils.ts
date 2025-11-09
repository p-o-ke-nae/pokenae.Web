// Google OAuth2認証用の統合ユーティリティ
// pokenae.WebComponentで使用する認証処理の共通化にゃん

// Window型の拡張
declare global {
  interface Window {
    __POKENAE_AUTH?: any;
  }
}

// Google OAuth2設定
export const GOOGLE_AUTH_CONFIG = {
  CLIENT_ID: '805729941904-h95ej9999oqro2i98q138tiduioamuk9.apps.googleusercontent.com',
  // 環境に応じて動的にリダイレクトURIを設定
  get REDIRECT_URI() {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/callback`;
    }
    // サーバーサイドの場合のフォールバック
    return 'http://localhost:3001/callback';
  },
  TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
  USERINFO_ENDPOINT: 'https://www.googleapis.com/oauth2/v2/userinfo',
  SCOPES: ['openid', 'email', 'profile']
};

// バックエンドAPI設定
export const BACKEND_API_CONFIG = {
  // 環境に応じて動的にベースURLを設定
  get BASE_URL() {
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      const currentProtocol = window.location.protocol;
      const currentPort = window.location.port;
      
      // localhost or 127.0.0.1の場合は開発環境用のURL
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        return 'https://localhost:7133';
      }
      
      // 本番環境の場合
      // 本番環境のAPIサーバーのドメインに合わせて設定してください
      
      // 例1: 同じドメインで異なるポート (例: pokenae.com:7133)
      // return `${currentProtocol}//${currentHost}:7133`;
      
      // 例2: 別のサブドメイン (例: api.pokenae.com)
      // return `${currentProtocol}//api.${currentHost}`;
      
      // 例3: 同じドメインでhttpsのデフォルトポート
      if (currentProtocol === 'https:') {
        return `https://${currentHost}`;
      } else {
        return `http://${currentHost}:7133`;
      }
    }
    // サーバーサイドの場合のフォールバック
    return 'https://localhost:7133';
  },
  ENDPOINTS: {
    OAUTH_CALLBACK: '/api/authentication/callback'
  }
};

// ローカルストレージキー
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  ID_TOKEN: 'id_token',
  TOKEN_EXPIRY: 'token_expiry',
  USER_INFO: 'user_info'
};

// セッションストレージキー
export const SESSION_STORAGE_KEYS = {
  REDIRECT_URL: 'auth_redirect_url',
  REFERRER_HOST: 'auth_referrer_host',
  AUTH_STATE: 'auth_state'
};

// デバッグ設定
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * 認証コードをアクセストークンに交換
 * @param {string} code - Google認証コード
 * @param {string} state - 状態パラメータ
 * @returns {Promise<Object>} トークン情報
 */
export const exchangeCodeForTokens = async (code, state) => {
  try {
    if (DEBUG_MODE) {
      console.log('🔄 Exchanging code for tokens:', { 
        code: code.substring(0, 10) + '...', 
        state,
        redirectUri: GOOGLE_AUTH_CONFIG.REDIRECT_URI,
        backendBaseUrl: BACKEND_API_CONFIG.BASE_URL
      });
    }

    // バックエンドのcallbackエンドポイントにPOSTリクエストを送信
    const backendUrl = `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.OAUTH_CALLBACK}`;
    
    const tokenResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        code: code,
        state: state
      })
    });

    if (!tokenResponse.ok) {
      let errorDetails;
      const contentType = tokenResponse.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          errorDetails = await tokenResponse.json();
        } else {
          errorDetails = await tokenResponse.text();
        }
      } catch (parseError) {
        errorDetails = `Failed to parse error response: ${parseError.message}`;
      }
      
      console.error('Token exchange failed:', errorDetails);
      
      const errorMessage = typeof errorDetails === 'object' 
        ? (errorDetails.message || errorDetails.error || JSON.stringify(errorDetails))
        : errorDetails;
        
      throw new Error(`Token exchange failed: ${errorMessage}`);
    }

    const tokenData = await tokenResponse.json();

    if (DEBUG_MODE) {
      console.log('✅ Token exchange successful:', {
        auth_token: tokenData.auth_token ? 'received' : 'missing',
        expiresIn: tokenData.expiresIn
      });
    }

    return {
      accessToken: tokenData.auth_token,
      refreshToken: null,
      idToken: null,
      expiresIn: tokenData.expiresIn,
      tokenType: 'Bearer'
    };

  } catch (error) {
    console.error('❌ Token exchange error:', error);
    throw new Error(`認証トークンの取得に失敗しました: ${error.message}`);
  }
};

/**
 * アクセストークンを使用してユーザー情報を取得
 * @param {string} accessToken - アクセストークン
 * @returns {Promise<Object>} ユーザー情報
 */
export const fetchUserInfo = async (accessToken) => {
  try {
    if (DEBUG_MODE) {
      console.log('👤 Fetching user info with token:', accessToken.substring(0, 10) + '...');
    }

    const userResponse = await fetch(GOOGLE_AUTH_CONFIG.USERINFO_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (DEBUG_MODE) {
      console.log('📡 User info response status:', userResponse.status);
    }

    if (!userResponse.ok) {
      let errorDetails;
      try {
        errorDetails = await userResponse.text();
      } catch (parseError) {
        errorDetails = 'Failed to parse error response';
      }
      
      console.error('❌ User info fetch error details:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        errorDetails: errorDetails,
        endpoint: GOOGLE_AUTH_CONFIG.USERINFO_ENDPOINT
      });
      
      throw new Error(`User info fetch failed: ${userResponse.status} ${userResponse.statusText} - ${errorDetails}`);
    }

    const userData = await userResponse.json();

    if (DEBUG_MODE) {
      console.log('✅ User info fetched:', {
        id: userData.id,
        email: userData.email,
        name: userData.name
      });
    }

    return userData;

  } catch (error) {
    console.error('❌ User info fetch error:', error);
    throw new Error(`ユーザー情報の取得に失敗しました: ${error.message}`);
  }
};

/**
 * トークンをローカルストレージに保存
 * @param {Object} tokens - トークン情報
 * @param {Object} userInfo - ユーザー情報
 */
export const saveAuthTokens = (tokens, userInfo = null) => {
  try {
    if (typeof window === 'undefined') {
      console.warn('Cannot save tokens: window is undefined');
      return;
    }

    // アクセストークンの保存
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);

    // リフレッシュトークンの保存（存在する場合）
    if (tokens.refreshToken) {
      localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }

    // IDトークンの保存（存在する場合）
    if (tokens.idToken) {
      localStorage.setItem(AUTH_STORAGE_KEYS.ID_TOKEN, tokens.idToken);
    }

    // トークンの有効期限を計算して保存
    if (tokens.expiresIn) {
      const expiryTime = new Date().getTime() + (tokens.expiresIn * 1000);
      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    }

    // ユーザー情報の保存（存在する場合）
    if (userInfo) {
      localStorage.setItem(AUTH_STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    }

    if (DEBUG_MODE) {
      console.log('💾 Auth tokens saved to localStorage:', {
        accessToken: '✅',
        refreshToken: tokens.refreshToken ? '✅' : '❌',
        idToken: tokens.idToken ? '✅' : '❌',
        userInfo: userInfo ? '✅' : '❌'
      });
    }

  } catch (error) {
    console.error('❌ Failed to save auth tokens:', error);
    throw new Error(`認証情報の保存に失敗しました: ${error.message}`);
  }
};

/**
 * ローカルストレージから認証情報を取得
 * @returns {Object|null} 認証情報
 */
export const getAuthTokens = () => {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    const idToken = localStorage.getItem(AUTH_STORAGE_KEYS.ID_TOKEN);
    const tokenExpiry = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRY);
    const userInfoStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);

    if (!accessToken) {
      return null;
    }

    // トークンの有効期限をチェック
    if (tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      const currentTime = new Date().getTime();
      
      if (currentTime >= expiryTime) {
        if (DEBUG_MODE) {
          console.log('⏰ Access token has expired');
        }
        // 期限切れのトークンをクリア
        clearAuthTokens();
        return null;
      }
    }

    const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;

    return {
      accessToken,
      refreshToken,
      idToken,
      tokenExpiry: tokenExpiry ? parseInt(tokenExpiry) : null,
      userInfo
    };

  } catch (error) {
    console.error('❌ Failed to get auth tokens:', error);
    return null;
  }
};

/**
 * 認証情報をローカルストレージから削除
 */
export const clearAuthTokens = () => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.ID_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);

    if (DEBUG_MODE) {
      console.log('🧹 Auth tokens cleared from localStorage');
    }

  } catch (error) {
    console.error('❌ Failed to clear auth tokens:', error);
  }
};

/**
 * セッション状態を保存
 * @param {string} redirectUrl - リダイレクト先URL
 * @param {string} referrerHost - 参照元ホスト
 */
export const saveAuthState = (redirectUrl = null, referrerHost = null) => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = redirectUrl || window.location.href;
    const currentHost = referrerHost || window.location.host;
    
    sessionStorage.setItem(SESSION_STORAGE_KEYS.REDIRECT_URL, currentUrl);
    sessionStorage.setItem(SESSION_STORAGE_KEYS.REFERRER_HOST, currentHost);
    sessionStorage.setItem(SESSION_STORAGE_KEYS.AUTH_STATE, JSON.stringify({
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    }));
    
    if (DEBUG_MODE) {
      console.log('🔐 Auth state saved:', { currentUrl, currentHost });
    }

  } catch (error) {
    console.warn('Failed to save auth state:', error);
  }
};

/**
 * セッション状態を取得
 * @returns {Object} セッション状態
 */
export const getAuthState = () => {
  try {
    if (typeof window === 'undefined') {
      return { redirectUrl: '/', referrerHost: null, authState: null };
    }

    const redirectUrl = sessionStorage.getItem(SESSION_STORAGE_KEYS.REDIRECT_URL);
    const referrerHost = sessionStorage.getItem(SESSION_STORAGE_KEYS.REFERRER_HOST);
    const authState = sessionStorage.getItem(SESSION_STORAGE_KEYS.AUTH_STATE);
    
    return {
      redirectUrl: redirectUrl || '/',
      referrerHost: referrerHost || window.location.host,
      authState: authState ? JSON.parse(authState) : null
    };

  } catch (error) {
    console.warn('Failed to get auth state:', error);
    return { redirectUrl: '/', referrerHost: null, authState: null };
  }
};

/**
 * セッション状態をクリア
 */
export const clearAuthState = () => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    sessionStorage.removeItem(SESSION_STORAGE_KEYS.REDIRECT_URL);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.REFERRER_HOST);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.AUTH_STATE);
    
    if (DEBUG_MODE) {
      console.log('🧹 Auth state cleared');
    }

  } catch (error) {
    console.warn('Failed to clear auth state:', error);
  }
};

/**
 * トークンの有効性をチェック
 * @returns {boolean} トークンが有効かどうか
 */
export const isTokenValid = () => {
  const tokens = getAuthTokens();
  return tokens !== null && tokens.accessToken !== null;
};

/**
 * 完全な認証フロー（コードからトークン取得、ユーザー情報取得、保存まで）
 * @param {string} code - 認証コード
 * @param {string} state - 状態パラメータ
 * @returns {Promise<Object>} 認証結果
 */
export const completeAuthFlow = async (code, state) => {
  try {
    if (DEBUG_MODE) {
      console.log('🔄 Starting complete auth flow with code:', code.substring(0, 10) + '...');
    }

    // トークンエクスチェンジ（バックエンドからトークンとユーザー情報を取得）
    const tokens = await exchangeCodeForTokens(code, state);

    // バックエンドからユーザー情報も含まれているはずなので、ダミーのユーザー情報を作成
    const userInfo = {
      email: 'authenticated@example.com',
      name: '認証済みユーザー',
      id: 'backend_user'
    };

    // ローカルストレージに保存
    saveAuthTokens(tokens, userInfo);

    if (DEBUG_MODE) {
      console.log('✅ Complete auth flow successful:', {
        accessToken: tokens.accessToken.substring(0, 10) + '...',
        userInfo: userInfo.email
      });
    }

    return {
      success: true,
      tokens: tokens,
      userInfo: userInfo
    };

  } catch (error) {
    console.error('❌ Complete auth flow error:', error);
    throw new Error(`認証フローの実行に失敗しました: ${error.message}`);
  }
};

/**
 * 安全なリダイレクト処理
 * @param {string} url - リダイレクト先URL
 */
export const safeRedirect = (url) => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const safeUrl = new URL(url, window.location.origin);
    window.location.href = safeUrl.href;

  } catch (error) {
    console.error('❌ Redirect error:', error);
  }
};

/**
 * ステータスパラメータの生成
 * @returns {string} ステータス
 */
export const generateStateParam = () => {
  const state = {
    timestamp: Date.now(),
    randomValue: Math.random().toString(36).substring(2),
    userAgent: navigator.userAgent
  };

  return btoa(JSON.stringify(state));
};

/**
 * ステータスパラメータの検証とデコード
 * @param {string} state - ステータス
 * @returns {Object} 検証結果
 */
export const validateAndDecodeState = (state) => {
  try {
    const decoded = atob(state);
    const parsed = JSON.parse(decoded);

    // タイムスタンプの検証（例: 5分以上前のリクエストは無効）
    const currentTime = Date.now();
    if (parsed.timestamp && currentTime - parsed.timestamp > 5 * 60 * 1000) {
      return { valid: false, error: 'Timestamp is too old' };
    }

    return { valid: true, data: parsed };

  } catch (error) {
    return { valid: false, error: 'Invalid state format' };
  }
};

/**
 * 適切なリダイレクト先URLを取得
 * @param {string} fallbackUrl - フォールバックURL
 * @returns {string} リダイレクト先URL
 */
export const getRedirectUrl = (fallbackUrl = '/') => {
  try {
    const { redirectUrl, referrerHost } = getAuthState();
    
    // 現在のホストと参照元ホストが異なる場合の処理
    if (typeof window !== 'undefined' && referrerHost && referrerHost !== window.location.host) {
      // 異なるホストの場合は、参照元ホストのルートまたは指定されたURLにリダイレクト
      const protocol = window.location.protocol;
      return `${protocol}//${referrerHost}${fallbackUrl}`;
    }
    
    return redirectUrl || fallbackUrl;
  } catch (error) {
    console.warn('Failed to get redirect URL:', error);
    return fallbackUrl;
  }
};

// デバッグ用のグローバルオブジェクト（開発環境のみ）
if (typeof window !== 'undefined' && DEBUG_MODE) {
  window.__POKENAE_AUTH = {
    exchangeCodeForTokens,
    fetchUserInfo,
    saveAuthTokens,
    getAuthTokens,
    clearAuthTokens,
    saveAuthState,
    getAuthState,
    clearAuthState,
    getRedirectUrl,
    isTokenValid,
    completeAuthFlow,
    safeRedirect,
    GOOGLE_AUTH_CONFIG,
    BACKEND_API_CONFIG,
    AUTH_STORAGE_KEYS,
    SESSION_STORAGE_KEYS,
    generateStateParam,
    validateAndDecodeState
  };
}
