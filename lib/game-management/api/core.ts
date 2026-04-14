import { createFrontendApiClient } from '@/lib/api/frontend-client';
import resources from '@/lib/resources';
import { getResourceDefinition } from '@/lib/game-management/resources';
import type { MoveAccountBetweenConsolesRequest, ReorderItemRequest, ResourceKey } from '@/lib/game-management/types';

const client = createFrontendApiClient('game-library-api');

type MessageTemplate = {
  title: string;
  detail?: string;
};

type GameManagementErrorOptions = {
  fallback: MessageTemplate;
  adminFallback?: MessageTemplate;
};

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public code: string;
  public statusCode: number | null;
  public details?: unknown;

  constructor(statusCode: number | null, message: string, details?: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code ?? (statusCode != null ? `HTTP_${statusCode}` : 'UNKNOWN_ERROR');
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Error message helpers
// ---------------------------------------------------------------------------

function formatMessageParts(title: string, detail?: string | null): string {
  return [title, detail].filter((value): value is string => Boolean(value)).join('\n');
}

export function extractServerDetail(details: unknown): string | null {
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

function hasDisplayOrderConflict(details: unknown): boolean {
  if (!details || typeof details !== 'object') {
    return false;
  }

  const candidate = details as { errors?: Record<string, string[]> };
  if (!candidate.errors || typeof candidate.errors !== 'object') {
    return false;
  }

  return Object.entries(candidate.errors).some(([key, values]) => (
    /display.?order/i.test(key)
    && values.some((value) => /duplicate|duplicated|conflict|重複/i.test(value))
  ));
}

function getGenericTemplateForCode(code: string): MessageTemplate {
  const generic = resources.apiError.generic;

  switch (code) {
    case 'TIMEOUT':
      return { title: generic.timeout, detail: generic.timeoutDetail };
    case 'NETWORK_ERROR':
    case 'FETCH_ERROR':
      return { title: generic.network, detail: generic.networkDetail };
    case 'INVALID_RESPONSE':
      return { title: generic.invalidResponse, detail: generic.invalidResponseDetail };
    default:
      return { title: generic.unexpected, detail: generic.unexpectedDetail };
  }
}

export function getLocalizedErrorMessage(
  statusCode: number | null,
  details: unknown,
  operation?: 'fetch' | 'create' | 'update' | 'delete',
): string {
  const res = resources.apiError;
  const statusMessage = statusCode != null ? res.status[statusCode] : undefined;
  const statusDetail = statusCode != null ? res.statusDetail[statusCode] : undefined;
  const opPrefix = operation ? res.operation[operation] : undefined;
  const base = statusMessage ?? opPrefix ?? res.fallback;
  const supplement = extractServerDetail(details) ?? statusDetail;
  return formatMessageParts(base, supplement);
}

export function getGameManagementErrorMessage(error: unknown, options: GameManagementErrorOptions): string {
  if (!(error instanceof ApiError)) {
    return formatMessageParts(options.fallback.title, options.fallback.detail);
  }

  if (error.statusCode === 403 && options.adminFallback) {
    return formatMessageParts(options.adminFallback.title, options.adminFallback.detail);
  }

  const serverDetail = extractServerDetail(error.details);

  if ((error.statusCode === 400 || error.statusCode === 422) && hasDisplayOrderConflict(error.details)) {
    return formatMessageParts(
      options.fallback.title,
      '表示順が重複しています。最新の並びを確認し、重複しない順序で保存してください。',
    );
  }

  if (error.statusCode === 400 || error.statusCode === 422) {
    return formatMessageParts(
      options.fallback.title,
      serverDetail ?? options.fallback.detail ?? resources.apiError.statusDetail[error.statusCode],
    );
  }

  if (error.statusCode != null && resources.apiError.status[error.statusCode]) {
    return formatMessageParts(
      options.fallback.title,
      options.fallback.detail ?? resources.apiError.statusDetail[error.statusCode],
    );
  }

  const genericTemplate = getGenericTemplateForCode(error.code);
  return formatMessageParts(options.fallback.title, options.fallback.detail ?? genericTemplate.detail);
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
      response.error.code,
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
