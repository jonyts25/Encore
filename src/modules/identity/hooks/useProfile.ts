import { useCallback, useEffect, useState } from 'react';

import { fetchProfile, resolveRole } from '../api';
import { applyProfileLocale, updateLastKnownDisplayName, useSessionContext } from '../SessionProvider';
import type { Profile } from '../types';

export function useProfile() {
  const { user, isGuest, isOfflineSession, lastKnownUser } = useSessionContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setError(null);
      return;
    }

    if (isOfflineSession) {
      setProfile({
        user_id: user.id,
        display_name: lastKnownUser?.display_name ?? user.email?.split('@')[0] ?? 'Fan',
        locale: 'es',
        home_city: null,
        role: 'user',
      });
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextProfile = await fetchProfile(user.id);
      setProfile(nextProfile);
      applyProfileLocale(nextProfile?.locale);
      if (nextProfile?.display_name) {
        updateLastKnownDisplayName(nextProfile.display_name);
      }
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isOfflineSession, lastKnownUser?.display_name, user]);

  useEffect(() => {
    if (isGuest) {
      setProfile(null);
      setError(null);
      return;
    }
    void refetch();
  }, [isGuest, refetch]);

  return {
    profile,
    isLoading,
    error,
    refetch,
    role: resolveRole(profile, user),
  };
}
