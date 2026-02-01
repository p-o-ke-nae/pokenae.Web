'use client';

import { useState } from 'react';
import { useApi } from '@/lib/hooks/useApi';
import { createFrontendApiClient } from '@/lib/api/frontend-client';
import type { ApiServiceName } from '@/lib/config/api-config';

export default function ApiExamplePage() {
  const [selectedService, setSelectedService] = useState<ApiServiceName>('service1');
  const [endpoint, setEndpoint] = useState('/users');
  const [manualResult, setManualResult] = useState<string>('');

  // useApiフックの使用例
  const { data, error, loading, execute } = useApi(
    selectedService,
    (client) => client.get(endpoint)
  );

  // 手動でクライアントを使用する例
  const handleManualRequest = async () => {
    const client = createFrontendApiClient(selectedService);
    const response = await client.get(endpoint);
    
    if (response.success) {
      setManualResult(JSON.stringify(response.data, null, 2));
    } else {
      setManualResult(`Error: ${response.error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-black dark:text-white">
          APIルーティング基盤 - サンプルページ
        </h1>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            設定
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                サービス選択
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as ApiServiceName)}
                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 text-black dark:text-white border-zinc-300 dark:border-zinc-700"
              >
                <option value="service1">Service 1</option>
                <option value="service2">Service 2</option>
                <option value="service3">Service 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                エンドポイント
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/users"
                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 text-black dark:text-white border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* useApiフックの例 */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            1. useApiフックを使用
          </h2>
          
          <button
            onClick={execute}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
          >
            {loading ? 'リクエスト中...' : 'APIリクエスト実行'}
          </button>

          <div className="mt-4">
            {loading && (
              <div className="text-zinc-600 dark:text-zinc-400">
                読み込み中...
              </div>
            )}
            
            {error && (
              <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                <strong>エラー:</strong> {error}
              </div>
            )}
            
            {data !== null && (
              <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded">
                <strong className="text-black dark:text-white">レスポンス:</strong>
                <pre className="mt-2 text-sm overflow-x-auto text-zinc-800 dark:text-zinc-200">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 手動クライアント使用の例 */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            2. 手動でクライアントを使用
          </h2>
          
          <button
            onClick={handleManualRequest}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            APIリクエスト実行
          </button>

          {manualResult && (
            <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded">
              <strong className="text-black dark:text-white">レスポンス:</strong>
              <pre className="mt-2 text-sm overflow-x-auto text-zinc-800 dark:text-zinc-200">
                {manualResult}
              </pre>
            </div>
          )}
        </div>

        {/* 説明 */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            使用方法
          </h2>
          
          <div className="space-y-4 text-zinc-700 dark:text-zinc-300">
            <div>
              <h3 className="font-semibold text-black dark:text-white">現在の状態</h3>
              <p className="text-sm mt-1">
                このページは、実際のバックエンドAPIが存在しない場合、エラーが表示されます。
                実際の使用時は、.env.localに正しいAPI URLを設定してください。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black dark:text-white">リクエストURL</h3>
              <p className="text-sm mt-1 font-mono bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
                /api/services/{selectedService}{endpoint}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black dark:text-white">詳細なドキュメント</h3>
              <p className="text-sm mt-1">
                詳細な使用方法は <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">docs/API_ROUTING.md</code> を参照してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
