import { redirect, notFound } from 'next/navigation';
import { isResourceKey, ADMIN_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default async function GameManagementResourceDetailPage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource } = await params;

  if (!isResourceKey(resource) || !ADMIN_RESOURCE_ORDER.includes(resource)) {
    notFound();
  }

  redirect(`/game-management/${resource}`);
}