export type SyncedLine = {
  timestamp_seconds: number;
  line: string;
};

const LRC_LINE_REGEX = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

function parseTimestamp(minutes: string, seconds: string, fraction?: string): number {
  const mins = Number.parseInt(minutes, 10);
  const secs = Number.parseInt(seconds, 10);
  const fracMs = fraction ? Number.parseInt(fraction.padEnd(3, '0').slice(0, 3), 10) : 0;
  return mins * 60 + secs + fracMs / 1000;
}

export function parseLrc(lrc: string): SyncedLine[] {
  const lines: SyncedLine[] = [];

  for (const rawLine of lrc.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const match = trimmed.match(LRC_LINE_REGEX);
    if (!match) continue;

    const text = match[4]?.trim() ?? '';
    if (!text) continue;

    lines.push({
      timestamp_seconds: parseTimestamp(match[1], match[2], match[3]),
      line: text,
    });
  }

  return lines.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
}
