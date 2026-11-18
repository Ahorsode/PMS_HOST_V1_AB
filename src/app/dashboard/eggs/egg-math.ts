/**
 * Egg counts shared by the egg overview and the stock history. A log's
 * eggsCollected is every egg laid; unusable eggs are part of it, and
 * eggsRemaining is what is still in stock from that collection.
 */
export type EggCountLog = {
  logDate: string | Date;
  eggsCollected: number;
  eggsRemaining: number;
  unusableCount?: number | null;
};

export function usableEggs(log: EggCountLog) {
  return Math.max(0, log.eggsCollected - Number(log.unusableCount || 0));
}

export function soldEggs(log: EggCountLog) {
  return Math.max(0, usableEggs(log) - Number(log.eggsRemaining || 0));
}

export function activePercent(log: EggCountLog) {
  const usable = usableEggs(log);
  if (usable <= 0) return 0;
  return Math.round((Number(log.eggsRemaining || 0) / usable) * 100);
}

export function soldPercent(log: EggCountLog) {
  const usable = usableEggs(log);
  if (usable <= 0) return 0;
  return Math.round((soldEggs(log) / usable) * 100);
}

/** Stock, sold and usable totals over the given logs, with each share of usable. */
export function eggStockSummary(logs: EggCountLog[]) {
  let totalUsable = 0;
  let totalRemaining = 0;
  let totalSold = 0;
  for (const log of logs) {
    totalUsable += usableEggs(log);
    totalRemaining += Number(log.eggsRemaining || 0);
    totalSold += soldEggs(log);
  }
  const activePct = totalUsable > 0 ? Math.round((totalRemaining / totalUsable) * 100) : 0;
  const soldPct = totalUsable > 0 ? Math.round((totalSold / totalUsable) * 100) : 0;
  return { totalUsable, totalRemaining, totalSold, activePct, soldPct };
}

export function splitCrates(eggs: number, eggsPerCrate: number) {
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30;
  const total = Math.max(0, Math.floor(Number(eggs) || 0));
  return { crates: Math.floor(total / epc), eggs: total % epc };
}

/** "35 crates / 14 eggs": the tablet and desktop wording. */
export function formatCratesAndEggs(eggs: number, eggsPerCrate: number) {
  const { crates, eggs: remainder } = splitCrates(eggs, eggsPerCrate);
  const crateLabel = crates === 1 ? 'crate' : 'crates';
  if (remainder === 0) return `${crates} ${crateLabel}`;
  return `${crates} ${crateLabel} / ${remainder} eggs`;
}

/** "35 crates · 14 eggs": the phone wording, never truncated. */
export function formatCratesDot(eggs: number, eggsPerCrate: number) {
  const { crates, eggs: remainder } = splitCrates(eggs, eggsPerCrate);
  const crateLabel = crates === 1 ? 'crate' : 'crates';
  return remainder === 0 ? `${crates} ${crateLabel}` : `${crates} ${crateLabel} · ${remainder} eggs`;
}

/** Unusable eggs as a share of the eggs laid, or null when nothing was laid. */
export function unusableRate(unusable: number, laid: number) {
  if (!(laid > 0)) return null;
  return (Math.max(0, unusable) / laid) * 100;
}

export function isSameLocalDay(value: string | Date, day = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toDateString() === day.toDateString();
}
