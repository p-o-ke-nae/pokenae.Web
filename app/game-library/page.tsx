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
      sectionLabel=""
      sectionTitle="ゲームライブラリ"
      sectionDescription="ゲーム機やソフト、関連データを管理します。"
      contentTags={app?.tags ?? []}
      tagDefinitions={tagDefinitions}
      primaryCards={[
        {
          href: '/game-library/save-data-search',
          shortLabel: 'セーブ検索',
          title: 'セーブデータ検索',
          description: '複数の条件でセーブデータと保存先を検索します。',
          actionLabel: '検索',
        },
        {
          href: '/game-library/maintenance',
          shortLabel: 'メンテナンス',
          title: 'メンテナンス',
          description: '対象の状態確認と記録を行います。',
          actionLabel: 'メンテナンス',
        },
      ]}
      extraCards={[
        {
          href: '/game-management',
          shortLabel: 'マスタ管理',
          title: 'マスタ管理',
          description: 'ゲーム情報のマスタを管理します。',
          actionLabel: 'マスタ管理を開く',
        },
      ]}
    />
  );
}
