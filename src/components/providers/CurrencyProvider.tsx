'use client';

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_FARM_CURRENCY } from '@/lib/countries';
import { currencySymbol, formatCompactMoney, formatCurrency, formatMoneyCode } from '@/lib/utils';

const CurrencyContext = createContext<string>(DEFAULT_FARM_CURRENCY);

/** Makes the active farm's currency available to every dashboard client component. */
export function CurrencyProvider({ currency, children }: { currency: string; children: React.ReactNode }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

/** The active farm's currency code, e.g. "GHS" or "NGN". */
export function useCurrency() {
  return useContext(CurrencyContext);
}

/** Money formatters bound to the active farm's currency. */
export function useMoney() {
  const currency = useCurrency();
  return useMemo(
    () => ({
      currency,
      symbol: currencySymbol(currency),
      format: (amount: number | string) => formatCurrency(amount, currency),
      code: (amount: number | string, fractionDigits = 2) => formatMoneyCode(amount, currency, fractionDigits),
      compact: (amount: number | string) => formatCompactMoney(amount, currency),
    }),
    [currency],
  );
}
