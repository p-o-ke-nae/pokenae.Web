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

        if (!code) {
          throw new Error('認証コードが見つかりません。認証プロセスを再開してください。');
        }

        if (!state) {
          throw new Error('状態パラメータが見つかりません。認証プロセスを再開してください。');
        }

        setMessage('認証コードを処理しています...');

        // 認証フローを完了
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