import { notFound } from 'next/navigation';
import { GameManagementResourceEditorPage } from '@/components/organisms/GameManagement';
import { isResourceKey, ADMIN_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default async function GameManagementResourceDetailPage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource, id } = await params;

  if (!isResourceKey(resource) || !ADMIN_RESOURCE_ORDER.includes(resource)) {
    notFound();
  }

  return (
    <GameManagementResourceEditorPage
      resourceKey={resource}
      recordId={id}
      basePath="/game-management"
      scope="admin"
    />
  );
}