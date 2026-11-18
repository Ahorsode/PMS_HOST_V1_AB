import React from 'react';
import { InfirmaryManagement } from '../flocks/InfirmaryManagement';
import { QuickMortalityLogger } from '../mortality/QuickMortalityLogger';
import { NewRoomButton } from './NewRoomButton';
import { g } from '@/components/ui/graphite';
import { MobileQuarantine } from './MobileQuarantine';

/** Compact list of the farm's isolation rooms. */
function RoomList({ rooms }: { rooms: any[] }) {
  return (
    <div className="sm:max-w-md sm:text-right">
      <p className={`mb-2 text-xs font-semibold ${g.secondary}`}>
        Isolation rooms <span className="font-mono tabular-nums">· {rooms.length}</span>
      </p>
      {rooms.length > 0 ? (
        <ul className="flex flex-wrap gap-2 sm:justify-end">
          {rooms.map((room: any) => (
            <li key={room.id} className={`${g.tile} px-3 py-2 text-left`}>
              <p className={`truncate text-sm font-semibold ${g.text}`}>{room.name}</p>
              <p className={`${g.ledger} tabular-nums`}>
                Holds {Number(room.capacity).toLocaleString()} {room.capacity === 1 ? 'bird' : 'birds'}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`text-sm ${g.secondary}`}>No rooms yet. Add one with New room.</p>
      )}
    </div>
  );
}

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
    <div className="max-w-7xl mx-auto md:space-y-6 md:px-4 pt-2 pb-8 md:py-8">
      {/* Phone layout (Quiet Ledger); the sections below are tablet and desktop only. */}
      <div className="md:hidden">
        <MobileQuarantine canEdit={canEdit} activeBatches={activeBatches} batches={batches} isolationRooms={isolationRooms} />
      </div>
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:flex">
        <div>
          <h1 className={g.title}>Quarantine and isolation</h1>
          <p className={`mt-2 text-sm ${g.secondary}`}>Isolate sick birds, then return them to their house or record the loss</p>
        </div>
        {canEdit && <NewRoomButton />}
      </div>

      {canEdit ? (
        <section id="quick-logger" className={`scroll-mt-6 ${g.card} hidden p-5 md:block`}>
          <QuickMortalityLogger
            activeBatches={activeBatches}
            isolationRooms={isolationRooms}
            defaultType="SICK"
            headerAside={<RoomList rooms={isolationRooms} />}
          />
        </section>
      ) : (
        <section className={`${g.card} hidden p-5 md:block`}>
          <RoomList rooms={isolationRooms} />
        </section>
      )}

      <section className={`${g.card} hidden p-5 md:block`}>
        <InfirmaryManagement batches={batches} />
      </section>
    </div>
  );
}
