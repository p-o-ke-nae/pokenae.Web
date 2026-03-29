import { notFound } from 'next/navigation';
import { GameManagementResourceEditorPage } from '@/components/organisms/GameManagement';
import { isResourceKey, USER_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default async function GameLibraryResourceNewPage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;

  if (!isResourceKey(resource) || !USER_RESOURCE_ORDER.includes(resource)) {
    notFound();
  }

  return (
    <GameManagementResourceEditorPage
      resourceKey={resource}
      basePath="/game-library"
      scope="user"
    />
  );
}
