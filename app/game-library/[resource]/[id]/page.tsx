import { redirect, notFound } from 'next/navigation';
import { isResourceKey, USER_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default async function GameLibraryResourceDetailPage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource } = await params;

  if (!isResourceKey(resource) || !USER_RESOURCE_ORDER.includes(resource)) {
    notFound();
  }

  redirect(`/game-library/${resource}`);
}
