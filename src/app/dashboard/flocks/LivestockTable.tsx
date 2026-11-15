'use client'

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bird } from 'lucide-react';
import { FlockRowActions } from './FlockActions';
import { formatLivestockType } from '@/lib/utils/growth-utils';
import { WorkerStamp } from '@/components/ui/WorkerStamp';
import { getBreedDisplayName } from '@/lib/livestock-breed-options';
import { cn } from '@/lib/utils';
import { HeadCount, StatusText, formatShortDate, segmentClass, tone } from './flock-ui';

interface LivestockTableProps {
  initialBatches: any[];
  houses: any[];
  isolationRooms: any[];
  canEdit?: boolean;
}

type SpeciesFilter = 'ALL' | 'POULTRY' | 'CATTLE' | 'PIG' | 'SHEEP' | 'OTHER'
type LifecycleFilter = 'ACTIVE' | 'INACTIVE' | 'ALL'

const SPECIES_FILTERS: { key: SpeciesFilter; label: string; noun: string }[] = [
  { key: 'ALL', label: 'All species', noun: 'livestock' },
  { key: 'POULTRY', label: 'Poultry', noun: 'poultry' },
  { key: 'CATTLE', label: 'Cattle', noun: 'cattle' },
  { key: 'PIG', label: 'Pigs', noun: 'pig' },
  { key: 'SHEEP', label: 'Sheep and goats', noun: 'sheep or goat' },
  { key: 'OTHER', label: 'Other', noun: 'other' },
]

function isActiveBatch(batch: { status?: string | null }) {
  return String(batch.status || '').toLowerCase() === 'active'
}

function isInactiveBatch(batch: { status?: string | null }) {
  return !isActiveBatch(batch)
}

function Segment({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={segmentClass(active)}>
      {label}
      {count != null ? (
        <span className={cn('font-mono text-xs tabular-nums', active ? 'text-accent-fg/80' : tone.muted)}>{count}</span>
      ) : null}
    </button>
  )
}

function UnitName({ batch, index }: { batch: any; index: number }) {
  return (
    <div className="min-w-0">
      <p className={cn('truncate text-base font-semibold', tone.text)}>{batch.batchName || `Unit ${index + 1}`}</p>
      <p className={cn('mt-0.5 truncate text-sm font-medium', tone.muted)}>{batch.house?.name || 'No house assigned'}</p>
    </div>
  )
}

