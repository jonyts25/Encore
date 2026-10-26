import type { AddPracticeSongErrorCode } from './showPack';

export function practiceSongErrorMessageKey(
  code: AddPracticeSongErrorCode
): string {
  switch (code) {
    case 'not_authenticated':
      return 'practice.errors.notAuthenticated';
    case 'daily_limit':
      return 'practice.errors.dailyLimit';
    case 'invalid_input':
      return 'practice.errors.invalid';
    case 'lyrics_missing':
      return 'practice.errors.lyricsMissing';
    case 'lyrics_network':
      return 'practice.errors.lyricsNetwork';
    default:
      return 'practice.errors.unknown';
  }
}
