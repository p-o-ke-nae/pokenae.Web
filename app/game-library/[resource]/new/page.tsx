import { redirect, notFound } from 'next/navigation';
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

  redirect(`/game-library/${resource}`);
}
