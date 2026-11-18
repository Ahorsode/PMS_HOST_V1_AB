import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { QlTile, QlLabel } from '@/components/ui/ql/Surface';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlMoney } from '@/components/ui/ql/Figure';

/** Outstanding debt with suppliers against customers as one split bar; zero reads as "All clear". */
export function DebtCard({
  total,
  suppliers,
  customers,
  currency,
}: {
  total: number;
  suppliers: number;
  customers: number;
  currency: string;
}) {
  const supplierPart = Math.max(0, suppliers || 0);
  const customerPart = Math.max(0, customers || 0);
  const barTotal = supplierPart + customerPart;
  const supplierShare = barTotal > 0 ? (supplierPart / barTotal) * 100 : 0;
  const customerShare = barTotal > 0 ? 100 - supplierShare : 0;

  const chip =
    total > 0 ? (
      <QlChip tone="amber">Balance due</QlChip>
    ) : total < 0 ? (
      <QlChip tone="neutral">In credit</QlChip>
    ) : (
      <QlChip tone="mint">All clear</QlChip>
    );

  return (
    <QlTile aria-labelledby="ql-debt-label">
      <div className="flex items-center justify-between gap-3">
        <QlLabel as="h2" id="ql-debt-label">Outstanding debt</QlLabel>
        {chip}
      </div>
      <p className="mt-3 text-[30px] leading-none text-ql-text">
        <QlMoney amount={total} currency={currency} />
      </p>

      <div
        role="img"
        aria-label={
          barTotal > 0
            ? `Suppliers ${Math.round(supplierShare)}%, customers ${Math.round(customerShare)}% of what is owed`
            : 'Nothing owed either way'
        }
        className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-ql-text/[0.06]"
      >
        {supplierShare > 0 ? <span className="h-full bg-ql-mint-dim" style={{ width: `${supplierShare}%` }} /> : null}
        {customerShare > 0 ? <span className="h-full bg-ql-amber" style={{ width: `${customerShare}%` }} /> : null}
      </div>

      <dl className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-mint-dim" />
          <dt className="text-ql-muted">Suppliers</dt>
          <dd className="font-ql-mono font-semibold tabular-nums text-ql-text">{formatCurrency(suppliers || 0, currency)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-amber" />
          <dt className="text-ql-muted">Customers</dt>
          <dd className="font-ql-mono font-semibold tabular-nums text-ql-text">{formatCurrency(customers || 0, currency)}</dd>
        </div>
      </dl>
    </QlTile>
  );
}
