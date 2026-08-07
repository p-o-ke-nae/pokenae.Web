import { PokemonDamageCalculatorRunWorkspace } from '@/components/organisms/PokemonDamageCalculator';

export default async function PokemonDamageCalculatorRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  return <PokemonDamageCalculatorRunWorkspace runId={runId} />;
}

