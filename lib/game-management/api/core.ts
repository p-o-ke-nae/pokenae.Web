import { createFrontendApiClient } from '@/lib/api/frontend-client';
import resources from '@/lib/resources';
import type { MoveAccountBetweenConsolesRequest, ReorderItemRequest, ResourceKey } from '@/lib/game-management/types';
import { getResourceDefinition } from '@/lib/game-management/resources';

const client = createFrontendApiClient('game-library-api');

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public statusCode: number | null;
  public details?: unknown;
  constructor(statusCode: number | null, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Error message helpers
// ---------------------------------------------------------------------------

export function getLocalizedErrorMessage(
  statusCode: number | null,
  details: unknown,
  operation?: 'fetch' | 'create' | 'update' | 'delete',
): string {
  const res = resources.apiError;
  const statusMessage = statusCode != null ? res.status[statusCode] : undefined;
  const opPrefix = operation ? res.operation[operation] : undefined;
  const base = opPrefix ?? statusMessage ?? res.fallback;
  const supplement = extractServerDetail(details);
  if (supplement && supplement !== base) {
    return `${base}\n${supplement}`;
  }
  return base;
}

function extractServerDetail(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const candidate = details as { detail?: string; title?: string; errors?: Record<string, string[]> };
  if (candidate.detail) return candidate.detail;
  if (candidate.errors) {
    const lines = Object.entries(candidate.errors)
      .flatMap(([key, values]) => values.map((value) => `${key}: ${value}`));
    if (lines.length > 0) return lines.join('\n');
  }
  if (candidate.title) return candidate.title;
  return null;
}

function getErrorMessage(details: unknown, fallback: string): string {
  return extractServerDetail(details) ?? fallback;
}

// ---------------------------------------------------------------------------
// Core unwrap
// ---------------------------------------------------------------------------

export async function unwrap<T>(promise: ReturnType<typeof client.get<T>>): Promise<T> {
  const response = await promise;
  if (!response.success) {
    const statusCode = response.error.code.startsWith('HTTP_')
      ? parseInt(response.error.code.replace('HTTP_', ''), 10)
      : null;
    throw new ApiError(
      statusCode,
      getErrorMessage(response.error.details, response.error.message),
      response.error.details,
    );
  }
  return response.data;
}

// ---------------------------------------------------------------------------
// Generic resource fetch
// ---------------------------------------------------------------------------

export async function fetchResourceList<T>(resourceKey: ResourceKey, includeDeleted = false): Promise<T[]> {
  const definition = getResourceDefinition(resourceKey);
  return unwrap(client.get<T[]>(`${definition.apiPath}?includeDeleted=${includeDeleted}`));
}

export async function fetchResourceById<T>(resourceKey: ResourceKey, id: string | number): Promise<T> {
  const definition = getResourceDefinition(resourceKey);
  return unwrap(client.get<T>(`${definition.apiPath}/${id}`));
}

// ---------------------------------------------------------------------------
// Generic resource CRUD
// ---------------------------------------------------------------------------

export async function createResource(resourceKey: ResourceKey, payload: unknown): Promise<number> {
  const definition = getResourceDefinition(resourceKey);
  return unwrap(client.post<number>(definition.apiPath, payload));
}

export async function updateResource<T>(resourceKey: ResourceKey, id: number, payload: unknown): Promise<T> {
  const definition = getResourceDefinition(resourceKey);
  return unwrap(client.put<T>(`${definition.apiPath}/${id}`, payload));
}

export async function deleteResource(resourceKey: ResourceKey, id: number, body?: unknown): Promise<void> {
  const definition = getResourceDefinition(resourceKey);
  await unwrap(client.delete<void>(`${definition.apiPath}/${id}`, body ? { body } : undefined));
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------

export async function reorderResource(resourceKey: ResourceKey, items: ReorderItemRequest[]): Promise<void> {
  const definition = getResourceDefinition(resourceKey);
  await unwrap(client.patch<void>(`${definition.apiPath}/reorder`, items));
}

// ---------------------------------------------------------------------------
// Account move (ゲーム機間アカウント移行)
// ---------------------------------------------------------------------------

export async function moveAccountBetweenConsoles(payload: MoveAccountBetweenConsolesRequest): Promise<void> {
  await unwrap(client.post<void>('/api/Accounts/move', payload));
}

// ---------------------------------------------------------------------------
// Re-export client for internal use by sibling modules
// ---------------------------------------------------------------------------

export { client };
export { getErrorMessage };
