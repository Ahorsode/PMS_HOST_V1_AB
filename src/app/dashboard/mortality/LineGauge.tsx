import React from 'react';
import { cn } from '@/lib/utils';
import { GAUGE_MAX, VET_LINE, lineState } from './mortality-math';

const FILL = { under: 'bg-ql-mint', close: 'bg-ql-amber', above: 'bg-ql-coral' };

/** The 1% line as a gauge from 0 to 3%, with the vet line marked. */
export function LineGauge({ pct, className }: { pct: number | null; className?: string }) {
  const state = lineState(pct);
  const width = pct === null ? 0 : Math.min(100, (pct / GAUGE_MAX) * 100);
  return (
    <div className={className} aria-hidden="true">
      <div className="relative h-1.5 rounded-full bg-ql-text/[0.06]">
        <span className={cn('absolute inset-y-0 left-0 rounded-full', FILL[state])} style={{ width: `${Math.max(width, pct && pct > 0 ? 1.5 : 0)}%` }} />
        <span className="absolute -top-1 h-3.5 w-px bg-ql-amber" style={{ left: `${(VET_LINE / GAUGE_MAX) * 100}%` }} />
      </div>
      <div className="relative mt-1.5 h-3 font-ql-mono text-[10px] text-ql-muted">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2 text-ql-amber" style={{ left: `${(VET_LINE / GAUGE_MAX) * 100}%` }}>1%</span>
        <span className="absolute right-0">3%</span>
      </div>
    </div>
  );
}
