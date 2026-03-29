import { GameManagementDashboard } from '@/components/organisms/GameManagement';
import { ADMIN_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default function GameManagementPage() {
  return (
    <GameManagementDashboard
      basePath="/game-management"
      resourceKeys={ADMIN_RESOURCE_ORDER}
      sectionLabel="Master Management"
      sectionTitle="マスタ管理"
      sectionDescription="ゲーム機カテゴリ、ゲーム機マスタ、エディションマスタ、ソフト分類、ソフトマスタの管理を行います。この操作には管理者権限が必要です。"
      extraCards={[
        {
          href: '/game-management/save-data-schema',
          shortLabel: 'Schema',
          title: 'SaveData スキーマ管理',
          description: '可変項目定義、候補値、作品別 override をまとめて管理します。',
          actionLabel: 'schema 管理を開く',
        },
        {
          href: '/game-management/story-progress',
          shortLabel: 'Story',
          title: 'ストーリー進行度管理',
          description: '進行度定義と作品別 override を管理します。',
          actionLabel: 'story 管理を開く',
        },
      ]}
    />
  );
}