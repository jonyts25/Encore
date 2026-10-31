export class LyricsBusyError extends Error {
  readonly code = 'lyrics_busy';

  constructor() {
    super('Lyrics service is busy');
    this.name = 'LyricsBusyError';
  }
}
