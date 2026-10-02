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
      sectionDescription="ゲーム機、ソフト、アカウント、メモリーカード、セーブデータを管理します。"
      contentTags={app?.tags ?? []}
      tagDefinitions={tagDefinitions}
      extraCards={[
        {
          href: '/game-library/maintenance',
          shortLabel: 'Maintenance',
          title: '保守履歴',
          description: '保守履歴を確認・記録します。',
          actionLabel: '保守履歴を開く',
        },
        {
          href: '/game-library/save-data-search',
          shortLabel: 'Search',
          title: '横断セーブデータ検索',
          description: '条件を指定してセーブデータを検索します。',
          actionLabel: '検索画面を開く',
        },
        {
          href: '/game-management',
          shortLabel: 'Master',
          title: 'マスタ管理',
          description: '各種マスタ情報を管理します。',
          actionLabel: 'マスタ管理を開く',
        },
      ]}
    />
  );
}
