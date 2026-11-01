import type { ImageSource } from 'expo-image';

import type { ShowNightShareCardModel, ShowNightShareTemplateId } from '../showNightShareCardLogic';
import type { ShowNightShareFrameTransform } from '../showNightShareMediaPreference';
import { ShowNightShareBoletoTemplate } from './showNightShare/ShowNightShareBoletoTemplate';
import { ShowNightSharePosterTemplate } from './showNightShare/ShowNightSharePosterTemplate';
import { ShowNightShareSetlistTemplate } from './showNightShare/ShowNightShareSetlistTemplate';

export type ShowNightShareCardProps = {
  model: ShowNightShareCardModel;
  template: ShowNightShareTemplateId;
  mediaSource?: ImageSource | null;
  frame?: ShowNightShareFrameTransform;
  interactive?: boolean;
  onFrameChange?: (frame: ShowNightShareFrameTransform) => void;
  onMediaLoad?: () => void;
  onVisualReady?: () => void;
  fontsReady?: boolean;
  onToggleHighlight?: (songId: string) => void;
};

export function ShowNightShareCard({
  model,
  template,
  mediaSource = null,
  frame = { scale: 1, translateX: 0, translateY: 0 },
  interactive = false,
  onFrameChange,
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
          interactive={Boolean(interactive && onToggleHighlight)}
          model={model}
          onToggleHighlight={onToggleHighlight}
          onVisualReady={onVisualReady}
        />
      );
    case 'poster':
      return (
        <ShowNightSharePosterTemplate
          mediaSource={mediaSource}
          frame={frame}
          interactive={interactive}
          model={model}
          onFrameChange={onFrameChange}
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
          mediaSource={mediaSource}
          frame={frame}
          interactive={interactive}
          model={model}
          onFrameChange={onFrameChange}
          onMediaLoad={() => {
            onMediaLoad?.();
            onVisualReady?.();
          }}
        />
      );
  }
}
