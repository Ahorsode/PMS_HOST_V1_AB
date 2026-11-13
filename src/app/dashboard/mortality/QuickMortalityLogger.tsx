'use client'

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { LivestockForm } from '../flocks/FlockForm';
import { getLivestockUnit, formatLivestockType } from '@/lib/utils/growth-utils';
import { g } from '@/components/ui/graphite';

function sentenceCase(text: string) {
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

interface QuickMortalityLoggerProps {
  activeBatches: any[];
  isolationRooms?: any[];
  defaultType?: 'DEAD' | 'SICK';
  /** Shown at the top right of the card, beside the title. */
  headerAside?: React.ReactNode;
}

export function QuickMortalityLogger({ activeBatches, isolationRooms = [], defaultType = 'DEAD', headerAside }: QuickMortalityLoggerProps) {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  const isDead = defaultType === 'DEAD';
  const selectedBatchIndex = selectedBatch
    ? activeBatches.findIndex((batch) => batch.id === selectedBatch.id)
    : -1;
  const selectedBatchLabel = selectedBatch?.batchName || (selectedBatchIndex >= 0 ? `Unit ${selectedBatchIndex + 1}` : 'Selected unit');

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={g.sectionTitle}>{isDead ? 'Log deaths' : 'Isolate birds'}</h2>
          <p className={`mt-1 text-sm ${g.secondary}`}>
            {isDead ? 'Pick a batch to record birds that died' : 'Pick a batch to move sick birds into isolation'}
          </p>
        </div>
        {headerAside}
      </div>

      {activeBatches.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {activeBatches.map((batch, index) => {
            const label = batch.batchName || `Unit ${index + 1}`;
            return (
              <li key={batch.id}>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(batch)}
                  aria-label={isDead ? `Log deaths for ${label}` : `Isolate birds from ${label}`}
                  className={`${g.tile} group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-raised ${g.focus}`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${g.text}`}>{label}</span>
                    <span className={`block truncate ${g.ledger} tabular-nums`}>
                      {sentenceCase(formatLivestockType(batch.type))} · {batch.currentCount.toLocaleString()} {getLivestockUnit(batch.type).toLowerCase()}
                    </span>
                  </span>
                  <Plus
                    className="h-4 w-4 shrink-0 text-fg-3 transition-colors duration-150 group-hover:text-fg"
                    strokeWidth={1.5}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={`rounded-xl border border-dashed ${g.hairline} py-8 text-center text-sm ${g.secondary}`}>
          {isDead ? 'No active batches to log deaths for' : 'No active batches to isolate birds from'}
        </p>
      )}

      <Dialog
        isOpen={!!selectedBatch}
        onOpenChange={(open) => !open && setSelectedBatch(null)}
        title={isDead ? `Log deaths: ${selectedBatchLabel}` : `Isolate birds: ${selectedBatchLabel}`}
      >
        {selectedBatch && (
          <div className="p-2">
            <LivestockForm
              batch={selectedBatch}
              houses={[]} // Not needed for mortality mode in LivestockForm
              isolationRooms={isolationRooms}
              mode="mortality"
              defaultHealthType={defaultType}
              onClose={() => setSelectedBatch(null)}
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}
