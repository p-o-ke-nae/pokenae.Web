import type { NextRequest } from 'next/server';
import { POKEMON_DAMAGE_CALCULATOR_SERVICE_NAME } from './constants';

export interface ServiceProxyRequestDescriptor {
  service: string;
  method: string;
  pathSegments: string[];
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function parseServiceProxyPathname(pathname: string): ServiceProxyRequestDescriptor | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length < 3 || segments[0] !== 'api' || segments[1] !== 'services') {
    return null;
  }

  const [,, service, ...pathSegments] = segments;

  if (!hasText(service)) {
    return null;
  }

  return {
    service,
    method: 'GET',
    pathSegments,
  };
}

export function isPokemonDamageCalculatorAnonymousAccess({
  service,
  method,
  pathSegments,
}: ServiceProxyRequestDescriptor): boolean {
  if (service !== POKEMON_DAMAGE_CALCULATOR_SERVICE_NAME || method.toUpperCase() !== 'GET') {
    return false;
  }

  if (pathSegments.length === 2 && pathSegments[0] === 'api' && pathSegments[1] === 'rule-sets') {
    return true;
  }

  if (pathSegments.length === 2 && pathSegments[0] === 'api' && pathSegments[1] === 'runs') {
    return true;
  }

  if (pathSegments.length === 3 && pathSegments[0] === 'api' && pathSegments[1] === 'runs' && hasText(pathSegments[2])) {
    return true;
  }

  if (
    pathSegments.length === 4
    && pathSegments[0] === 'api'
    && pathSegments[1] === 'runs'
    && hasText(pathSegments[2])
    && (pathSegments[3] === 'battles' || pathSegments[3] === 'party-state')
  ) {
    return true;
  }

  return false;
}

export function isAnonymousServiceProxyRequest(request: Pick<NextRequest, 'method' | 'nextUrl'>): boolean {
  const parsed = parseServiceProxyPathname(request.nextUrl.pathname);

  if (!parsed) {
    return false;
  }

  return isPokemonDamageCalculatorAnonymousAccess({
    ...parsed,
    method: request.method,
  });
}

