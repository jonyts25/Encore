import { useCallback, useEffect, useState } from 'react';

import { fetchProfile, resolveRole } from '../api';
import { applyProfileLocale, useSessionContext } from '../SessionProvider';
import type { Profile } from '../types';

export function useProfile() {
  const { user, isGuest } = useSessionContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextProfile = await fetchProfile(user.id);
      setProfile(nextProfile);
      applyProfileLocale(nextProfile?.locale);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
