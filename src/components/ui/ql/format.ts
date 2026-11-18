import { formatCurrency, currencySymbol } from '@/lib/utils';
import { localeForCurrency } from '@/lib/farm/countries';

/**
 * Splits a formatted amount into the part that reads first and the decimals,
 * so headline figures can set the decimals back ("R 1 356 022" + ",00").
 * Uses the farm currency's own locale, so separators match the rest of the app.
 */
export function splitMoney(amount: number, currency: string): { main: string; fraction: string } {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    const parts = new Intl.NumberFormat(localeForCurrency(currency), {
      style: 'currency',
      currency,
    }).formatToParts(value);
    const cut = parts.findIndex((part) => part.type === 'decimal');
    if (cut === -1) return { main: parts.map((p) => p.value).join(''), fraction: '' };
    return {
      main: parts.slice(0, cut).map((p) => p.value).join(''),
      fraction: parts.slice(cut).map((p) => p.value).join(''),
    };
  } catch {
    return { main: formatCurrency(value, currency), fraction: '' };
  }
}

/** "500k", "1.5M": axis-sized numbers that always fit. Lowercase k to match the boards. */
export function compactNumber(value: number, maximumFractionDigits = 1) {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits })
    .format(safe)
    .replace('K', 'k');
}

/** "R 1.85M", "GH₵ 479k": a compact amount with the farm's currency symbol. */
export function compactMoney(value: number, currency: string, maximumFractionDigits = 2) {
  return `${currencySymbol(currency)} ${compactNumber(value, maximumFractionDigits)}`;
}

/** "1.2" or "100": a percentage magnitude with at most one decimal. */
export function percentMagnitude(value: number) {
  const safe = Number.isFinite(value) ? Math.abs(value) : 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(safe);
}
