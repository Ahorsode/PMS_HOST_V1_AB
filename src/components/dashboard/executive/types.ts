import type { LivestockType } from '@prisma/client';

export type ExecutiveStats = {
  totalProfit: number;
  profitTrend: number;
  /** Today's revenue minus operating expenses. Missing on payloads cached before it was added. */
  dayProfit?: number;
  /** Today's revenue against yesterday's, in percent. */
  dayProfitTrend?: number;
  globalFcr: number;
  totalDebt: number;
  activeLivestock: number;
  mortalityRate: number;
  supplierDebt: number;
  customerDebt: number;
};

/** The slice of an active batch the phone dashboard needs for its next-step links. */
export type ExecutiveBatchRef = {
  numericId: number;
  type: LivestockType;
};
