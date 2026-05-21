export interface RuleSetDto {
  id: string;
  slug: string;
  generation: number;
  title: string;
  version: string;
  status: string;
  summary: string;
}

export interface RunDto {
  id: string;
  ownerUserId: string;
  ruleSetId: string;
  name: string;
  status: string;
}

export interface BattleDto {
  id: string;
  runId: string;
  enemyPokemon: string;
  sequence: number;
}

export interface CalculationResultDto {
  id: string;
  runId: string;
  battleId: string;
  attackerParams: string;
  defenderParams: string;
  damageRolls: number[];
}

export interface OwnPokemonSnapshotDto {
  id: string;
  battleId: string;
  species: string;
  level: number;
  baseStats: string;
  iVs: string;
  stats: string;
  eVs: string;
}

export interface PartyStateDto {
  runId: string;
  pokemon: OwnPokemonSnapshotDto[];
}

export interface CreateRunRequest {
  name: string;
  ruleSetId: string;
}

export interface UpdateRunRequest {
  name: string;
  status: string;
}

export interface CreateBattleRequest {
  enemyPokemon: string;
  sequence: number;
}

export interface UpdateBattleRequest {
  enemyPokemon: string;
  sequence: number;
}

export interface CalculateDamageRequest {
  attackerLevel: number;
  attackStat: number;
  movePower: number;
  isSpecialMove: boolean;
  hasStab: boolean;
  defenseStat: number;
  typeEffectiveness: number;
}

export interface AddProgressionEventRequest {
  battleId: string;
  species: string;
  level: number;
  baseStats: string;
  iVs: string;
  stats: string;
  eVs: string;
}

export type ParsedJsonValue = Record<string, unknown> | unknown[] | null;

export interface CalculationResultViewModel extends CalculationResultDto {
  parsedAttackerParams: ParsedJsonValue;
  parsedDefenderParams: ParsedJsonValue;
}

