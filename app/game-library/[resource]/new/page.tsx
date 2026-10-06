import { redirect, notFound } from 'next/navigation';
import { isResourceKey, USER_RESOURCE_ORDER } from '@/lib/game-management/resources';

export default async function GameLibraryResourceNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { resource } = await params;
  const query = await searchParams;

  if (!isResourceKey(resource) || !USER_RESOURCE_ORDER.includes(resource)) {
    notFound();
  }

  const nextParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item));
    } else if (value != null) {
      nextParams.set(key, value);
    }
  });
  redirect(`/game-library/${resource}${nextParams.size > 0 ? `?${nextParams.toString()}` : ''}`);
}
