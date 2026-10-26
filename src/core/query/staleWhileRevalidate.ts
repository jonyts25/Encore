export function createStaleWhileRevalidateQueryFn<T>(options: {
  fetchFresh: () => Promise<T>;
  readCache: () => Promise<T | null>;
  writeCache: (value: T) => Promise<void>;
}): () => Promise<T> {
  return async () => {
    try {
      const fresh = await options.fetchFresh();
      await options.writeCache(fresh);
      return fresh;
    } catch (error) {
      const cached = await options.readCache();
      if (cached != null) {
        return cached;
      }
      throw error;
    }
  };
}
