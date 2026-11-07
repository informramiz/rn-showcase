import { strings } from '@/shared/i18n/strings';

export function timeAgo(unixSeconds: number | undefined, nowMs: number = Date.now()): string {
  if (!unixSeconds) return '';
  const diff = Math.max(0, Math.floor(nowMs / 1000 - unixSeconds));
  if (diff < 60) return strings.time.justNow;
  const units: [number, string][] = [
    [31_536_000, strings.time.units.year],
    [2_592_000, strings.time.units.month],
    [86_400, strings.time.units.day],
    [3600, strings.time.units.hour],
    [60, strings.time.units.minute],
  ];
  for (const [secs, label] of units) {
    if (diff >= secs) return strings.time.ago(Math.floor(diff / secs), label);
  }
  return strings.time.justNow;
}

export function hostname(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
