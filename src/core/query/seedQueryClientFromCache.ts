import type { QueryClient, QueryKey } from '@tanstack/react-query';

export function queryClientHasData(queryClient: QueryClient, queryKey: QueryKey): boolean {
  return queryClient.getQueryData(queryKey) !== undefined;
}

/** Seed React Query from SQLite only when the query has no data yet (before and after await). */
export async function seedQueryClientFromCache<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  read: () => Promise<T | null | undefined>,
  accept?: (value: T) => boolean
): Promise<void> {
  if (!queryClientHasData(queryClient, queryKey)) {
    const value = await read();
    if (!queryClientHasData(queryClient, queryKey) && value != null) {
      if (!accept || accept(value)) {
        queryClient.setQueryData(queryKey, value);
      }
    }
  }
}
