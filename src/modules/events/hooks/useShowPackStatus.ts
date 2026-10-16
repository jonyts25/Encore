import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/core/i18n';
import { getShowPackRecord, type ShowPackRecord } from '@/core/db/showPackCache';

export function useShowPackStatus(showId: string, enabled: boolean) {
  const { t } = useTranslation();
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

  let label: string | null = null;
  if (record?.status === 'downloading') {
    label = t('offline.showPackDownloading');
  } else if (record?.status === 'ready' && record.lyricsTotal > 0) {
    label = t('offline.showPackReady', {
      cached: record.lyricsCached,
      total: record.lyricsTotal,
    });
  } else if (record?.status === 'ready') {
    label = t('offline.showPackReadyEmpty');
  }

  return { record, label, refresh };
}
