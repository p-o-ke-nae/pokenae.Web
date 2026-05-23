import { createFrontendApiClient } from '@/lib/api/frontend-client';
import type { ApiResponse } from '@/lib/types/api';
import { POKEMON_DAMAGE_CALCULATOR_SERVICE_NAME } from '../constants';
import type {
  AdminRuleSetDto,
  AdminRuleSetUpsertRequest,
  AdminUserAuthorizationDto,
  AdminUserAuthorizationUpsertRequest,
  ProblemDetails,
} from './types';

const client = createFrontendApiClient(POKEMON_DAMAGE_CALCULATOR_SERVICE_NAME);

export class AdminApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number | null;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number | null, details?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getStatusCode(code: string): number | null {
  return code.startsWith('HTTP_') ? Number.parseInt(code.slice(5), 10) : null;
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return Boolean(value) && typeof value === 'object';
}

function formatProblemDetails(details: unknown, fallback: string): string {
  if (!isProblemDetails(details)) {
    return fallback;
  }

  return [details.title, details.detail].filter((value): value is string => Boolean(value)).join('\n') || fallback;
}

async function unwrap<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const response = await promise;

  if (response.success) {
    return response.data;
  }

  throw new AdminApiError(
    response.error.message,
    response.error.code,
    getStatusCode(response.error.code),
    response.error.details,
  );
}

export function getAdminApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    return formatProblemDetails(error.details, error.message || fallback);
  }

  return error instanceof Error ? error.message : fallback;
}

export function getAdminProblemDetailsMessage(details: unknown, fallback: string): string {
  return formatProblemDetails(details, fallback);
}

export function isAdminApiStatusError(error: unknown, statusCode: number): boolean {
  return error instanceof AdminApiError && error.statusCode === statusCode;
}

export function isAdminApiForbidden(error: unknown): boolean {
  return isAdminApiStatusError(error, 403);
}

export function isAdminApiUnauthorized(error: unknown): boolean {
  return isAdminApiStatusError(error, 401);
}

export function isAdminApiNotFound(error: unknown): boolean {
  return isAdminApiStatusError(error, 404);
}

export function isAdminApiConflict(error: unknown): boolean {
  return isAdminApiStatusError(error, 409);
}

export async function fetchAdminRuleSets(): Promise<AdminRuleSetDto[]> {
  return unwrap(client.get<AdminRuleSetDto[]>('/api/admin/rule-sets'));
}

export async function fetchAdminRuleSet(id: string): Promise<AdminRuleSetDto> {
  return unwrap(client.get<AdminRuleSetDto>(`/api/admin/rule-sets/${id}`));
}

export async function createAdminRuleSet(request: AdminRuleSetUpsertRequest): Promise<AdminRuleSetDto> {
  return unwrap(client.post<AdminRuleSetDto>('/api/admin/rule-sets', request));
}

export async function updateAdminRuleSet(id: string, request: AdminRuleSetUpsertRequest): Promise<AdminRuleSetDto> {
  return unwrap(client.put<AdminRuleSetDto>(`/api/admin/rule-sets/${id}`, request));
}

export async function deleteAdminRuleSet(id: string): Promise<void> {
  await unwrap(client.delete<void>(`/api/admin/rule-sets/${id}`));
}

export async function fetchAdminUserAuthorizations(): Promise<AdminUserAuthorizationDto[]> {
  return unwrap(client.get<AdminUserAuthorizationDto[]>('/api/admin/user-authorizations'));
}

export async function fetchAdminUserAuthorization(googleUserId: string): Promise<AdminUserAuthorizationDto> {
  return unwrap(client.get<AdminUserAuthorizationDto>(`/api/admin/user-authorizations/${encodeURIComponent(googleUserId)}`));
}

export async function createAdminUserAuthorization(
  request: AdminUserAuthorizationUpsertRequest,
): Promise<AdminUserAuthorizationDto> {
  return unwrap(client.post<AdminUserAuthorizationDto>('/api/admin/user-authorizations', request));
}

export async function updateAdminUserAuthorization(
  googleUserId: string,
  request: AdminUserAuthorizationUpsertRequest,
): Promise<AdminUserAuthorizationDto> {
  return unwrap(client.put<AdminUserAuthorizationDto>(`/api/admin/user-authorizations/${encodeURIComponent(googleUserId)}`, request));
}

export async function deleteAdminUserAuthorization(googleUserId: string): Promise<void> {
  await unwrap(client.delete<void>(`/api/admin/user-authorizations/${encodeURIComponent(googleUserId)}`));
}

