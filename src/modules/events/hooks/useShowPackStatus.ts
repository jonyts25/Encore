import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/core/i18n';
import { getShowPackRecord, type ShowPackRecord } from '@/core/db/showPackCache';

import { showPackProgressLabel } from '../showPackLogic';

function resolveShowPackCardTitle(
  record: ShowPackRecord,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null {
  const progress = showPackProgressLabel(record);

  if (record.status === 'downloading' || record.status === 'partial') {
    return progress
      ? t(progress.key, {
          cached: progress.cached,
          total: progress.total,
          retrying: progress.retrying,
        })
      : t('offline.showPackDownloading');
  }

  if (record.status === 'ready') {
    if (record.lyricsTotal === 0) {
      return t('events.showPackNoSongsYet');
    }
    if (record.lyricsCached === 0) {
      return progress
        ? t(progress.key, {
            cached: progress.cached,
            total: progress.total,
            retrying: progress.retrying,
          })
        : t('events.showPackNoSongsYet');
    }
    if (record.lyricsCached >= record.lyricsTotal) {
      return t('events.showPackAllLyricsReady', {
        cached: record.lyricsCached,
        total: record.lyricsTotal,
      });
    }
    return progress
      ? t(progress.key, {
          cached: progress.cached,
          total: progress.total,
          retrying: progress.retrying,
        })
      : null;
  }

  return null;
}
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

  let label: string | null = record ? resolveShowPackCardTitle(record, t) : null;
  let isPartial = record?.status === 'partial';
  let canRetry = false;

  if (record?.status === 'downloading') {
    canRetry = true;
  } else if (record?.status === 'partial') {
    canRetry = true;
    if (!label) label = t('offline.showPackPartial');
  } else if (record?.status === 'ready') {
    canRetry = Boolean(
      record.lyricsMissingTitles.length > 0 ||
        record.lyricsFailed > 0 ||
        record.lyricsBusyTitles.length > 0 ||
        (record.lyricsTotal > 0 && record.lyricsCached < record.lyricsTotal)
    );
  }

  const packUpdatedAt =
    record && record.lyricsCached > 0 && record.downloadedAt
      ? record.downloadedAt
      : record?.statusUpdatedAt ?? 0;

  return {
    record,
    label,
    missingTitlesLine,
    isPartial,
    canRetry,
    retry,
    refresh,
    packUpdatedAt,
  };
}
