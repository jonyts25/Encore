import { parseLrc as parseLrcShared } from '../../../../shared/parseLrc';

export type SyncedLine = {
  timestamp_seconds: number;
  line: string;
};

export function parseLrc(lrc: string): SyncedLine[] {
  return parseLrcShared(lrc);
}
