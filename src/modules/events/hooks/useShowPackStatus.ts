import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/core/i18n';
import { getShowPackRecord, type ShowPackRecord } from '@/core/db/showPackCache';

import { showPackProgressLabel } from '../showPackLogic';
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

  const missingTitlesLine = useMemo(() => {
    if (!record?.lyricsMissingTitles.length) return null;
    const preview = record.lyricsMissingTitles.slice(0, 4).join(', ');
    const suffix =
      record.lyricsMissingTitles.length > 4
        ? ` +${record.lyricsMissingTitles.length - 4}`
        : '';
    return t('events.showPackMissingLyrics', { titles: `${preview}${suffix}` });
  }, [record?.lyricsMissingTitles, t]);

  let label: string | null = null;
  let isPartial = false;
  let canRetry = false;

  const progress = record ? showPackProgressLabel(record) : null;

  if (record?.status === 'downloading') {
    label = progress
      ? t(progress.key, {
          cached: progress.cached,
          total: progress.total,
          retrying: progress.retrying,
        })
      : t('offline.showPackDownloading');
    canRetry = true;
  } else if (record?.status === 'partial') {
    isPartial = true;
    canRetry = true;
    label = progress
      ? t(progress.key, {
          cached: progress.cached,
          total: progress.total,
          retrying: progress.retrying,
        })
      : t('offline.showPackPartial');
  } else if (record?.status === 'ready') {
    if (progress?.retrying) {
      label = t(progress.key, {
        cached: progress.cached,
        total: progress.total,
        retrying: progress.retrying,
      });
    } else {
      label = t('events.showPackReadyForShow');
    }
    canRetry = Boolean(
      record.lyricsMissingTitles.length > 0 ||
        record.lyricsFailed > 0 ||
        record.lyricsBusyTitles.length > 0
    );
  }

  return { record, label, missingTitlesLine, isPartial, canRetry, retry, refresh };
}
