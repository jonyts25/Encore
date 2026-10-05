import type { VenueKind } from '../types';

export type EtiquetteTip = {
  id: string;
  messageKey: string;
};

export const ETIQUETTE_TIPS_BY_VENUE: Record<VenueKind, EtiquetteTip[]> = {
  arena: [
    { id: 'arena-1', messageKey: 'prep.etiquette.arena.tip1' },
    { id: 'arena-2', messageKey: 'prep.etiquette.arena.tip2' },
    { id: 'arena-3', messageKey: 'prep.etiquette.arena.tip3' },
  ],
  teatro: [
    { id: 'teatro-1', messageKey: 'prep.etiquette.teatro.tip1' },
    { id: 'teatro-2', messageKey: 'prep.etiquette.teatro.tip2' },
    { id: 'teatro-3', messageKey: 'prep.etiquette.teatro.tip3' },
  ],
  festival: [
    { id: 'festival-1', messageKey: 'prep.etiquette.festival.tip1' },
    { id: 'festival-2', messageKey: 'prep.etiquette.festival.tip2' },
    { id: 'festival-3', messageKey: 'prep.etiquette.festival.tip3' },
  ],
  generic: [
    { id: 'generic-1', messageKey: 'prep.etiquette.generic.tip1' },
    { id: 'generic-2', messageKey: 'prep.etiquette.generic.tip2' },
    { id: 'generic-3', messageKey: 'prep.etiquette.generic.tip3' },
  ],
};

export function getEtiquetteTips(venueKind: VenueKind): EtiquetteTip[] {
  return ETIQUETTE_TIPS_BY_VENUE[venueKind];
}
