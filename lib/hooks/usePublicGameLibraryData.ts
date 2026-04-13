'use client';

import { useCallback, useEffect, useState } from 'react';

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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'データの取得に失敗しました。';
}

function useAsyncResource<T>(
  enabled: boolean,
  load: () => Promise<T>,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: enabled,
  });

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    void load()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setState({ data: null, error: toErrorMessage(error), loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, load]);

  return state;
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