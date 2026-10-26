/** Mirrors public.normalize_song_title in Postgres (unaccent + lowercase + trim spaces). */
export function normalizeSongTitle(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
