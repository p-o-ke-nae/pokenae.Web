'use client';

import { useState } from 'react';
import CustomButton from '../components/atoms/CustomButton';

interface UserData {
  id: number;
  name: string;
  email: string;
  phone: string;
  website: string;
}

export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleButtonClick = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Next.js API Routeを通じてランダムなユーザー情報を取得
      const randomId = Math.floor(Math.random() * 5) + 1;
      const response = await fetch(`/api/fetch-user?id=${randomId}`);
      
      if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
      }
      
      const data: UserData = await response.json();
      setUserData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setUserData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            pokenae
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            pokenaeへようこそ。docker完全に理解した．
            
          </p>
        </div>
        
        <div className="flex flex-col gap-4 w-full max-w-md">
          <CustomButton 
            variant="accent" 
            onClick={handleButtonClick}
            isLoading={isLoading}
          >
            カスタムボタン
          </CustomButton>
          
          {/* APIレスポンス表示エリア */}
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                エラー: {error}
              </p>
            </div>
          )}
          
          {userData && (
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                ユーザー情報
              </h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400 font-medium">名前:</dt>
                  <dd className="text-black dark:text-white">{userData.name}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400 font-medium">メール:</dt>
                  <dd className="text-black dark:text-white">{userData.email}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400 font-medium">電話:</dt>
                  <dd className="text-black dark:text-white">{userData.phone}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400 font-medium">ウェブサイト:</dt>
                  <dd className="text-black dark:text-white">{userData.website}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
