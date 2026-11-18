/** Feed counts shared by the feed overview and the history. */
export type FeedLogLike = {
  id: string;
  logDate: string | Date;
  amountConsumed: number | string;
  batchId?: string | null;
  feedTypeId?: string | null;
  formulationId?: string | null;
  batch?: { batchName?: string | null; breedType?: string | null } | null;
  inventory?: { itemName?: string | null } | null;
  formulation?: { name?: string | null } | null;
  user?: { firstname?: string | null; surname?: string | null } | null;
};

/** Same windows as the feeding history header: today, and the last 7 days. */
export function feedTotals(logs: FeedLogLike[], now = new Date()) {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  let today = 0;
  let week = 0;
  for (const log of logs) {
    const date = new Date(log.logDate);
    const amount = Number(log.amountConsumed || 0);
    if (date.toDateString() === now.toDateString()) today += amount;
    if (date >= weekAgo) week += amount;
  }
  return { today, week };
}

/** "1 bag", "2.5 bags", "1,164 bags". */
export function bags(amount: number) {
  const value = Number(amount) || 0;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${value === 1 ? 'bag' : 'bags'}`;
}

export function feedLabel(log: FeedLogLike) {
  return log.inventory?.itemName || log.formulation?.name || 'Feed';
}

export function loggedBy(log: FeedLogLike) {
  return [log.user?.firstname, log.user?.surname].filter(Boolean).join(' ') || 'someone';
}

export type FeedDayGroup<T extends FeedLogLike> = {
  key: string;
  date: Date;
  total: number;
  count: number;
  /** Logs on the same day for the same batch and feed fold into one row. */
  rows: Array<{ key: string; logs: T[]; total: number }>;
};

/** Logs grouped by day (newest first), repeats of the same batch and feed folded together. */
export function groupFeedLogs<T extends FeedLogLike>(logs: T[]): FeedDayGroup<T>[] {
  const days = new Map<string, FeedDayGroup<T>>();
  for (const log of logs) {
    const date = new Date(log.logDate);
    const key = date.toDateString();
    let day = days.get(key);
    if (!day) {
      day = { key, date, total: 0, count: 0, rows: [] };
      days.set(key, day);
    }
    const amount = Number(log.amountConsumed || 0);
    day.total += amount;
    day.count += 1;
    const rowKey = `${log.batchId ?? log.batch?.batchName ?? ''}|${log.feedTypeId ?? log.formulationId ?? feedLabel(log)}`;
    const row = day.rows.find((entry) => entry.key === rowKey);
    if (row) {
      row.logs.push(log);
      row.total += amount;
    } else {
      day.rows.push({ key: rowKey, logs: [log], total: amount });
    }
  }
  return [...days.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}
