import { notFound } from 'next/navigation';
import { GameManagementResourceEditorPage } from '@/components/organisms/GameManagement';
import { isResourceKey, ADMIN_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default async function GameManagementResourceNewPage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;

  if (!isResourceKey(resource) || !ADMIN_RESOURCE_ORDER.includes(resource)) {
    notFound();
  }

  return (
    <GameManagementResourceEditorPage
      resourceKey={resource}
      basePath="/game-management"
      scope="admin"
    />
  );
}