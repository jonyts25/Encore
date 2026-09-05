import { Pressable, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import type { ArtistResolutionCandidate } from '../types';

type ArtistDisambiguationListProps = {
  candidates: ArtistResolutionCandidate[];
  isConfirming: boolean;
  onSelect: (mbid: string) => void;
};

const COUNTRY_LABELS: Record<string, string> = {
  MX: 'México',
  US: 'Estados Unidos',
  ES: 'España',
  AR: 'Argentina',
  CO: 'Colombia',
  CL: 'Chile',
  PE: 'Perú',
  IT: 'Italia',
  FR: 'Francia',
  GB: 'Reino Unido',
  DE: 'Alemania',
  BR: 'Brasil',
};

function formatCountry(code: string | null): string | null {
  if (!code) return null;
  return COUNTRY_LABELS[code.toUpperCase()] ?? code.toUpperCase();
}

function formatCandidateDescription(candidate: ArtistResolutionCandidate): string {
  const details: string[] = [];

  const country = formatCountry(candidate.country);
  if (country) details.push(country);

  if (candidate.genres?.length) {
    details.push(candidate.genres.slice(0, 2).join(', '));
  } else if (candidate.type) {
    details.push(candidate.type);
  }

  if (candidate.disambiguation) {
    details.push(candidate.disambiguation);
  }

  return details.join(', ');
}

export function ArtistDisambiguationList({
  candidates,
  isConfirming,
  onSelect,
}: ArtistDisambiguationListProps) {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t('catalog.disambiguationTitle')}</ThemedText>
      {isConfirming ? (
        <ThemedText style={styles.confirming}>{t('catalog.confirmingArtist')}</ThemedText>
      ) : null}
      {candidates.map((candidate) => {
        const description = formatCandidateDescription(candidate);
        return (
          <Pressable
            key={candidate.mbid}
            disabled={isConfirming}
            onPress={() => onSelect(candidate.mbid)}
            style={({ pressed }) => [
              styles.option,
              (pressed || isConfirming) && styles.optionPressed,
            ]}>
            <ThemedText style={styles.optionName}>{candidate.name}</ThemedText>
            {description ? <ThemedText style={styles.optionMeta}>{description}</ThemedText> : null}
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  confirming: {
    marginBottom: 8,
    opacity: 0.75,
  },
  container: {
    flex: 1,
    marginTop: 8,
  },
  option: {
    borderColor: '#DDD',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionMeta: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.75,
  },
  optionName: {
    fontSize: 17,
    fontWeight: '600',
  },
  optionPressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
});
