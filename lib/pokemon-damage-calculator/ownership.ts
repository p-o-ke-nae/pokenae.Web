export type RunOwnership = 'guest' | 'viewer' | 'owner';

export function getRunOwnership(ownerUserId: string | null | undefined, googleUserId: string | null | undefined): RunOwnership {
  if (!googleUserId) {
    return 'guest';
  }

  return ownerUserId === googleUserId ? 'owner' : 'viewer';
}

export function canEditRun(ownerUserId: string | null | undefined, googleUserId: string | null | undefined): boolean {
  return getRunOwnership(ownerUserId, googleUserId) === 'owner';
}

export function getRunReadOnlyReason(ownerUserId: string | null | undefined, googleUserId: string | null | undefined): string | null {
  const ownership = getRunOwnership(ownerUserId, googleUserId);

  switch (ownership) {
    case 'guest':
      return '閲覧は可能ですが、編集するには Google でログインしてください。';
    case 'viewer':
      return 'この Run は他ユーザー所有のため閲覧専用です。';
    default:
      return null;
  }
}

