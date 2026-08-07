import type {
  ProblemDetails,
  ValidationProblemDetails,
} from '@/lib/game-management/types';

function normalizeFieldKey(fieldName: string): string {
  if (!fieldName) {
    return fieldName;
  }

  return `${fieldName.charAt(0).toLowerCase()}${fieldName.slice(1)}`;
}

function isProblemDetailsLike(details: unknown): details is ProblemDetails {
  return details != null && typeof details === 'object';
}

export function getProblemDetails(details: unknown): ProblemDetails | ValidationProblemDetails | null {
  if (!isProblemDetailsLike(details)) {
    return null;
  }

  return details as ProblemDetails | ValidationProblemDetails;
}

export function extractProblemFieldErrors(details: unknown): Record<string, string[]> {
  const candidate = getProblemDetails(details);
  if (!candidate) {
    return {};
  }

  const errorMap = new Map<string, string[]>();
  const appendError = (fieldName: string | undefined, message: string | undefined) => {
    if (!fieldName || !message) {
      return;
    }

    const normalizedFieldName = normalizeFieldKey(fieldName);
    const existing = errorMap.get(normalizedFieldName) ?? [];
    if (!existing.includes(message)) {
      existing.push(message);
      errorMap.set(normalizedFieldName, existing);
    }
  };

  const validationErrors = (candidate as ValidationProblemDetails).errors;
  if (validationErrors) {
    for (const [fieldName, messages] of Object.entries(validationErrors)) {
      for (const message of messages) {
        appendError(fieldName, message);
      }
    }
  }

  for (const detail of candidate.errorDetails ?? []) {
    appendError(detail.field, detail.userMessage || detail.message);
  }

  return Object.fromEntries(errorMap);
}

export function extractServerDetail(details: unknown): string | null {
  const candidate = getProblemDetails(details);
  if (!candidate) return null;

  if (candidate.errorDetails && candidate.errorDetails.length > 0) {
    const lines = candidate.errorDetails.flatMap((detail) => {
      const prefix = detail.fieldLabel ?? detail.field;
      const primary = detail.userMessage || detail.message;
      const line = prefix ? `${prefix}: ${primary}` : primary;
      return detail.suggestedAction ? [line, `対応: ${detail.suggestedAction}`] : [line];
    });

    if (candidate.traceId) {
      lines.push(`Trace ID: ${candidate.traceId}`);
    }

    if (lines.length > 0) {
      return lines.join('\n');
    }
  }

  if (candidate.detail) return candidate.detail;
  const validationErrors = (candidate as ValidationProblemDetails).errors;
  if (validationErrors) {
    const lines = Object.entries(validationErrors)
      .flatMap(([key, values]) => values.map((value) => `${key}: ${value}`));
    if (lines.length > 0) return lines.join('\n');
  }
  if (candidate.title) return candidate.title;
  return null;
}
