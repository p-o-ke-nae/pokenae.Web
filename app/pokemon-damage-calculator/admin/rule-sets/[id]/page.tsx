import { AdminRuleSetEditorPage } from '@/components/organisms/PokemonDamageCalculatorAdmin/AdminRuleSetEditorPage';

export default async function PokemonDamageCalculatorAdminRuleSetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminRuleSetEditorPage ruleSetId={id} />;
}

