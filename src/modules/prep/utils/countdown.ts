import type { CountdownMilestone, CountdownState } from '../types';

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDaysUntilShow(showDateIso: string, now = new Date()): number {
  const showDay = startOfLocalDay(new Date(showDateIso));
  const today = startOfLocalDay(now);
  const diffMs = showDay.getTime() - today.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function getCountdownState(showDateIso: string, now = new Date()): CountdownState {
  const daysUntil = getDaysUntilShow(showDateIso, now);

  let milestone: CountdownMilestone;
  if (daysUntil > 1) {
    milestone = 'days_left';
  } else if (daysUntil === 1) {
    milestone = 'tomorrow';
  } else if (daysUntil === 0) {
    milestone = 'today';
  } else {
    milestone = 'past';
  }

  return { daysUntil, milestone };
}

export function formatCountdownMessage(
  state: CountdownState,
  translate: (key: string, options?: Record<string, unknown>) => string
): string | null {
  switch (state.milestone) {
    case 'days_left':
      return translate('prep.countdown.daysLeft', { count: state.daysUntil });
    case 'tomorrow':
      return translate('prep.countdown.tomorrow');
    case 'today':
      return translate('prep.countdown.today');
    case 'past':
      return null;
    default:
      return null;
  }
}
