import type { EntitlementFeature, SystemRole } from './types';

const PRO_ENTITLEMENTS: EntitlementFeature[] = [
  'live_unlimited',
  'ai_guide',
  'ticket_alerts',
  'advanced_stats',
];

const STAFF_ROLES: SystemRole[] = ['admin', 'moderator'];

export function hasEntitlement(feature: EntitlementFeature, role: SystemRole): boolean {
  if (role === 'guest') return false;
  if (STAFF_ROLES.includes(role)) return true;
  if (role === 'pro') return PRO_ENTITLEMENTS.includes(feature);
  return false;
}
