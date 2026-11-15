import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { localeForCurrency } from '@/lib/countries';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Formats an amount in a farm's currency, e.g. "GH₵1,200.00" or "$1,200.00". */
export function formatCurrency(amount: number | string, currency: string) {
  return new Intl.NumberFormat(localeForCurrency(currency), {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

/**
 * "GHS 1,200.00": the currency code instead of a symbol, for PDFs whose fonts
 * have no cedi or naira sign, and for places a code reads better than a sign.
 */
export function formatMoneyCode(amount: number | string, currency: string, fractionDigits = 2) {
  const value = Number(amount || 0);
  return `${currency} ${value.toLocaleString(localeForCurrency(currency), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/** Short symbol for a currency, e.g. "GH₵", "$" or "₦"; the code when there is none. */
export function currencySymbol(currency: string) {
  try {
    const part = new Intl.NumberFormat(localeForCurrency(currency), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((item) => item.type === 'currency');
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Compact amount for chart axes, e.g. "GH₵12K". */
export function formatCompactMoney(amount: number | string, currency: string) {
  return `${currencySymbol(currency)}${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(amount))}`;
}
