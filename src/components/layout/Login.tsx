'use client';

import React, { useState, useEffect } from 'react';
import { 
  getAuthTokens, 
  clearAuthTokens, 
  saveAuthState, 
  clearAuthState, 
  GOOGLE_AUTH_CONFIG 
} from '../../utils/authUtils';
import './Login.css';

const Login = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // ログイン状態を確認
    const authData = getAuthTokens();
    if (authData && authData.accessToken) {
      console.log(`token:${authData.accessToken}`);
      setIsLoggedIn(true);
      
      // ユーザー情報も設定
      if (authData.userInfo) {
        setUserInfo(authData.userInfo);
        console.log('User info loaded:', authData.userInfo);
      }
    }
  }, []);

  // const handleLogin = () => {
  //   const clientId = '805729941904-h95ej9999oqro2i98q138tiduioamuk9.apps.googleusercontent.com';
  //   const redirectUri = 'http://localhost:3001/callback';
  //   const scope = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
  //   const responseType = 'code';
  //   // const state = Math.random().toString(36).substring(2); // ランダムなstateを生成
  //   const state = encodeURIComponent(window.location.href);
  //   localStorage.setItem('oauth_state', state); // stateをローカルストレージに保存

  //   const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&state=${state}&test=mylink`;

  //   window.location.href = authUrl;
  // };

  const handleLogin = () => {
    // 認証前に現在のページ情報を保存
    saveAuthState();
    
    // セキュアなstateパラメータを生成（CSRF対策）
    // このstateは以下の情報を含む：
    // - 暗号学的に安全なランダム値（nonce）
    // - タイムスタンプ（有効期限チェック用）
    // - ユーザーエージェント（追加の検証用）
    const generateStateParam = () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      
      const state = {
        nonce: nonce,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      };
      
      const stateString = btoa(JSON.stringify(state));
      
      // sessionStorageに保存して後で検証（CSRF対策）
      sessionStorage.setItem('auth_state', stateString);
      
      return stateString;
    };
    
    const stateParam = generateStateParam();
    
    const params = new URLSearchParams({
      client_id: GOOGLE_AUTH_CONFIG.CLIENT_ID,
      redirect_uri: GOOGLE_AUTH_CONFIG.REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_AUTH_CONFIG.SCOPES.join(' '),
      state: stateParam,
      access_type: 'offline', // オフラインアクセスを要求
      prompt: 'consent', // ユーザーに常に同意画面を表示
    });
    
    console.log('🚀 Starting Google OAuth flow...', {
      redirectUri: GOOGLE_AUTH_CONFIG.REDIRECT_URI,
      currentHost: window.location.hostname,
      stateGenerated: stateParam.substring(0, 20) + '...',
      fullAuthUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    });
    
    // Googleの認証ページにリダイレクト
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleLogout = () => {
    // 全ての認証情報をクリア
    clearAuthTokens();
    clearAuthState();
    
    setIsLoggedIn(false);
    setUserInfo(null);
    console.log('🚪 User logged out');
  };

  return (
    <div className="login-container">
      {isLoggedIn ? (
        <div className="logged-in-section">
          {userInfo && (
            <div className="user-info">
              <span className="user-name">👤 {userInfo.name || userInfo.email}</span>
            </div>
          )}
          <button className="login-button logout" onClick={handleLogout}>ログアウト</button>
        </div>
      ) : (
        <button className="login-button" onClick={handleLogin}>Login with Google</button>
      )}
    </div>
  );
};

export default Login;
