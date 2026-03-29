import { notFound } from 'next/navigation';
import { GameManagementResourceListPage } from '@/components/organisms/GameManagement';
import { isResourceKey, ADMIN_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default async function GameManagementResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;

  if (!isResourceKey(resource) || !ADMIN_RESOURCE_ORDER.includes(resource)) {
    notFound();
  }

  return (
    <GameManagementResourceListPage
      resourceKey={resource}
      basePath="/game-management"
      scope="admin"
    />
  );
}