import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Card } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme';
import { useSession } from '@/modules/identity';

import { useMyConcertMap } from '../hooks/useMyConcertMap';

export function ProfileMyMapCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const { user } = useSession();

  const { allYearsData, isLoading } = useMyConcertMap({
    userId: user?.id ?? null,
    enabled: Boolean(user),
  });

  if (!user) return null;

  const summary = isLoading
    ? t('common.loading')
    : t('myMap.summaryLine', {
        concerts: allYearsData.stats.concerts,
        cities: allYearsData.stats.cities,
        countries: allYearsData.stats.countries,
      });

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/my-map')}>
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[typography.bodySemibold, { color: tokens.text }]}>{t('myMap.title')}</Text>
          <Text style={[typography.footnote, { color: tokens.accent }]}>{t('myMap.open')}</Text>
        </View>
        <Text style={[typography.secondary, { color: tokens.textSecondary }]}>{summary}</Text>
      </Card>
    </Pressable>
  );
}
