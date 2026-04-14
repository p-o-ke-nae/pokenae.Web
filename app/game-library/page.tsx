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
    />
  );
}