export function LivestockTable({ initialBatches, houses, isolationRooms, canEdit = true }: LivestockTableProps) {
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('ALL')
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('ACTIVE')
  const router = useRouter()

  // Double-clicking a unit opens its Manage page, unless the click was on a
  // button, link or one of the row's pop-ups.
  const openOnDoubleClick = (batchId: string) => (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (!e.currentTarget.contains(target)) return
    if (target.closest('button, a, input, select, textarea, [role="dialog"]')) return
    router.push(`/dashboard/flocks/${batchId}`)
  }

  const counts = useMemo(() => {
    const active = initialBatches.filter(isActiveBatch).length
    const inactive = initialBatches.filter(isInactiveBatch).length
    return { active, inactive, all: initialBatches.length }
  }, [initialBatches])

  const filteredBatches = initialBatches.filter((batch: any) => {
    if (lifecycleFilter === 'ACTIVE' && !isActiveBatch(batch)) return false
    if (lifecycleFilter === 'INACTIVE' && !isInactiveBatch(batch)) return false

    if (speciesFilter === 'ALL') return true
    if (!batch.type) return false
    if (speciesFilter === 'POULTRY') return batch.type.startsWith('POULTRY')
    if (speciesFilter === 'CATTLE') return batch.type === 'CATTLE'
    if (speciesFilter === 'PIG') return batch.type === 'PIG'
    if (speciesFilter === 'SHEEP') return batch.type === 'SHEEP_GOAT'
    return batch.type === 'OTHER'
  })

  const speciesNoun = SPECIES_FILTERS.find((row) => row.key === speciesFilter)?.noun ?? 'livestock'

  return (
    <div className="space-y-4 pb-16 md:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Lifecycle"
          className={cn('custom-scrollbar flex w-full gap-1 overflow-x-auto p-1 md:w-fit', tone.panel)}
        >
          <Segment
            active={lifecycleFilter === 'ACTIVE'}
            onClick={() => setLifecycleFilter('ACTIVE')}
            label="Active"
            count={counts.active}
          />
          <Segment
            active={lifecycleFilter === 'INACTIVE'}
            onClick={() => setLifecycleFilter('INACTIVE')}
            label="Inactive"
            count={counts.inactive}
          />
          <Segment
            active={lifecycleFilter === 'ALL'}
            onClick={() => setLifecycleFilter('ALL')}
            label="All units"
            count={counts.all}
          />
        </div>

        <div
          role="group"
          aria-label="Species"
          className={cn('flex w-full flex-wrap gap-1 p-1 md:w-fit', tone.panel)}
        >
          {SPECIES_FILTERS.map((row) => (
            <Segment
              key={row.key}
              active={speciesFilter === row.key}
              onClick={() => setSpeciesFilter(row.key)}
              label={row.label}
            />
          ))}
        </div>
      </div>

      {filteredBatches.length > 0 ? (
        <>
          {/* Phone: one card per unit */}
          <ul className="flex flex-col gap-3 md:hidden">
            {filteredBatches.map((batch: any, index: number) => (
              <li key={batch.id} onDoubleClick={openOnDoubleClick(batch.id)} title="Double-click to manage" className={cn(tone.panel, 'cursor-pointer select-none p-4')}>
                <div className="flex items-start justify-between gap-3">
                  <UnitName batch={batch} index={index} />
                  <StatusText status={batch.status} className="shrink-0" />
                </div>
                <p className={cn('mt-3 text-[15px] font-medium', tone.text2)}>
                  {formatLivestockType(batch.type)}
                  <span className={tone.muted}> · {getBreedDisplayName(batch.breedType)}</span>
                </p>
                <HeadCount
                  className="mt-4"
                  current={batch.currentCount}
                  initial={batch.initialCount}
                  isolated={batch.isolationCount || 0}
                  active={isActiveBatch(batch)}
                />
                <p className={cn('mt-3 text-sm font-medium', tone.muted)}>
                  Arrived <span className="font-mono tabular-nums">{formatShortDate(batch.arrivalDate)}</span>
                </p>
                <div className={cn('mt-4 flex items-center justify-between gap-2 border-t pt-3', tone.hairline)}>
                  <WorkerStamp user={batch.user} />
                  <FlockRowActions batch={batch} houses={houses} isolationRooms={isolationRooms} canEdit={canEdit} />
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: the register */}
          <div className={cn(tone.panel, 'hidden overflow-x-auto md:block')}>
            <table className="min-w-full">
              <thead>
                <tr className={cn('border-b text-left text-sm', tone.hairline, tone.muted)}>
                  <th scope="col" className="h-11 px-5 font-semibold">Unit</th>
                  <th scope="col" className="h-11 px-5 font-semibold">Type and breed</th>
                  <th scope="col" className="h-11 px-5 font-semibold">Head count</th>
                  <th scope="col" className="h-11 px-5 font-semibold">Arrived</th>
                  <th scope="col" className="h-11 px-5 font-semibold">Status</th>
                  <th scope="col" className="h-11 px-5 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fg/[0.06]">
                {filteredBatches.map((batch: any, index: number) => (
                  <tr
                    key={batch.id}
                    onDoubleClick={openOnDoubleClick(batch.id)}
                    title="Double-click to manage"
                    className={cn('cursor-pointer select-none transition-colors hover:bg-fg/[0.04]', tone.ease)}
                  >
                    <td className="max-w-[220px] px-5 py-4 align-top">
                      <UnitName batch={batch} index={index} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-top">
                      <p className={cn('text-base font-semibold', tone.text)}>{formatLivestockType(batch.type)}</p>
                      <p className={cn('mt-0.5 text-sm font-medium', tone.muted)}>{getBreedDisplayName(batch.breedType)}</p>
                    </td>
                    <td className="w-56 min-w-48 px-5 py-4 align-top">
                      <HeadCount
                        current={batch.currentCount}
                        initial={batch.initialCount}
                        isolated={batch.isolationCount || 0}
                        active={isActiveBatch(batch)}
                      />
                    </td>
                    <td className={cn('whitespace-nowrap px-5 py-4 align-top font-mono text-[15px] font-semibold tabular-nums', tone.text2)}>
                      {formatShortDate(batch.arrivalDate)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-top">
                      <StatusText status={batch.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <WorkerStamp user={batch.user} />
                        <FlockRowActions batch={batch} houses={houses} isolationRooms={isolationRooms} canEdit={canEdit} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className={cn(tone.panel, 'px-6 py-16 text-center')}>
          <Bird className={cn('mx-auto h-6 w-6', tone.muted)} strokeWidth={1.5} />
          <p className={cn('mt-4 text-[15px] font-medium', tone.text)}>
            {lifecycleFilter === 'INACTIVE'
              ? 'No inactive or closed units'
              : lifecycleFilter === 'ACTIVE'
                ? 'No active units'
                : `No ${speciesNoun} units`}
          </p>
          <p className={cn('mx-auto mt-1 max-w-sm text-[13px]', tone.text2)}>
            {lifecycleFilter === 'INACTIVE'
              ? 'Mark a batch as Completed (decommissioned) in Edit to move it here'
              : 'Add a unit to start tracking its head count, feed and performance'}
          </p>
        </div>
      )}
    </div>
  );
}
