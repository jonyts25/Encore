export type UserShowStatus = 'interesado' | 'voy' | 'fui' | 'no_fui';

const STATUS_RANK: Record<UserShowStatus, number> = {
  fui: 4,
  voy: 3,
  interesado: 2,
  no_fui: 1,
};

export function pickPreferredUserShowStatus(
  left: UserShowStatus,
  right: UserShowStatus
): UserShowStatus {
  return STATUS_RANK[left] >= STATUS_RANK[right] ? left : right;
}
