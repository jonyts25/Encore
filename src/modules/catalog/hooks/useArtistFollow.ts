import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/modules/identity';

import { followArtist, getArtistFollow, unfollowArtist } from '../api';
import type { ArtistFollowState } from '../types';

export function useArtistFollow(artistId: string) {
  const { user, isGuest } = useSession();
  const [state, setState] = useState<ArtistFollowState>({
    isFollowing: false,
    followedAt: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (isGuest || !user) {
      setState({ isFollowing: false, followedAt: null });
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const row = await getArtistFollow(user.id, artistId);
      setState({
        isFollowing: Boolean(row),
        followedAt: row?.followed_at ?? null,
      });
    } catch (err) {
      setState({ isFollowing: false, followedAt: null });
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [artistId, isGuest, user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const follow = useCallback(async () => {
    if (!user) return;
    setIsMutating(true);
    setError(null);
    try {
      const row = await followArtist(user.id, artistId);
      setState({ isFollowing: true, followedAt: row.followed_at });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [artistId, user]);

  const unfollow = useCallback(async () => {
    if (!user) return;
    setIsMutating(true);
    setError(null);
    try {
      await unfollowArtist(user.id, artistId);
      setState({ isFollowing: false, followedAt: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [artistId, user]);

  return {
    ...state,
    isLoading,
    isMutating,
    error,
    refetch,
    follow,
    unfollow,
    requiresAuth: isGuest,
  };
}
