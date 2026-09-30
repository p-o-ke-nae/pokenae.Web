import { GameManagementDashboard } from '@/components/organisms/GameManagement';
import { USER_RESOURCE_ORDER } from '@/lib/game-management/resources';
import { getContentSnapshot } from '@/lib/content/repository';

export default async function GameLibraryPage() {
  const { apps, tagDefinitions } = await getContentSnapshot();
  const app = apps.find((item) => item.href === "/game-library");
  return (
    <GameManagementDashboard
      basePath="/game-library"
      resourceKeys={USER_RESOURCE_ORDER}
      sectionLabel="Game Library"
      sectionTitle="ゲームライブラリ"
      sectionDescription="ゲーム機やソフト、関連データを管理します。"
      contentTags={app?.tags ?? []}
      tagDefinitions={tagDefinitions}
      extraCards={[
        {
          href: '/game-library/maintenance',
          shortLabel: 'Maintenance',
          title: '保守履歴',
          description: 'ゲーム機・ソフト・メモリーカードの保守記録を確認・管理します。',
          actionLabel: '保守履歴を開く',
        },
        {
          href: '/game-library/save-data-search',
          shortLabel: 'Search',
          title: '横断セーブデータ検索',
          description: '条件を指定してセーブデータを横断検索します。',
          actionLabel: '検索画面を開く',
        },
        {
          href: '/game-management',
          shortLabel: 'Master',
          title: 'マスタ管理',
          description: 'ゲーム情報のマスタを管理します。',
          actionLabel: 'マスタ管理を開く',
        },
      ]}
    />
  );
}
