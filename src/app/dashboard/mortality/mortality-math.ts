/** Mortality figures for the phone screen, worked out from the loaded logs. */
export type DeathLog = {
  id: string;
  batchId: string;
  count: number;
  logDate: string | Date;
  category?: string | null;
  subCategory?: string | null;
  reason?: string | null;
  isolationRoom?: { name?: string | null } | null;
  batch?: { batchName?: string | null; currentCount?: number | null; type?: string | null } | null;
};

export const VET_LINE = 1; // percent of a flock in 24 hours
export const GAUGE_MAX = 3;

export function sharePercent(deaths: number, flock: number) {
  if (!(flock > 0)) return null;
  return (Math.max(0, deaths) / flock) * 100;
}

/** Well under, close (from 0.8%), or above the 1% line. */
export function lineState(pct: number | null): 'under' | 'close' | 'above' {
  if (pct === null || pct < 0.8) return 'under';
  return pct >= VET_LINE ? 'above' : 'close';
}

const dayKey = (value: string | Date) => new Date(value).toDateString();

export type DeathDay = {
  key: string;
  date: Date;
  batchId: string;
  batchName: string;
  flock: number;
  total: number;
  logs: DeathLog[];
  causes: string[];
};

/** Same flock and day add up in one row; newest first. */
export function groupDeathDays(logs: DeathLog[]): DeathDay[] {
  const map = new Map<string, DeathDay>();
  for (const log of logs) {
    const key = `${dayKey(log.logDate)}|${log.batchId}`;
    let day = map.get(key);
    if (!day) {
      day = {
        key,
        date: new Date(log.logDate),
        batchId: log.batchId,
        batchName: log.batch?.batchName || 'Unit',
        flock: Number(log.batch?.currentCount || 0),
        total: 0,
        logs: [],
        causes: [],
      };
      map.set(key, day);
    }
    day.total += Number(log.count || 0);
    day.logs.push(log);
    const cause = causeLabel(log);
    if (!day.causes.includes(cause)) day.causes.push(cause);
  }
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function isUnknown(log: DeathLog) {
  return !log.category || log.category === 'Unknown';
}

export function causeLabel(log: DeathLog) {
  if (isUnknown(log)) return 'Unknown cause';
  return log.subCategory && log.subCategory !== 'Other' ? log.subCategory : log.category || 'Unknown cause';
}

/** "Newcastle disease", or "Disease and unknown" when a day mixes causes. */
export function dayCauseLine(day: DeathDay) {
  if (day.causes.length === 1) return day.causes[0];
  const known = day.causes.filter((cause) => cause !== 'Unknown cause');
  const hasUnknown = known.length < day.causes.length;
  const first = day.logs.find((log) => !isUnknown(log))?.category || known[0];
  return hasUnknown ? `${first} and unknown` : `${known.length} causes`;
}

/** The worst flock-day in the window (default: the last 7 days), as a share of the flock. */
export function worstRecentDay(logs: DeathLog[], days = 7, now = new Date()) {
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  let worst: { day: DeathDay; pct: number } | null = null;
  for (const day of groupDeathDays(logs.filter((log) => new Date(log.logDate) >= since))) {
    const pct = sharePercent(day.total, day.flock);
    if (pct !== null && (!worst || pct > worst.pct)) worst = { day, pct };
  }
  return worst;
}

/** Deaths by cause category, largest first. */
export function causeTotals(logs: DeathLog[]) {
  const totals = new Map<string, number>();
  for (const log of logs) {
    const key = isUnknown(log) ? 'Unknown' : log.category || 'Unknown';
    totals.set(key, (totals.get(key) ?? 0) + Number(log.count || 0));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}
