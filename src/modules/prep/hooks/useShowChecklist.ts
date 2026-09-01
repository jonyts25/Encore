import { useCallback, useEffect, useState } from 'react';

import { loadChecklist, saveChecklist, resetChecklist } from '../storage/checklist-db';
import type { ChecklistItem, ChecklistItemId } from '../types';

export function useShowChecklist(showId: string, enabled: boolean) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const stored = await loadChecklist(showId);
      setItems(stored);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, showId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const toggleItem = useCallback(
    async (itemId: ChecklistItemId) => {
      if (!enabled) return;

      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      setItems(nextItems);

      try {
        await saveChecklist(showId, nextItems);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        await refetch();
      }
    },
    [enabled, items, refetch, showId]
  );

  const reset = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);
    try {
      const defaults = await resetChecklist(showId);
      setItems(defaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, showId]);

  return {
    items,
    isLoading,
    error,
    toggleItem,
    reset,
    refetch,
  };
}
