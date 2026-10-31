import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';

import { buildSetlistSearchQuery } from '../streamingLinks';
import { useOpenMusicSearch } from '../useOpenMusicSearch';

type ListenSetlistButtonProps = {
  artistName: string;
};

export function ListenSetlistButton({ artistName }: ListenSetlistButtonProps) {
  const { t } = useTranslation();
  const { openSearch } = useOpenMusicSearch();

  return (
    <PillButton
      title={t('musicStreaming.listenSetlist')}
      variant="secondary"
      onPress={() =>
        openSearch(buildSetlistSearchQuery(artistName), t('musicStreaming.listenSetlist'))
      }
    />
  );
}
