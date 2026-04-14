'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchPublicMasterLookups,
  fetchPublicSaveDataSchema,
  fetchPublicStoryProgressSchema,
} from '@/lib/game-management/api/public';
import type {
  MasterLookups,
  SaveDataSchemaDto,
  StoryProgressSchemaDto,
} from '@/lib/game-management/types';

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

type ResolvedState<T> = {
  data: T | null;
  error: string | null;
  requestKey: symbol | null;
};

type AsyncRequest<T> = {
  key: symbol;
  load: () => Promise<T>;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'データの取得に失敗しました。';
}

function useAsyncResource<T>(
  enabled: boolean,
  load: () => Promise<T>,
): AsyncState<T> {
  const [state, setState] = useState<ResolvedState<T>>({
    data: null,
    error: null,
    requestKey: null,
  });
  const request = useMemo<AsyncRequest<T> | null>(() => (
    enabled ? { key: Symbol('async-resource'), load } : null
  ), [enabled, load]);

  useEffect(() => {
    if (request == null) {
      return;
    }

    let cancelled = false;

    void request.load()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setState({ data, error: null, requestKey: request.key });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setState({ data: null, error: toErrorMessage(error), requestKey: request.key });
      });

    return () => {
      cancelled = true;
    };
  }, [request]);

  if (request == null) {
    return { data: null, error: null, loading: false };
  }

  const loading = state.requestKey !== request.key;

  return {
    data: state.data,
    error: loading ? null : state.error,
    loading,
  };
}

export function usePublicMasterLookups(enabled = true): AsyncState<MasterLookups> {
  const load = useCallback(() => fetchPublicMasterLookups(), []);
  return useAsyncResource(enabled, load);
}

export function usePublicSaveDataSchema(gameSoftwareMasterId: number | null): AsyncState<SaveDataSchemaDto> {
  const load = useCallback(() => fetchPublicSaveDataSchema(gameSoftwareMasterId as number), [gameSoftwareMasterId]);
  return useAsyncResource(
    gameSoftwareMasterId != null,
    load,
  );
}

export function usePublicStoryProgressSchema(gameSoftwareMasterId: number | null): AsyncState<StoryProgressSchemaDto> {
  const load = useCallback(() => fetchPublicStoryProgressSchema(gameSoftwareMasterId as number), [gameSoftwareMasterId]);
  return useAsyncResource(
    gameSoftwareMasterId != null,
    load,
  );
}