import React, { useEffect, useState, useRef } from 'react';
import { 
  completeAuthFlow,
  clearAuthTokens, 
  clearAuthState, 
  getRedirectUrl,
  BACKEND_API_CONFIG 
} from '../../utils/authUtils';

const Callback = () => {
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('認証情報を処理しています...');
  const [countdown, setCountdown] = useState(3);
  const [redirectUrl, setRedirectUrl] = useState('/');
  const isProcessingRef = useRef(false); // 二重実行防止フラグ

  // セキュアなリダイレクト関数
  const safeRedirect = (url) => {
    try {
      console.log('🔀 Redirecting to:', url);
      window.location.href = url;
    } catch (error) {
      console.error('❌ Redirect failed:', error);
      // フォールバック: ホームページにリダイレクト
      window.location.href = '/';
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      // 二重実行防止
      if (isProcessingRef.current) {
        console.log('🔄 Auth callback already in progress, skipping...');
        return;
      }
      
      isProcessingRef.current = true;
      
      try {
        console.log('🔍 Processing OAuth callback...');

        // URLからcodeとstateパラメータを取得
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        // エラーパラメータのチェック（Googleが認証拒否した場合など）
        const error = urlParams.get('error');
        if (error) {
          const errorDescription = urlParams.get('error_description') || 'Unknown error';
          throw new Error(`認証エラー: ${error} - ${errorDescription}`);
        }

        if (!code) {
          throw new Error('認証コードが見つかりません。認証プロセスを再開してください。');
        }

        if (!state) {
          throw new Error('状態パラメータが見つかりません。認証プロセスを再開してください。');
        }

        // stateパラメータの検証（CSRF攻撃対策）
        setMessage('セキュリティ検証を実行しています...');
        const validateState = (receivedState) => {
          try {
            // sessionStorageから保存されたstateを取得
            const storedState = sessionStorage.getItem('auth_state');
            if (!storedState) {
              console.error('❌ No stored state found in sessionStorage');
              throw new Error('セキュリティエラー: 保存された状態が見つかりません。CSRF攻撃の可能性があります。');
            }

            // stateの一致を確認
            if (storedState !== receivedState) {
              console.error('❌ State mismatch:', {
                stored: storedState.substring(0, 20) + '...',
                received: receivedState.substring(0, 20) + '...'
              });
              throw new Error('セキュリティエラー: 状態パラメータが一致しません。CSRF攻撃の可能性があります。');
            }

            // stateをデコードして内容を検証
            const decoded = atob(receivedState);
            const parsed = JSON.parse(decoded);

            // タイムスタンプの検証（5分以内）
            const currentTime = Date.now();
            const STATE_EXPIRY_TIME = 5 * 60 * 1000; // 5分
            if (parsed.timestamp && currentTime - parsed.timestamp > STATE_EXPIRY_TIME) {
              const ageMinutes = Math.round((currentTime - parsed.timestamp) / 1000 / 60);
              throw new Error(`セキュリティエラー: 認証リクエストの有効期限が切れました（${ageMinutes}分前）。`);
            }

            // 検証成功後、使用済みstateを削除（リプレイアタック対策）
            sessionStorage.removeItem('auth_state');
            
            console.log('✅ State validation successful');
            return true;

          } catch (error) {
            console.error('❌ State validation failed:', error);
            throw error;
          }
        };

        // stateを検証
        validateState(state);

        setMessage('認証コードを処理しています...');

        // バックエンドに認証情報を送信して処理を委譲
        // この処理では：
        // 1. フロントエンドからバックエンド（pokenae.Web API）にcodeとstateを送信
        // 2. バックエンドはpokenae.UserManager WebAPIに処理を委譲
        // 3. UserManagerがGoogleとトークン交換を行い、ユーザー情報を取得
        // 4. バックエンドはアクセストークンを返却
        const authResult = await completeAuthFlow(code, state);
        
        if (authResult.success) {
          setStatus('success');
          const userName = authResult.userInfo?.name || 'ユーザー';
          
          setMessage('認証が完了しました。リダイレクトしています...');
          
          console.log('✅ Authentication successful:', {
            userName: userName,
            hasToken: !!authResult.tokens?.accessToken
          });

          // カウントダウン開始
          let counter = 3;
          const countdownInterval = setInterval(() => {
            setCountdown(counter);
            counter--;
            
            if (counter < 0) {
              clearInterval(countdownInterval);
              
              // 認証状態をクリアしてリダイレクト
              clearAuthState();
              safeRedirect('/'); // ホームページにリダイレクト
            }
          }, 1000);

        } else {
          throw new Error('認証処理が正常に完了しませんでした');
        }

      } catch (error) {
        console.error('❌ Auth callback error:', error);
        
        // エラーの詳細情報をコンソールに出力
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          currentUrl: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
          pathname: window.location.pathname
        });
        
        setStatus('error');
        
        setMessage(`認証に失敗しました: ${error.message}`);
        
        // 認証情報をクリアしてエラー状態を処理
        clearAuthTokens();
        clearAuthState();
        
        // 5秒後にホームページにリダイレクト
        setTimeout(() => {
          safeRedirect('/');
        }, 5000);
      } finally {
        // 処理完了後にフラグをリセット（エラー時も含む）
        isProcessingRef.current = false;
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        {status === 'processing' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
            <h2>認証処理中</h2>
            <p>{message}</p>
            <div style={{
              marginTop: '20px',
              padding: '10px',
              backgroundColor: '#f0f9ff',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#0369a1'
            }}>
              バックエンドからアクセストークンを取得しています...
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
            <h2>認証完了</h2>
            <p>{message}</p>
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#dcfce7',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#166534'
            }}>
              {countdown}秒後にリダイレクトします...
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <h2>認証エラー</h2>
            <div style={{
              padding: '15px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #fecaca'
            }}>
              <p style={{ color: '#dc2626', margin: 0, fontSize: '14px' }}>{message}</p>
            </div>
            <div style={{
              marginTop: '20px',
              padding: '10px',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#374151'
            }}>
              5秒後にホームページにリダイレクトします...
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Callback;