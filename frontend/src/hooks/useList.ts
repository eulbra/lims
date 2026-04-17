import { useState, useCallback, useEffect } from "react";
import type { Pageable } from "../api/types";

interface UseListOptions<T> {
  /** API fetch function that accepts (limit, offset, search) and returns { data: Pageable<T> } */
  fetchFn: (params: { limit: number; offset: number; search?: string }) => Promise<{ data: Pageable<T> }>;
  /** Initial page size */
  pageSize?: number;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
  /** Extra query params merged into every request */
  extraParams?: Record<string, unknown>;
}

interface UseListReturn<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  search: string;
  refetch: () => void;
  goToPage: (page: number) => void;
  setSearch: (search: string) => void;
}

export function useList<T>(options: UseListOptions<T>): UseListReturn<T> {
  const { fetchFn, pageSize = 50, autoFetch = true, extraParams = {} } = options;

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const params = { limit: pageSize, offset, search: search || undefined, ...extraParams };
      const { data } = await fetchFn(params);
      setItems(data.results);
      setTotal(data.count);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, pageSize, search, extraParams]);

  useEffect(() => {
    if (autoFetch) fetch();
  }, [fetch, autoFetch]);

  return {
    items, total, page, pageSize, loading, error, search,
    refetch: fetch,
    goToPage: setPage,
    setSearch,
  };
}

export function usePaginated<T>(
  fetchFn: (params: { page: number; size: number; search?: string; ordering?: string }) => Promise<{ data: Pageable<T> }>,
  options?: { autoFetch?: boolean; ordering?: string }
) {
  const { autoFetch = true, ordering } = options || {};

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetch = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const { data } = await fetchFn({ page: p, size: 50, search: s || undefined, ordering });
      setItems(data.results);
      setTotal(data.count);
      setPage(p);
      setSearch(s);
    } catch {
      /* error handled by caller */
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, search, ordering]);

  useEffect(() => {
    if (autoFetch) fetch();
  }, [fetch, autoFetch]);

  return { items, total, page, loading, search, fetch, setPage, setSearch };
}
