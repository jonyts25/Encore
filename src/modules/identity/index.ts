export {
  canMarkArtistFavorite,
  countFavoriteArtists,
  getFavoriteArtistIds,
  MAX_FAVORITE_ARTISTS,
  setArtistFavorite,
} from './userArtists';
export { hasEntitlement } from './hasEntitlement';
export { useProfile } from './hooks/useProfile';
export { useSession } from './hooks/useSession';
export { SessionProvider } from './SessionProvider';
export type { AuthStatus } from './sessionStatus';
export type { EntitlementFeature, Profile, SignUpResult, SystemRole } from './types';
