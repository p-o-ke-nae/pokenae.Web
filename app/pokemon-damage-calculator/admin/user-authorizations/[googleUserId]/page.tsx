import { AdminUserAuthorizationEditorPage } from '@/components/organisms/PokemonDamageCalculatorAdmin/AdminUserAuthorizationEditorPage';

export default async function PokemonDamageCalculatorAdminUserAuthorizationDetailPage({
  params,
}: {
  params: Promise<{ googleUserId: string }>;
}) {
  const { googleUserId } = await params;
  return <AdminUserAuthorizationEditorPage googleUserId={googleUserId} />;
}

