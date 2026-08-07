import { GameManagementDashboard } from '@/components/organisms/GameManagement';
import { ADMIN_RESOURCE_ORDER } from '@/lib/game-management/resources';
import { getGameManagementDashboardTexts } from '@/lib/resources/game-management-pages';

export default function GameManagementPage() {
  const texts = getGameManagementDashboardTexts('ja');

  return (
    <GameManagementDashboard
      basePath="/game-management"
      resourceKeys={ADMIN_RESOURCE_ORDER}
      requiresAdmin
      sectionLabel={texts.sectionLabel}
      sectionTitle={texts.sectionTitle}
      sectionDescription={texts.sectionDescription}
      extraCards={texts.extraCards}
    />
  );
}
