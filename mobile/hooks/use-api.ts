// Generic data-fetching hook with loading / error / pull-to-refresh state.
// Pass a stable (module-level) fetcher so the effect does not re-run unexpectedly.

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/services/api';

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
};

function messageFor(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

export function useApi<T>(fetcher: () => Promise<T>): ApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        const result = await fetcher();
        if (!mounted.current) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (mounted.current) setError(messageFor(err));
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetcher],
  );

  useEffect(() => {
    void run(false);
  }, [run]);

  const refresh = useCallback(() => {
    void run(true);
  }, [run]);

  return { data, error, loading, refreshing, refresh };
}
