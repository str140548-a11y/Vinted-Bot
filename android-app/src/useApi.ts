import { useCallback, useEffect, useState } from "react";

/**
 * Small data-fetching hook with loading/error/empty state and optional polling.
 * Keeps screens declarative and gives honest states everywhere.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  opts?: { pollMs?: number; deps?: unknown[] },
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const result = await fetcher();
        setData(result);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    opts?.deps ?? [],
  );

  useEffect(() => {
    load();
    if (opts?.pollMs) {
      const id = setInterval(() => load(), opts.pollMs);
      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { data, error, loading, refreshing, reload: () => load(), refresh: () => load(true) };
}
