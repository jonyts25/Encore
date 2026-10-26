import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@/core/query';
import { useTranslation } from '@/core/i18n';
import { Card, PillButton, SectionHeader } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import { getArtistById, searchLocalArtists } from '@/modules/catalog';
import type { Artist } from '@/modules/catalog';
import { useSession } from '@/modules/identity';

import {
  fetchShowByIdFromSupabase,
  formatShowVenueLine,
  listUpcomingShowsForArtistFromSupabase,
  searchVenues,
  setShowStatus,
} from '../api';
import { createUserShow, type VenueCandidatePayload } from '../createUserShow';
import { parseLocalDateInput, parseLocalTimeInput } from '../createUserShowLogic';
import { prefetchShowPack } from '../showPack';
import type { Show, VenueSummary } from '../types';
import { ShowListItem } from './ShowListItem';

type Step = 'artist' | 'pickExisting' | 'venue' | 'venuePick' | 'datetime';

export function AddShowContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ artistId?: string }>();
  const initialArtistId = typeof params.artistId === 'string' ? params.artistId : undefined;

  const { isGuest, session, user, isLoading: sessionLoading } = useSession();

  const [step, setStep] = useState<Step>(initialArtistId ? 'pickExisting' : 'artist');
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistQuery, setArtistQuery] = useState('');
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [artistSearchLoading, setArtistSearchLoading] = useState(false);

  const [upcomingShows, setUpcomingShows] = useState<Show[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(Boolean(initialArtistId));

  const [venueQuery, setVenueQuery] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueCountry, setVenueCountry] = useState('MX');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [venueResults, setVenueResults] = useState<VenueSummary[]>([]);
  const [venueSearchLoading, setVenueSearchLoading] = useState(false);

  const [venueCandidates, setVenueCandidates] = useState<VenueCandidatePayload[]>([]);

  const [localDateInput, setLocalDateInput] = useState('');
  const [localTimeInput, setLocalTimeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArtist = useCallback(
    async (artistId: string) => {
      const data = await getArtistById(artistId);
      if (!data) {
        setError(t('catalog.artistNotFound'));
        setStep('artist');
        return;
      }
      setArtist(data);
    },
    [t]
  );

  const loadUpcoming = useCallback(async (artistId: string) => {
    setUpcomingLoading(true);
    setError(null);
    try {
      const shows = await listUpcomingShowsForArtistFromSupabase(artistId);
      setUpcomingShows(shows);
      setStep(shows.length > 0 ? 'pickExisting' : 'venue');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addShow.loadError'));
      setStep('venue');
    } finally {
      setUpcomingLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!initialArtistId || artist) return;
    void loadArtist(initialArtistId).then(() => loadUpcoming(initialArtistId));
  }, [artist, initialArtistId, loadArtist, loadUpcoming]);

  useEffect(() => {
    if (step !== 'artist') return;
    const handle = setTimeout(async () => {
      setArtistSearchLoading(true);
      setError(null);
      try {
        const results = await searchLocalArtists(artistQuery, 40);
        setArtistResults(results);
      } catch (err) {
        setArtistResults([]);
        setError(err instanceof Error ? err.message : t('catalog.loadError'));
      } finally {
        setArtistSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [artistQuery, step, t]);

  useEffect(() => {
    if (step !== 'venue') return;
    const handle = setTimeout(async () => {
      setVenueSearchLoading(true);
      try {
        const results = await searchVenues(venueQuery, { city: venueCity, limit: 15 });
        setVenueResults(results);
      } catch {
        setVenueResults([]);
      } finally {
        setVenueSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [step, venueCity, venueQuery]);

  const finishWithShow = useCallback(
    async (showId: string, message: string) => {
      const show = await fetchShowByIdFromSupabase(showId);
      if (show) {
        void prefetchShowPack(show, queryClient, { force: true });
      }
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.home(user.id) });
        await queryClient.invalidateQueries({ queryKey: ['artistShows'] });
      }
      Alert.alert(t('addShow.successTitle'), message, [
        {
          text: t('addShow.viewShow'),
          onPress: () => router.replace(`/show/${showId}`),
        },
      ]);
    },
    [queryClient, router, t, user?.id]
  );

  const onSelectExistingShow = useCallback(
    async (show: Show) => {
      if (!user?.id || !session?.access_token) return;
      setSubmitting(true);
      setError(null);
      try {
        await setShowStatus(show.id, 'voy', session.access_token, user.id);
        await finishWithShow(show.id, t('addShow.markedGoing'));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('addShow.submitError'));
      } finally {
        setSubmitting(false);
      }
    },
    [finishWithShow, session?.access_token, t, user?.id]
  );

  const submitCreateShow = useCallback(
    async (options?: { confirmVenueId?: string; forceCreateVenue?: boolean }) => {
      if (!artist) return;
      const dateParsed = parseLocalDateInput(localDateInput);
      if (!dateParsed.ok) {
        setError(t('addShow.invalidDate'));
        return;
      }
      const timeParsed = parseLocalTimeInput(localTimeInput);
      if (!timeParsed.ok) {
        setError(t('addShow.invalidTime'));
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        const result = await createUserShow({
          artistId: artist.id,
          localDate: dateParsed.value,
          venueId: options?.confirmVenueId ? null : selectedVenueId,
          venueName: selectedVenueId ? null : venueName.trim() || null,
          venueCity: selectedVenueId ? null : venueCity.trim() || null,
          venueCountry,
          localTime: timeParsed.value,
          timeConfirmed: timeParsed.confirmed,
          confirmVenueId: options?.confirmVenueId ?? null,
          forceCreateVenue: options?.forceCreateVenue ?? false,
        });

        if (result.kind === 'venue_candidates') {
          setVenueCandidates(result.candidates);
          setStep('venuePick');
          return;
        }
        if (result.kind === 'daily_limit') {
          setError(t('addShow.dailyLimit', { count: result.limit }));
          return;
        }
        if (result.kind === 'created') {
          await finishWithShow(result.showId, t('addShow.created'));
          return;
        }
        if (result.kind === 'existing') {
          await finishWithShow(result.showId, t('addShow.alreadyExists'));
          return;
        }
        setError(t('addShow.submitError'));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('addShow.submitError'));
      } finally {
        setSubmitting(false);
      }
    },
    [
      artist,
      finishWithShow,
      localDateInput,
      localTimeInput,
      selectedVenueId,
      venueCity,
      venueCountry,
      venueName,
      t,
    ]
  );

  const canContinueVenue = useMemo(() => {
    if (selectedVenueId) return true;
    return venueName.trim().length > 0 && venueCity.trim().length > 0;
  }, [selectedVenueId, venueCity, venueName]);

  if (sessionLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (isGuest) {
    return (
      <ThemedView style={[styles.centered, { padding: 24 }]}>
        <ThemedText style={styles.centerText}>{t('addShow.requiresAuth')}</ThemedText>
        <Button title={t('home.goToProfile')} onPress={() => router.push('/(tabs)/profile')} />
      </ThemedView>
    );
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: tokens.surface,
      color: tokens.text,
      borderColor: tokens.separator,
    },
  ];

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: spacing.screenHorizontal,
        paddingTop: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
      }}>
      {error ? (
        <Card>
          <Text style={{ color: '#D64545' }}>{error}</Text>
        </Card>
      ) : null}

      {step === 'artist' ? (
        <View style={styles.section}>
          <SectionHeader title={t('addShow.pickArtist')} />
          <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
            {t('addShow.pickArtistHint')}
          </Text>
          <TextInput
            placeholder={t('explore.searchPlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={inputStyle}
            value={artistQuery}
            onChangeText={setArtistQuery}
          />
          {artistSearchLoading ? <ActivityIndicator /> : null}
          {!artistSearchLoading && artistQuery.trim() && artistResults.length === 0 ? (
            <Text style={{ color: tokens.textSecondary }}>{t('addShow.noArtists')}</Text>
          ) : null}
          {artistResults.map((item) => (
            <Pressable
              key={item.id}
              style={styles.listRow}
              onPress={() => {
                setArtist(item);
                void loadUpcoming(item.id);
              }}>
              <Text style={[typography.bodySemibold, { color: tokens.text }]}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {artist ? (
        <Text style={[typography.footnoteSemibold, { color: tokens.textSecondary }]}>
          {t('addShow.selectedArtist', { name: artist.name })}
        </Text>
      ) : null}

      {step === 'pickExisting' ? (
        <View style={styles.section}>
          <SectionHeader title={t('addShow.existingTitle')} />
          {upcomingLoading ? <ActivityIndicator /> : null}
          {!upcomingLoading
            ? upcomingShows.map((show) => (
                <ShowListItem
                  key={show.id}
                  show={show}
                  onPress={() => void onSelectExistingShow(show)}
                />
              ))
            : null}
          <PillButton
            title={t('addShow.notListed')}
            variant="secondary"
            disabled={submitting}
            onPress={() => setStep('venue')}
          />
        </View>
      ) : null}

      {step === 'venue' ? (
        <View style={styles.section}>
          <SectionHeader title={t('addShow.venueTitle')} />
          <TextInput
            placeholder={t('addShow.venueCityPlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={inputStyle}
            value={venueCity}
            onChangeText={(text) => {
              setVenueCity(text);
              setSelectedVenueId(null);
            }}
          />
          <TextInput
            placeholder={t('addShow.venueSearchPlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={inputStyle}
            value={venueQuery}
            onChangeText={setVenueQuery}
          />
          {venueSearchLoading ? <ActivityIndicator /> : null}
          {venueResults.map((venue) => (
            <Pressable
              key={venue.id}
              style={[
                styles.venueRow,
                selectedVenueId === venue.id && { borderColor: tokens.accent, borderWidth: 2 },
              ]}
              onPress={() => {
                setSelectedVenueId(venue.id);
                setVenueName(venue.name);
                setVenueCity(venue.city);
                setVenueCountry(venue.country);
              }}>
              <Text style={[typography.bodySemibold, { color: tokens.text }]}>
                {formatShowVenueLine(venue)}
              </Text>
            </Pressable>
          ))}
          <SectionHeader title={t('addShow.venueNewTitle')} />
          <TextInput
            placeholder={t('addShow.venueNamePlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={inputStyle}
            value={venueName}
            onChangeText={(text) => {
              setVenueName(text);
              setSelectedVenueId(null);
            }}
          />
          <PillButton
            title={t('addShow.continue')}
            disabled={!canContinueVenue}
            onPress={() => setStep('datetime')}
          />
        </View>
      ) : null}

      {step === 'venuePick' ? (
        <View style={styles.section}>
          <SectionHeader title={t('addShow.venueCandidatesTitle')} />
          <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
            {t('addShow.venueCandidatesHint')}
          </Text>
          {venueCandidates.map((venue) => (
            <Pressable
              key={venue.id}
              style={styles.venueRow}
              onPress={() => void submitCreateShow({ confirmVenueId: venue.id })}>
              <Text style={[typography.bodySemibold, { color: tokens.text }]}>
                {venue.name} · {venue.city}, {venue.country}
              </Text>
            </Pressable>
          ))}
          <PillButton
            title={t('addShow.createVenueAnyway', { name: venueName.trim() || '—' })}
            variant="secondary"
            disabled={submitting}
            onPress={() => void submitCreateShow({ forceCreateVenue: true })}
          />
        </View>
      ) : null}

      {step === 'datetime' ? (
        <View style={styles.section}>
          <SectionHeader title={t('addShow.datetimeTitle')} />
          <TextInput
            placeholder={t('addShow.datePlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={inputStyle}
            value={localDateInput}
            onChangeText={setLocalDateInput}
            autoCapitalize="none"
          />
          <TextInput
            placeholder={t('addShow.timePlaceholder')}
            placeholderTextColor={tokens.textSecondary}
            style={inputStyle}
            value={localTimeInput}
            onChangeText={setLocalTimeInput}
            autoCapitalize="none"
          />
          <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
            {t('addShow.timeHint')}
          </Text>
          <PillButton
            title={submitting ? t('common.loading') : t('addShow.submit')}
            disabled={submitting}
            onPress={() => void submitCreateShow()}
          />
          <PillButton title={t('addShow.backToVenue')} variant="secondary" onPress={() => setStep('venue')} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  centerText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listRow: {
    paddingVertical: 12,
  },
  section: {
    gap: spacing.md,
  },
  venueRow: {
    borderRadius: 12,
    paddingVertical: 10,
  },
});
