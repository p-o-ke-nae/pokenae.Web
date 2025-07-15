// 認証ボタンコンポーネントの使用例
// 実際のプロジェクトでの認証フロー実装のサンプルにゃん

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CustomButton, useAppContext } from '@webcomponent/components';
import { prepareAuthFlow, createAuthButtonProps, debugAuthState } from '../../utils/authHelper';
import { APP_CONFIG } from '../../utils/config';

/**
 * 認証開始ボタンコンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.authProvider - 認証プロバイダー名
 * @param {string} props.redirectUrl - 認証後のリダイレクト先
 * @param {string} props.label - ボタンのラベル
 * @param {Function} props.onSuccess - 認証開始成功時のコールバック
 * @param {Function} props.onError - エラー時のコールバック
 * @param {boolean} props.preserveCurrentPage - 現在のページを保持するか
 */
export const AuthStartButton = ({
  authProvider = 'oauth',
  redirectUrl = null,
  label = '認証開始',
  onSuccess = null,
  onError = null,
  preserveCurrentPage = true,
  ...customButtonProps
}) => {
  const router = useRouter();
  const { showInfo, showError } = useAppContext();

  const handleAuthStart = () => {
    try {
      // デバッグ情報出力
      if (APP_CONFIG.DEBUG_MODE) {
        debugAuthState();
      }

      // 認証フローの準備
      const success = prepareAuthFlow({
        redirectUrl: preserveCurrentPage && typeof window !== 'undefined' ? 
          window.location.href : 
          redirectUrl,
        authProvider
      });

      if (success) {
        showInfo('認証を開始します...');
        
        if (onSuccess) {
          onSuccess();
        }

        // 実際の認証URLにリダイレクト
        // 以下は実装例 - 実際の認証プロバイダーに応じて変更してください
        const authUrl = generateAuthUrl(authProvider);
        
        setTimeout(() => {
          window.location.href = authUrl;
        }, 1000);

      } else {
        throw new Error('認証フローの準備に失敗しました');
      }

    } catch (error) {
      console.error('Auth start error:', error);
      showError(`認証開始エラー: ${error.message}`);
      
      if (onError) {
        onError(error);
      }
    }
  };

  // 認証URLを生成（実際の実装では認証プロバイダーに応じて変更）
  const generateAuthUrl = (provider) => {
    const baseUrl = typeof window !== 'undefined' ? 
      `${window.location.protocol}//${window.location.host}` : 
      '';
    
    const callbackUrl = `${baseUrl}/callback`;
    const state = generateRandomState();

    switch (provider) {
      case 'oauth':
        return `/callback?provider=oauth&state=${state}`;
      case 'google':
        return `https://accounts.google.com/oauth/authorize?` +
          `client_id=YOUR_CLIENT_ID&` +
          `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
          `response_type=code&` +
          `scope=openid profile email&` +
          `state=${state}`;
      case 'github':
        return `https://github.com/login/oauth/authorize?` +
          `client_id=YOUR_CLIENT_ID&` +
          `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
          `scope=user:email&` +
          `state=${state}`;
      default:
        return `/callback?provider=${provider}&state=${state}`;
    }
  };

  // ランダムなstateパラメータを生成
  const generateRandomState = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  return (
    <CustomButton
      onClick={handleAuthStart}
      label={label}
      {...customButtonProps}
    />
  );
};

/**
 * 認証状態表示コンポーネント
 */
export const AuthStateDisplay = () => {
  const [authState, setAuthState] = React.useState(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const state = {
          redirectUrl: sessionStorage.getItem('auth_redirect_url'),
          referrerHost: sessionStorage.getItem('auth_referrer_host'),
          authState: sessionStorage.getItem('auth_state')
        };
        setAuthState(state);
      } catch (error) {
        console.error('Failed to load auth state:', error);
      }
    }
  }, []);

  if (!APP_CONFIG.DEBUG_MODE || !authState) {
    return null;
  }

  return (
    <div style={{
      background: '#f8f9fa',
      padding: '1rem',
      borderRadius: '8px',
      margin: '1rem 0',
      border: '1px solid #e9ecef',
      fontSize: '0.9rem'
    }}>
      <h4>🔐 認証状態 (デバッグ用)</h4>
      <p><strong>リダイレクト先:</strong> {authState.redirectUrl || '未設定'}</p>
      <p><strong>参照元ホスト:</strong> {authState.referrerHost || '未設定'}</p>
      <p><strong>認証状態:</strong> {authState.authState || '未設定'}</p>
    </div>
  );
};

/**
 * 使用例コンポーネント
 */
export const AuthExampleUsage = () => {
  const { showInfo, showSuccess, showError } = useAppContext();

  return (
    <div style={{ padding: '2rem' }}>
      <h2>認証フロー使用例</h2>
      
      {/* 認証状態表示（デバッグ用） */}
      <AuthStateDisplay />
      
      <div style={{ marginBottom: '1rem' }}>
        <h3>基本的な認証ボタン</h3>
        <AuthStartButton
          label="OAuth認証"
          authProvider="oauth"
          onSuccess={() => showInfo('OAuth認証を開始しました')}
          onError={(error) => showError(`エラー: ${error.message}`)}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>Google認証ボタン</h3>
        <AuthStartButton
          label="Googleでログイン"
          authProvider="google"
          onSuccess={() => showInfo('Google認証を開始しました')}
          onError={(error) => showError(`Google認証エラー: ${error.message}`)}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>GitHub認証ボタン</h3>
        <AuthStartButton
          label="GitHubでログイン"
          authProvider="github"
          onSuccess={() => showInfo('GitHub認証を開始しました')}
          onError={(error) => showError(`GitHub認証エラー: ${error.message}`)}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>カスタムリダイレクト先指定</h3>
        <AuthStartButton
          label="認証後にコレクション一覧へ"
          authProvider="oauth"
          redirectUrl="/CollectionAssistanceTool"
          preserveCurrentPage={false}
          onSuccess={() => showSuccess('カスタムリダイレクト認証を開始しました')}
        />
      </div>
    </div>
  );
};

export default AuthExampleUsage;
