import React from 'react';
import { g } from '@/components/ui/graphite';
import { EggActionsHeader, LogProductionButton } from './EggActions';
import { EggProductionHistoryPanel } from './EggProductionHistoryPanel';

type EggLoggingSettings = {
  defaultEggUnit: 'crate' | 'individual';
  allowEggUnitChange: boolean;
  defaultEggSortMode: 'sorted' | 'unsorted';
  allowEggSortModeChange: boolean;
  eggsPerCrate: number;
};

export function EggsView({
  layerBatches,
  canEdit,
  openLogOnLoad,
  todayTotal,
  weekTotal,
  productionHistory,
  eggSalesHistory,
  eggLoggingSettings,
}: {
  layerBatches: any[];
  canEdit: boolean;
  openLogOnLoad: boolean;
  todayTotal: number;
  weekTotal: number;
  productionHistory: any[];
  eggSalesHistory: any[];
  eggLoggingSettings: EggLoggingSettings;
}) {
  const { eggsPerCrate } = eggLoggingSettings;
  const todayCrates = Math.floor(todayTotal / eggsPerCrate);
  const todayLoose = todayTotal % eggsPerCrate;
  const weekCrates = Math.floor(weekTotal / eggsPerCrate);
  const weekLoose = weekTotal % eggsPerCrate;

  return (
    <div className="w-full max-w-none flex flex-col gap-6 px-1 md:px-4 pt-2 pb-8 md:py-8 min-h-[calc(100dvh-4rem)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between shrink-0">
        <div>
          <h1 className={g.title}>Egg production</h1>
          <p className={`mt-2 text-sm ${g.secondary}`}>Daily collection and stock for your layer flocks</p>
        </div>
        <EggActionsHeader batches={layerBatches} canEdit={canEdit} initialOpen={openLogOnLoad} {...eggLoggingSettings} />
      </div>

      {/* No items-start: both cards stretch to the taller one, and Collected today is kept
          compact so Layer flocks is the card that sets the height. */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 shrink-0">
        <section className={`${g.card} xl:col-span-3`}>
          <div className={`flex items-baseline justify-between border-b ${g.hairline} px-5 py-4`}>
            <h2 className={g.sectionTitle}>Layer flocks</h2>
            <span className={`${g.ledger} tabular-nums`}>{layerBatches.length} active</span>
          </div>
          <div className="p-5">
            {layerBatches.length === 0 ? (
              <p className={`rounded-xl border border-dashed ${g.hairline} py-12 text-center text-sm ${g.secondary}`}>
                No active layer flocks
              </p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {layerBatches.map((batch: any, index: number) => {
                  const livestockLabel = batch.batchName || `Layer flock ${index + 1}`;
                  const unit = batch.type?.toLowerCase().includes('poultry') ? 'birds' : 'animals';
                  return (
                    <li key={batch.id} className={`${g.tile} flex items-center justify-between gap-4 px-4 py-3`}>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-medium ${g.text}`}>{livestockLabel}</p>
                        <p className={`${g.ledger} truncate tabular-nums`}>
                          {batch.house?.name || 'No house'} · {batch.currentCount.toLocaleString()} {unit}
                        </p>
                      </div>
                      <LogProductionButton batchId={batch.id} batches={layerBatches} canEdit={canEdit} {...eggLoggingSettings} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className={`${g.card} flex flex-col p-5`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className={`text-sm ${g.secondary}`}>Collected today</h2>
              <p className={`mt-2 text-3xl font-medium leading-none tabular-nums ${g.text}`}>
                {todayCrates} {todayCrates === 1 ? 'crate' : 'crates'}
              </p>
              <p className={`mt-2 ${g.ledger} tabular-nums`}>
                {todayLoose > 0 ? `+ ${todayLoose} loose · ` : ''}{todayTotal.toLocaleString()} eggs
              </p>
              <p className={`mt-1 ${g.ledger} tabular-nums`}>
                Open crate · {Math.min(todayLoose, eggsPerCrate)} of {eggsPerCrate}
              </p>
            </div>

            <EggTray filled={todayLoose} size={eggsPerCrate} />
          </div>

          <div className={`mt-auto flex items-baseline justify-between border-t ${g.hairline} pt-3`}>
            <span className={`text-sm ${g.secondary}`}>Last 7 days</span>
            <span className={`text-sm font-medium tabular-nums ${g.text}`}>
              {weekCrates} {weekCrates === 1 ? 'crate' : 'crates'}
              {weekLoose > 0 ? ` / ${weekLoose} eggs` : ''}
            </span>
          </div>
        </section>
      </div>

      <EggProductionHistoryPanel
        className="flex-1 min-h-0"
        productionHistory={productionHistory}
        eggSalesHistory={eggSalesHistory}
        layerBatches={layerBatches}
        canEdit={canEdit}
        eggLoggingSettings={eggLoggingSettings}
      />
    </div>
  );
}

/** The open crate: one cell per egg slot, the loose eggs collected today filled in. */
function EggTray({ filled, size }: { filled: number; size: number }) {
  const slots = Math.min(Math.max(size, 1), 60);
  const columns = slots === 30 ? 6 : Math.ceil(Math.sqrt(slots));
  return (
    <div
      className="mb-4 grid w-fit shrink-0 gap-1 rounded-lg border border-fg/[0.06] bg-page p-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className={
            i < filled
              ? 'h-2.5 w-2 rounded-[50%] bg-yolk shadow-[inset_0_-1px_0_rgba(0,0,0,0.18)]'
              : 'h-2.5 w-2 rounded-[50%] border border-fg/[0.1]'
          }
        />
      ))}
    </div>
  );
}
