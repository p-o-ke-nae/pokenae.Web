import { createFrontendApiClient } from '@/lib/api/frontend-client';
import type { ApiResponse } from '@/lib/types/api';
import { POKEMON_DAMAGE_CALCULATOR_SERVICE_NAME } from './constants';
import type {
  AddProgressionEventRequest,
  BattleDto,
  CalculationResultDto,
  CalculateDamageRequest,
  CreateBattleRequest,
  CreateRunRequest,
  OwnPokemonSnapshotDto,
  PartyStateDto,
  RuleSetDto,
  RunDto,
  UpdateBattleRequest,
  UpdateRunRequest,
} from './types';

const client = createFrontendApiClient(POKEMON_DAMAGE_CALCULATOR_SERVICE_NAME);

export class PokemonDamageCalculatorApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number | null;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number | null, details?: unknown) {
    super(message);
    this.name = 'PokemonDamageCalculatorApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getStatusCode(code: string): number | null {
  return code.startsWith('HTTP_') ? Number.parseInt(code.slice(5), 10) : null;
}

async function unwrap<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const response = await promise;

  if (response.success) {
    return response.data;
  }

  throw new PokemonDamageCalculatorApiError(
    response.error.message,
    response.error.code,
    getStatusCode(response.error.code),
    response.error.details,
  );
}

export function fetchRuleSets(): Promise<RuleSetDto[]> {
  return unwrap(client.get<RuleSetDto[]>('/api/rule-sets'));
}

export function fetchRuns(): Promise<RunDto[]> {
  return unwrap(client.get<RunDto[]>('/api/runs'));
}

export function fetchRun(runId: string): Promise<RunDto> {
  return unwrap(client.get<RunDto>(`/api/runs/${runId}`));
}

export function createRun(request: CreateRunRequest): Promise<RunDto> {
  return unwrap(client.post<RunDto>('/api/runs', request));
}

export function updateRun(runId: string, request: UpdateRunRequest): Promise<RunDto> {
  return unwrap(client.put<RunDto>(`/api/runs/${runId}`, request));
}

export async function deleteRun(runId: string): Promise<void> {
  await unwrap(client.delete<void>(`/api/runs/${runId}`));
}

export function fetchBattles(runId: string): Promise<BattleDto[]> {
  return unwrap(client.get<BattleDto[]>(`/api/runs/${runId}/battles`));
}

export function createBattle(runId: string, request: CreateBattleRequest): Promise<BattleDto> {
  return unwrap(client.post<BattleDto>(`/api/runs/${runId}/battles`, request));
}

export function updateBattle(runId: string, battleId: string, request: UpdateBattleRequest): Promise<BattleDto> {
  return unwrap(client.put<BattleDto>(`/api/runs/${runId}/battles/${battleId}`, request));
}

export async function deleteBattle(runId: string, battleId: string): Promise<void> {
  await unwrap(client.delete<void>(`/api/runs/${runId}/battles/${battleId}`));
}

export function fetchPartyState(runId: string): Promise<PartyStateDto> {
  return unwrap(client.get<PartyStateDto>(`/api/runs/${runId}/party-state`));
}

export function addProgressionEvent(runId: string, request: AddProgressionEventRequest): Promise<OwnPokemonSnapshotDto> {
  return unwrap(client.post<OwnPokemonSnapshotDto>(`/api/runs/${runId}/party-state`, request));
}

export function calculateDamage(runId: string, battleId: string, request: CalculateDamageRequest): Promise<CalculationResultDto> {
  return unwrap(client.post<CalculationResultDto>(`/api/runs/${runId}/battles/${battleId}/calculate`, request));
}

