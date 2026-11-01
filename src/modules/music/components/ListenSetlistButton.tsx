import { useState } from 'react';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';

import { buildSetlistSearchQuery } from '../streamingLinks';
import { useOpenMusicSearch } from '../useOpenMusicSearch';

type ListenSetlistButtonProps = {
  artistName: string;
  artistId?: string | null;
  tourId?: string | null;
};

export function ListenSetlistButton({ artistName, artistId, tourId }: ListenSetlistButtonProps) {
  const { t } = useTranslation();
  const { openSearch } = useOpenMusicSearch();
  const [resolving, setResolving] = useState(false);

  return (
    <PillButton
      disabled={resolving}
      title={resolving ? t('common.loading') : t('musicStreaming.viewOnAppleMusic')}
      variant="secondary"
      onPress={() =>
        openSearch(buildSetlistSearchQuery(artistName), {
          dialogTitle: t('musicStreaming.viewOnAppleMusic'),
          intent: 'setlist',
          appleMusicArtistPage: true,
          artistName,
          artistId,
          tourId,
          onResolveStart: () => setResolving(true),
          onResolveEnd: () => setResolving(false),
        })
      }
    />
  );
}
