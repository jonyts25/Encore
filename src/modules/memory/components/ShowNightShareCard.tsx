import type { ImageContentPosition, ImageSource } from 'expo-image';

import type { ShowNightShareCardModel, ShowNightShareTemplateId } from '../showNightShareCardLogic';
import { ShowNightShareBoletoTemplate } from './showNightShare/ShowNightShareBoletoTemplate';
import { ShowNightSharePosterTemplate } from './showNightShare/ShowNightSharePosterTemplate';
import { ShowNightShareSetlistTemplate } from './showNightShare/ShowNightShareSetlistTemplate';

export type ShowNightShareCardProps = {
  model: ShowNightShareCardModel;
  template: ShowNightShareTemplateId;
  mediaSource?: ImageSource | null;
  contentPosition?: ImageContentPosition;
  onMediaLoad?: () => void;
  onVisualReady?: () => void;
  fontsReady?: boolean;
  onToggleHighlight?: (songId: string) => void;
};

export function ShowNightShareCard({
  model,
  template,
  mediaSource = null,
  contentPosition = 'center',
  onMediaLoad,
  onVisualReady,
  fontsReady = true,
  onToggleHighlight,
}: ShowNightShareCardProps) {
  switch (template) {
    case 'setlist':
      return (
        <ShowNightShareSetlistTemplate
          fontsReady={fontsReady}
          interactive={Boolean(onToggleHighlight)}
          model={model}
          onToggleHighlight={onToggleHighlight}
          onVisualReady={onVisualReady}
        />
      );
    case 'poster':
      return (
        <ShowNightSharePosterTemplate
          contentPosition={contentPosition}
          mediaSource={mediaSource}
          model={model}
          onMediaLoad={() => {
            onMediaLoad?.();
            onVisualReady?.();
          }}
        />
      );
    case 'boleto':
    default:
      return (
        <ShowNightShareBoletoTemplate
          contentPosition={contentPosition}
          mediaSource={mediaSource}
          model={model}
          onMediaLoad={() => {
            onMediaLoad?.();
            onVisualReady?.();
          }}
        />
      );
  }
}
