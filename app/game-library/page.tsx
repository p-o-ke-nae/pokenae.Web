import { GameManagementDashboard } from '@/components/organisms/GameManagement';
import { USER_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default function GameLibraryPage() {
  return (
    <GameManagementDashboard
      basePath="/game-library"
      resourceKeys={USER_RESOURCE_ORDER}
      sectionLabel="Game Library"
      sectionTitle="ゲームライブラリ"
      sectionDescription="所有しているゲーム機、ゲームソフト、アカウント、メモリーカード、セーブデータを管理します。"
      extraCards={[
        {
          href: '/game-library/maintenance',
          shortLabel: 'Maintenance',
          title: '保守履歴',
          description: 'ゲーム機・ゲームソフト・メモリーカードの保守状態を横断表示し、順次記録できます。',
          actionLabel: '保守履歴を開く',
        },
        {
          href: '/game-library/save-data-search',
          shortLabel: 'Search',
          title: '横断セーブデータ検索',
          description: '共通 variant と複数の schema 条件グループを使い、作品横断でセーブデータを検索できます。',
          actionLabel: '検索画面を開く',
        },
      ]}
    />
  );
}
