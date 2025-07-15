'use client';

import { useState, useEffect } from 'react';
import { API_CONFIG, buildApiUrl } from '../../utils/config';

export default function ApiTestPage() {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (test, result, error = null, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      result,
      error,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testApiEndpoint = async (name, apiCall) => {
    try {
      console.log(`Testing ${name}...`);
      const result = await apiCall();
      addTestResult(name, '成功', null, result);
      console.log(`${name} 結果:`, result);
      return result;
    } catch (error) {
      addTestResult(name, '失敗', error.message);
      console.error(`${name} エラー:`, error);
      return null;
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    // 基本的な接続テスト
    await testApiEndpoint('API Base URL確認', async () => {
      const baseUrl = API_CONFIG.BASE_URL;
      return { baseUrl };
    });

    // Direct fetch テスト（実際のエンドポイント）
    // 注意: すべてのリクエストでmethod: 'GET'を明示的に指定（一部のサーバーでは必要）
    await testApiEndpoint('Direct Fetch - コレクションテーブル一覧', async () => {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.COLLECTION_TABLE), {
        method: 'GET',
        ...API_CONFIG.DEFAULT_OPTIONS,
        headers: {
          ...API_CONFIG.DEFAULT_OPTIONS.headers,
          'Accept': 'application/json',
        },
      });
      
      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const text = await response.text();
      console.log('Response Text:', text);
      
      try {
        return JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`JSON Parse Error: ${jsonError.message} - Response: ${text}`);
      }
    });

    // サンプルtableIdでのテスト
    const sampleTableId = 'f1dbf3a5-3b86-4939-99e8-d564a11b4326';
    
    await testApiEndpoint(`コレクションテーブル詳細取得 (${sampleTableId})`, async () => {
      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.COLLECTION_TABLE}/${sampleTableId}`), {
        method: 'GET',
        ...API_CONFIG.DEFAULT_OPTIONS,
        headers: {
          ...API_CONFIG.DEFAULT_OPTIONS.headers,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`JSON Parse Error: ${jsonError.message} - Response: ${text}`);
      }
    });

    await testApiEndpoint(`レコード一覧取得 (${sampleTableId})`, async () => {
      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.RECORD}/table/${sampleTableId}`), {
        method: 'GET',
        ...API_CONFIG.DEFAULT_OPTIONS,
        headers: {
          ...API_CONFIG.DEFAULT_OPTIONS.headers,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`JSON Parse Error: ${jsonError.message} - Response: ${text}`);
      }
    });

    // HTTP接続テスト（CORS回避のため）
    // 注意: HTTPプロトコルでもmethod: 'GET'の明示的指定が重要
    // 設定ファイルのHTTPS設定をオーバーライドしてHTTP接続をテスト
    await testApiEndpoint('HTTP接続 - コレクションテーブル一覧', async () => {
      const response = await fetch('http://localhost:7077/api/CollectionTable', {
        method: 'GET',
        ...API_CONFIG.DEFAULT_OPTIONS,
        headers: {
          ...API_CONFIG.DEFAULT_OPTIONS.headers,
          'Accept': 'application/json',
        },
      });
      
      console.log('HTTP Response Status:', response.status);
      console.log('HTTP Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const text = await response.text();
      console.log('HTTP Response Text:', text);
      
      try {
        return JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`JSON Parse Error: ${jsonError.message} - Response: ${text}`);
      }
    });

    await testApiEndpoint(`HTTP接続 - コレクションテーブル詳細 (${sampleTableId})`, async () => {
      // 設定ファイルのHTTPS設定をオーバーライドしてHTTP接続をテスト
      const response = await fetch(`http://localhost:7077/api/CollectionTable/${sampleTableId}`, {
        method: 'GET',
        ...API_CONFIG.DEFAULT_OPTIONS,
        headers: {
          ...API_CONFIG.DEFAULT_OPTIONS.headers,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`JSON Parse Error: ${jsonError.message} - Response: ${text}`);
      }
    });

    await testApiEndpoint(`HTTP接続 - レコード一覧取得 (${sampleTableId})`, async () => {
      // 設定ファイルのHTTPS設定をオーバーライドしてHTTP接続をテスト
      const response = await fetch(`http://localhost:7077/api/Record/table/${sampleTableId}`, {
        method: 'GET',
        ...API_CONFIG.DEFAULT_OPTIONS,
        headers: {
          ...API_CONFIG.DEFAULT_OPTIONS.headers,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`JSON Parse Error: ${jsonError.message} - Response: ${text}`);
      }
    });

    // 各種エラーパターンのテスト
    // GETメソッドを明示的に指定してエラーレスポンスも正確にテスト
    await testApiEndpoint('存在しないエンドポイントテスト', async () => {
      const response = await fetch(buildApiUrl('/api/nonexistent'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Expected error: HTTP ${response.status}`);
      }
      
      return await response.json();
    });

    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API詳細テストページ</h1>
      <p>このページは開発用のAPIテストページですにゃん。</p>
      <p>APIエラーの詳細な診断を行いますにゃん。</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests} 
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isLoading ? 'テスト実行中...' : 'APIテスト実行'}
        </button>
        
        <button 
          onClick={clearResults}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          結果をクリア
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>テスト結果:</h2>
        {testResults.length === 0 ? (
          <p>まだテストが実行されていません。</p>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {testResults.map((result, index) => (
              <div key={index} style={{ 
                marginBottom: '10px', 
                padding: '10px', 
                backgroundColor: result.result === '成功' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${result.result === '成功' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: '4px'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  [{result.timestamp}] {result.test}: {result.result}
                </div>
                {result.error && (
                  <div style={{ color: '#721c24', marginTop: '5px', fontSize: '14px' }}>
                    エラー: {result.error}
                  </div>
                )}
                {result.data && (
                  <details style={{ marginTop: '5px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '14px' }}>
                      レスポンスデータを表示
                    </summary>
                    <pre style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '10px', 
                      marginTop: '5px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>環境情報:</h2>
        <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify({
            'API_BASE_URL': API_CONFIG.BASE_URL,
            'App Name': process.env.NEXT_PUBLIC_APP_NAME || 'Pokenae Web',
            'User Agent': typeof window !== 'undefined' ? window.navigator.userAgent : 'Server Side',
            'Current URL': typeof window !== 'undefined' ? window.location.href : 'Server Side',
            'Protocol': typeof window !== 'undefined' ? window.location.protocol : 'Unknown',
            'Host': typeof window !== 'undefined' ? window.location.host : 'Unknown'
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>推奨対応方法:</h2>
        <div style={{ backgroundColor: '#e9ecef', padding: '15px', borderRadius: '4px' }}>
          <h3>CORSエラーの解決方法:</h3>
          <ol>
            <li><strong>APIサーバー側でCORS設定</strong>: ASP.NET CoreでCORSポリシーを設定（推奨）</li>
            <li><strong>HTTPで接続</strong>: 必要に応じて環境変数を <code>NEXT_PUBLIC_API_BASE_URL=http://localhost:7077</code> に設定</li>
            <li><strong>開発時のみ</strong>: ブラウザの <code>--disable-web-security</code> フラグ使用（推奨しません）</li>
          </ol>
          
          <div style={{ backgroundColor: '#e8f4fd', padding: '10px', borderRadius: '4px', margin: '10px 0' }}>
            <strong>💡 設定管理情報:</strong> APIのホストURLは <code>src/utils/config.js</code> で一元管理されています。
            環境変数 <code>NEXT_PUBLIC_API_BASE_URL</code> で簡単に変更できます。
          </div>
          
          <h3>一般的なAPIエラー対応:</h3>
          <ul>
            <li><strong>CORS エラー:</strong> 上記のCORS解決方法を試してください</li>
            <li><strong>SSL証明書エラー:</strong> 開発環境ではHTTPS証明書の設定を確認、またはHTTP接続を検討</li>
            <li><strong>接続エラー:</strong> APIサーバーが起動しているか確認してください（ポート7077）</li>
            <li><strong>タイムアウト:</strong> APIサーバーの応答時間を確認してください</li>
          </ul>
          
          <h3>デバッグ手順:</h3>
          <ol>
            <li>ブラウザの開発者ツールのNetworkタブでリクエストを確認</li>
            <li>APIサーバーのログを確認</li>
            <li>上記のテスト結果から具体的なエラー内容を確認</li>
            <li>必要に応じてAPIサーバーの設定を調整</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
