import type { VenueSummary } from '@/modules/events';

import type { VenueKind } from '../types';

export function inferVenueKind(venue: VenueSummary): VenueKind {
  const name = venue.name.toLowerCase();

  if (name.includes('festival') || name.includes('fest ') || name.endsWith(' fest')) {
    return 'festival';
  }

  if (name.includes('teatro') || name.includes('theater') || name.includes('theatre')) {
    return 'teatro';
  }

  if (
    name.includes('arena') ||
    name.includes('estadio') ||
    name.includes('stadium') ||
    name.includes('foro sol')
  ) {
    return 'arena';
  }

  if (venue.capacity != null) {
    if (venue.capacity >= 8000) return 'arena';
    if (venue.capacity <= 3500) return 'teatro';
  }

  if (name.includes('auditorio')) {
    return 'teatro';
  }

  return 'generic';
}
