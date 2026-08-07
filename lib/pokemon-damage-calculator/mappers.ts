import type {
  BattleDto,
  CalculationResultDto,
  CalculationResultViewModel,
  ParsedJsonValue,
  RuleSetDto,
  RunDto,
} from './types';

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'ja');
}

export function safeParseJsonValue(value: string | null | undefined): ParsedJsonValue {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ParsedJsonValue;
  } catch {
    return null;
  }
}

export function mapCalculationResult(result: CalculationResultDto): CalculationResultViewModel {
  return {
    ...result,
    parsedAttackerParams: safeParseJsonValue(result.attackerParams),
    parsedDefenderParams: safeParseJsonValue(result.defenderParams),
  };
}

export function sortRuleSets(ruleSets: RuleSetDto[]): RuleSetDto[] {
  return [...ruleSets].sort((left, right) => (
    right.generation - left.generation
    || compareText(left.title, right.title)
    || compareText(left.version, right.version)
  ));
}

export function sortRuns(runs: RunDto[]): RunDto[] {
  return [...runs].sort((left, right) => (
    compareText(left.name, right.name)
    || compareText(left.status, right.status)
    || compareText(left.id, right.id)
  ));
}

export function sortBattles(battles: BattleDto[]): BattleDto[] {
  return [...battles].sort((left, right) => (
    left.sequence - right.sequence
    || compareText(left.enemyPokemon, right.enemyPokemon)
    || compareText(left.id, right.id)
  ));
}

export function formatRuleSetLabel(ruleSet: RuleSetDto): string {
  return `Gen ${ruleSet.generation} / ${ruleSet.title} ${ruleSet.version}`;
}

