import React from 'react';
import { InfirmaryManagement } from '../flocks/InfirmaryManagement';
import { IsolationRoomForm } from '../mortality/IsolationRoomForm';
import { QuickMortalityLogger } from '../mortality/QuickMortalityLogger';
import { g } from '@/components/ui/graphite';

export function QuarantineView({
  canEdit,
  activeBatches,
  batches,
  isolationRooms,
}: {
  canEdit: boolean;
  activeBatches: any[];
  batches: any[];
  isolationRooms: any[];
}) {
  return (
    <div className="max-w-7xl mx-auto space-y-6 px-1 md:px-4 pt-2 pb-8 md:py-8">
      <div>
        <h1 className={g.title}>Quarantine and isolation</h1>
        <p className={`mt-2 text-sm ${g.secondary}`}>Isolate sick birds, then return them to their house or record the loss</p>
      </div>

      {canEdit && (
        <section id="quick-logger" className={`scroll-mt-6 ${g.card} p-5`}>
          <QuickMortalityLogger activeBatches={activeBatches} isolationRooms={isolationRooms} defaultType="SICK" />
        </section>
      )}

      <section className={g.card}>
        <div className="p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <h2 className={g.sectionTitle}>Isolation rooms</h2>
              <p className={`mt-1 text-sm ${g.secondary}`}>Housing set aside for sick or quarantined birds</p>
            </div>
            <span className={`${g.ledger} tabular-nums`}>
              {isolationRooms.length} {isolationRooms.length === 1 ? 'room' : 'rooms'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <IsolationRoomForm />
            <div className="md:col-span-2">
              {isolationRooms.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {isolationRooms.map((room: any) => (
                    <li key={room.id} className={`${g.tile} px-4 py-3`}>
                      <p className={`truncate text-sm font-medium ${g.text}`}>{room.name}</p>
                      <p className={`${g.ledger} tabular-nums`}>
                        Holds {Number(room.capacity).toLocaleString()} {room.capacity === 1 ? 'bird' : 'birds'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed ${g.hairline} px-6 py-10 text-center text-sm ${g.secondary}`}>
                  No isolation rooms yet. Add one to hold sick birds apart from their house.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={`border-t ${g.hairline} p-5`}>
          <InfirmaryManagement batches={batches} />
        </div>
      </section>
    </div>
  );
}
