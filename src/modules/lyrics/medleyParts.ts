const MEDLEY_SEPARATOR = /\s+\/\s+/;

export function isMedleySong(title: string, isMedley?: boolean): boolean {
  if (isMedley === true) return true;
  if (isMedley === false) return false;
  return MEDLEY_SEPARATOR.test(title.trim());
}

export function splitMedleyParts(title: string): string[] {
  return title
    .split(MEDLEY_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function medleyPartTitles(title: string, isMedley?: boolean): string[] {
  if (!isMedleySong(title, isMedley)) {
    return [title.trim()].filter(Boolean);
  }
  const parts = splitMedleyParts(title);
  return parts.length > 0 ? parts : [title.trim()];
}
