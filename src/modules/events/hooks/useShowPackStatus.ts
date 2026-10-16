import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/core/i18n';
import { getShowPackRecord, type ShowPackRecord } from '@/core/db/showPackCache';

import { prefetchShowPack } from '../showPack';
import type { Show } from '../types';

export function useShowPackStatus(show: Show | null, enabled: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showId = show?.id ?? '';
  const [record, setRecord] = useState<ShowPackRecord | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !showId) {
      setRecord(null);
      return;
    }
    const next = await getShowPackRecord(showId);
    setRecord(next);
  }, [enabled, showId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !showId || record?.status !== 'downloading') return;

    const interval = setInterval(() => {
      void refresh();
    }, 1500);

    return () => clearInterval(interval);
  }, [enabled, record?.status, refresh, showId]);

  const retry = useCallback(() => {
    if (!show) return;
    void prefetchShowPack(show, queryClient, { force: true }).finally(() => {
      void refresh();
    });
  }, [queryClient, refresh, show]);

  let label: string | null = null;
  let isPartial = false;

  if (record?.status === 'downloading') {
    label = t('offline.showPackDownloading');
  } else if (record?.status === 'partial') {
    isPartial = true;
    label = t('offline.showPackPartial');
  } else if (record?.status === 'ready' && record.lyricsTotal > 0) {
    label = t('offline.showPackReady', {
      cached: record.lyricsCached,
      total: record.lyricsTotal,
    });
  } else if (record?.status === 'ready') {
    label = t('offline.showPackReadyEmpty');
  }

  return { record, label, isPartial, retry, refresh };
}
