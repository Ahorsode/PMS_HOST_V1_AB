import { formatCurrency } from '@/lib/utils';
import type { StrategicPriority } from '@/lib/analytics/executive-metrics';

/** Finance priorities carry a bare amount from the server; show it in the farm's currency. */
export function formatPriorityDetail(priority: StrategicPriority, currency: string) {
  if (priority.type !== 'finance') return priority.detail;
  return priority.detail.replace(/([\d,]+\.\d{2})/, (amount) =>
    formatCurrency(Number(amount.replace(/,/g, '')), currency),
  );
}

export const NOTHING_URGENT: StrategicPriority = {
  title: 'Nothing urgent',
  detail: 'No supplier, stock or performance issues right now',
  type: 'performance',
};
