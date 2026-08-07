import { describe, expect, it } from 'vitest';
import {
  isPokemonDamageCalculatorAnonymousAccess,
  parseServiceProxyPathname,
} from './proxy-policy';

describe('pokemon damage calculator proxy policy', () => {
  it('parses service proxy pathnames', () => {
    expect(parseServiceProxyPathname('/api/services/pokemon-damage-calculator-api/api/runs/abc/battles')).toEqual({
      service: 'pokemon-damage-calculator-api',
      method: 'GET',
      pathSegments: ['api', 'runs', 'abc', 'battles'],
    });
    expect(parseServiceProxyPathname('/pokemon-damage-calculator')).toBeNull();
  });

  it('keeps proxy and route allowlist matrix aligned', () => {
    const allowed = [
      ['GET', ['api', 'rule-sets']],
      ['GET', ['api', 'runs']],
      ['GET', ['api', 'runs', 'run-1']],
      ['GET', ['api', 'runs', 'run-1', 'battles']],
      ['GET', ['api', 'runs', 'run-1', 'party-state']],
    ] as const;

    const denied = [
      ['GET', ['api', 'rule-sets', 'rule-1']],
      ['POST', ['api', 'runs']],
      ['PUT', ['api', 'runs', 'run-1']],
      ['DELETE', ['api', 'runs', 'run-1']],
      ['POST', ['api', 'runs', 'run-1', 'battles']],
      ['PUT', ['api', 'runs', 'run-1', 'battles', 'battle-1']],
      ['DELETE', ['api', 'runs', 'run-1', 'battles', 'battle-1']],
      ['POST', ['api', 'runs', 'run-1', 'party-state']],
      ['POST', ['api', 'runs', 'run-1', 'battles', 'battle-1', 'calculate']],
    ] as const;

    for (const [method, pathSegments] of allowed) {
      expect(isPokemonDamageCalculatorAnonymousAccess({
        service: 'pokemon-damage-calculator-api',
        method,
        pathSegments: [...pathSegments],
      })).toBe(true);
    }

    for (const [method, pathSegments] of denied) {
      expect(isPokemonDamageCalculatorAnonymousAccess({
        service: 'pokemon-damage-calculator-api',
        method,
        pathSegments: [...pathSegments],
      })).toBe(false);
    }
  });
});

