import type { AddProgressionEventRequest } from './types';

export type ProgressionEventFormValues = {
  battleId: string;
  species: string;
  level: string;
  baseStats: string;
  iVs: string;
  stats: string;
  eVs: string;
};

export function buildAddProgressionEventRequest(values: ProgressionEventFormValues): AddProgressionEventRequest {
  return {
    battleId: values.battleId,
    species: values.species.trim(),
    level: Number.parseInt(values.level, 10),
    baseStats: values.baseStats.trim(),
    iVs: values.iVs.trim(),
    stats: values.stats.trim(),
    eVs: values.eVs.trim(),
  };
}

export function getPartyStatePrerequisiteMessage(battleCount: number): string | null {
  return battleCount === 0
    ? 'Party State を登録するには、先に Battle を作成してください。'
    : null;
}
