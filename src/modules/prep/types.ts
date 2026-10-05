export type VenueKind = 'arena' | 'teatro' | 'festival' | 'generic';

export type CountdownMilestone = 'days_left' | 'tomorrow' | 'today' | 'past';

export type CountdownState = {
  daysUntil: number;
  milestone: CountdownMilestone;
};

export type ChecklistItemId = 'transport' | 'battery' | 'cash' | 'outfit';

export type ChecklistItem = {
  id: ChecklistItemId;
  checked: boolean;
};

export type StoredChecklist = {
  showId: string;
  items: ChecklistItem[];
  updatedAt: string;
};
