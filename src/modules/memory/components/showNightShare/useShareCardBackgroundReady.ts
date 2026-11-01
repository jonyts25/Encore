import { useCallback, useEffect, useState } from 'react';

import type { ShowNightShareCardModel } from '../../showNightShareCardLogic';

export function useShareCardBackgroundReady(
  model: ShowNightShareCardModel,
  onVisualReady?: () => void
): {
  backgroundLoaded: boolean;
  onBackgroundLoad: () => void;
  onFallbackLoad: () => void;
} {
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [fallbackLoaded, setFallbackLoaded] = useState(false);

  const hasBackground = Boolean(model.backgroundUri);
  const hasFallback = Boolean(model.fallbackArtistImageUrl);

  const visualReady = hasBackground ? backgroundLoaded : hasFallback ? fallbackLoaded : true;

  useEffect(() => {
    setBackgroundLoaded(false);
    setFallbackLoaded(false);
  }, [model.backgroundUri, model.fallbackArtistImageUrl]);

  useEffect(() => {
    if (visualReady) {
      onVisualReady?.();
    }
  }, [onVisualReady, visualReady]);

  const onBackgroundLoad = useCallback(() => setBackgroundLoaded(true), []);
  const onFallbackLoad = useCallback(() => setFallbackLoaded(true), []);

  return { backgroundLoaded, onBackgroundLoad, onFallbackLoad };
}
