'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Info, Plus } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useCurrency } from '@/components/providers/CurrencyProvider'
import { Dialog } from '@/components/ui/Dialog'
import { WorkerStamp } from '@/components/ui/WorkerStamp'
import { QlChip } from '@/components/ui/ql/Chip'
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface'
import { QlMoney } from '@/components/ui/ql/Figure'
import { QlDerived } from '@/components/ui/ql/Derived'
import { qlButton } from '@/components/ui/ql/Button'
import { getBreedDisplayName } from '@/lib/farm/livestock-breed-options'
import { formatLivestockType } from '@/lib/utils/growth-utils'
import { statusLabel } from '../flock-ui'
import { FlockQuickLog } from './FlockQuickLog'
import { FlockHealthSchedule } from './FlockHealthSchedule'
import { FlockLogsHistory } from './FlockLogsHistory'
import { FlockReportGenerator } from './FlockReportGenerator'

const nf = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)
const shareText = (p: number) => (p === 0 ? '0%' : p < 0.1 ? '<0.1%' : `${p.toFixed(1)}%`)

/** One batch on a phone: alive up top, vitals that say what is missing, one money card, one quick log. */
export function MobileFlockDetail({ data, eggsPerCrate = 30 }: { data: any; eggsPerCrate?: number }) {
  const currency = useCurrency()
  const money = (v: number) => formatCurrency(v, currency)
  const { batch, logs, metrics, finance, series, forms } = data
  const [quickOpen, setQuickOpen] = useState(false)
  const [investOpen, setInvestOpen] = useState(false)
  const [mortalityView, setMortalityView] = useState<'deaths' | 'cumulative'>('deaths')

  const alive = Math.max(Number(batch.currentCount) || 0, 0)
  const isolated = Math.max(Number(batch.isolationCount) || 0, 0)
  const start = Math.max(Number(batch.initialCount) || 0, alive + isolated)
  const dead = Math.max(start - alive - isolated, 0)
  const active = String(batch.status || '').toLowerCase() === 'active'

  const otherCosts: Array<{ label: string; amount: number }> = (batch.initialCostOther || []).map((e: any) => ({ label: e.label, amount: Number(e.amount || 0) }))
  const costRows = [
    { key: 'initial', label: 'Initial', rule: 'Purchase and carriage', amount: finance.initialInvestment, dot: 'bg-ql-muted' },
    { key: 'consumption', label: 'Feed & med', rule: 'Split by usage', amount: finance.consumptionAllocatedTotal, dot: 'bg-ql-shell' },
    { key: 'operating', label: 'Operating', rule: 'Direct and allocated costs', amount: finance.operatingExpenses, dot: 'bg-ql-amber' },
    { key: 'general', label: 'General share', rule: finance.headcountSharePct ? `${finance.headcountSharePct}% by headcount` : 'Split by headcount', amount: finance.generalAllocatedTotal, dot: 'bg-ql-text/30' },
  ]

  const activity = useMemo(
    () =>
      [
        ...logs.feedingLogs.map((l: any) => ({ ...l, _type: 'FEED' })),
        ...logs.mortalityRecords.map((m: any) => ({ ...m, _type: 'MORTALITY' })),
        ...logs.eggProduction.map((e: any) => ({ ...e, _type: 'EGGS' })),
        ...logs.weightRecords.map((w: any) => ({ ...w, _type: 'WEIGHT' })),
      ]
        .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
        .slice(0, 15),
    [logs],
  )

  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30
  const mortality: Array<{ label: string; deaths: number; rate: number }> = series.mortalityDaily || []
  const vetLine = start * 0.01
  const worst = mortality.reduce<{ label: string; deaths: number } | null>((top, row) => (!top || row.deaths > top.deaths ? row : top), null)
  const chartMax = Math.max(1, ...mortality.map((row) => (mortalityView === 'deaths' ? row.deaths : row.rate)), mortalityView === 'deaths' ? vetLine : 1)

  return (
    <div className="space-y-3 pb-24 font-ql-sans text-ql-text">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <QlChip tone={active ? 'mint' : 'neutral'} icon={active ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-mint" /> : undefined}>{statusLabel(batch.status)}</QlChip>
          <QlLabel as="span">{batch.house?.name || 'No house'} · {formatLivestockType(batch.type)}</QlLabel>
        </div>
        <h1 className="mt-2 font-ql-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">{batch.batchName || 'Unit details'}</h1>
        <p className="text-[13px] text-ql-muted">{getBreedDisplayName(batch.breedType)}</p>
      </header>

      <QlHero aria-labelledby="flock-alive-label" className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ql-mint)_7%,transparent)_0%,transparent_60%)]">
        <div className="flex items-baseline justify-between gap-2">
          <QlLabel as="h2" id="flock-alive-label">Alive · day <QlDerived formula="days since arrival">{nf(metrics.ageInDays)}</QlDerived></QlLabel>
          <QlLabel as="span">of {nf(start)}</QlLabel>
        </div>
        <p className="mt-3 font-ql-display text-[52px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{nf(alive)}</p>
        <div role="img" aria-label={`${nf(alive)} alive, ${nf(isolated)} isolated, ${nf(dead)} dead`} className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-ql-text/[0.06]">
          {alive > 0 ? <span className="h-full rounded-full bg-ql-mint" style={{ width: `${pct(alive, start)}%` }} /> : null}
          {isolated > 0 ? <span className="h-full min-w-1 rounded-full bg-ql-amber" style={{ width: `${pct(isolated, start)}%` }} /> : null}
          {dead > 0 ? <span className="h-full min-w-1 rounded-full bg-ql-coral" style={{ width: `${pct(dead, start)}%` }} /> : null}
        </div>
        <p className="mt-2 flex gap-4 text-[12px] text-ql-muted">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-amber" /><span className="font-semibold text-ql-text">{nf(isolated)}</span> isolated</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-coral" /><span className="font-semibold text-ql-text">{nf(dead)}</span> dead</span>
        </p>
        <p className="mt-3 border-t border-ql-line pt-3 font-ql-mono text-[11px] uppercase tracking-[0.06em] text-ql-muted">
          Arrived {new Date(batch.arrivalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </QlHero>

      <div className="grid grid-cols-3 gap-2">
        <QlTile className="p-3">
          <QlLabel>Age</QlLabel>
          <p className="mt-2 font-ql-display text-xl font-semibold leading-none tabular-nums">{nf(metrics.ageInDays)} <span className="font-ql-sans text-xs font-normal text-ql-muted">{metrics.ageInDays === 1 ? 'day' : 'days'}</span></p>
          <p className="mt-1.5 text-[11px] text-ql-muted">Since arrival</p>
        </QlTile>
        <QlTile className="p-3">
          <QlLabel>Mortality</QlLabel>
          <p className={cn('mt-2 font-ql-display text-xl font-semibold leading-none tabular-nums', metrics.mortalityRate > 5 && 'text-ql-coral')}>{Number(metrics.mortalityRate).toFixed(1)}%</p>
          <p className="mt-1.5 text-[11px] text-ql-muted">{nf(metrics.totalMortality)} deaths in total</p>
        </QlTile>
        <QlTile className="p-3">
          <QlLabel>FCR</QlLabel>
          {metrics.fcr > 0 ? (
            <>
              <p className="mt-2 font-ql-display text-xl font-semibold leading-none tabular-nums">{Number(metrics.fcr).toFixed(2)}</p>
              <p className="mt-1.5 text-[11px] text-ql-muted">{nf(metrics.totalFeed)} bags fed</p>
            </>
          ) : (
            <>
              <p className="mt-2 font-ql-display text-xl font-semibold leading-none text-ql-muted"><span aria-hidden="true">—</span><span className="sr-only">Not known</span></p>
              <p className="mt-1.5 text-[11px] text-ql-muted">{nf(metrics.totalFeed)} bags fed. {metrics.isLayer ? 'Needs egg logs' : 'Needs weights'}</p>
            </>
          )}
        </QlTile>
      </div>

      <div className="grid grid-cols-2 gap-2 [&_button]:w-full [&_button]:min-h-11">
        <FlockLogsHistory data={data} />
        <FlockReportGenerator data={data} />
      </div>

      {finance.canViewFinance ? (
        <QlTile aria-labelledby="flock-profit-label">
          <div className="flex items-center justify-between gap-2">
            <QlLabel as="h2" id="flock-profit-label">Net profit</QlLabel>
            {finance.totalRevenue === 0 ? <QlChip tone="amber">No revenue yet</QlChip> : finance.netProfit >= 0 ? <QlChip tone="mint">In profit</QlChip> : <QlChip tone="amber">In loss</QlChip>}
          </div>
          <p className="mt-3 text-[clamp(28px,9.5vw,38px)] leading-none">
            <QlMoney amount={finance.netProfit} currency={currency} className={finance.netProfit < 0 ? 'text-ql-amber' : 'text-ql-text'} />
          </p>
          <dl className="mt-4 grid grid-cols-2 divide-x divide-ql-line border-t border-ql-line pt-3">
            <div className="min-w-0 pr-3"><dt><QlLabel as="span">Revenue</QlLabel></dt><dd className="mt-1 truncate font-ql-display text-base font-semibold tabular-nums">{money(finance.totalRevenue)}</dd></div>
            <div className="min-w-0 pl-3"><dt><QlLabel as="span">Expenses</QlLabel></dt><dd className="mt-1 truncate font-ql-display text-base font-semibold tabular-nums">{money(finance.totalExpenses)}</dd></div>
          </dl>
          <ul className="mt-3 divide-y divide-ql-line border-t border-ql-line">
            {costRows.map((row) => {
              const share = pct(row.amount, finance.totalExpenses)
              return (
                <li key={row.key} className="flex items-center gap-3 py-2.5">
                  <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', row.dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{row.label}</span>
                    <span className="block text-[11px] text-ql-muted">{row.rule}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-ql-mono text-[12px] font-semibold tabular-nums">{money(row.amount)}</span>
                    <span className="block font-ql-mono text-[10px] text-ql-muted"><QlDerived formula={`${row.label} ÷ all expenses`}>{shareText(share)}</QlDerived></span>
                  </span>
                </li>
              )
            })}
          </ul>
        </QlTile>
      ) : null}

      {finance.canViewFinance ? (
        <section aria-labelledby="flock-expenses">
          <div className="flex items-baseline justify-between"><QlLabel as="h2" id="flock-expenses">Expenses</QlLabel><QlLabel as="span">{money(finance.totalExpenses)}</QlLabel></div>
          <div className="mt-2 overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
            {finance.initialInvestment > 0 ? (
              <div className="border-b border-ql-line">
                <button type="button" aria-expanded={investOpen} onClick={() => setInvestOpen((v) => !v)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Initial investment</span>
                    <span className="block text-[12px] text-ql-muted">Livestock purchase · {new Date(batch.arrivalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                  <span className="shrink-0 font-ql-display text-base font-semibold tabular-nums">{money(finance.initialInvestment)}</span>
                  <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-ql-muted transition-transform', investOpen && 'rotate-180')} />
                </button>
                {investOpen ? (
                  <dl className="space-y-1.5 bg-ql-ground/40 px-4 pb-3 text-[13px]">
                    <div className="flex justify-between gap-3"><dt className="text-ql-muted">Purchase cost</dt><dd className="font-ql-mono tabular-nums">{money(batch.initialCostActual)}</dd></div>
                    {batch.initialCostCarriage > 0 ? <div className="flex justify-between gap-3"><dt className="text-ql-muted">Transport and carriage</dt><dd className="font-ql-mono tabular-nums">{money(batch.initialCostCarriage)}</dd></div> : null}
                    {otherCosts.map((cost, index) => (
                      <div key={index} className="flex justify-between gap-3"><dt className="text-ql-muted">{cost.label}</dt><dd className="font-ql-mono tabular-nums">{money(cost.amount)}</dd></div>
                    ))}
                  </dl>
                ) : null}
              </div>
            ) : null}
            {(finance.expenseBreakdown || []).length === 0 && !(finance.initialInvestment > 0) ? (
              <p className="px-4 py-6 text-center text-[13px] text-ql-muted">No expenses recorded for this batch</p>
            ) : (
              <ul className="divide-y divide-ql-line">
                {(finance.expenseBreakdown || []).map((item: any) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.description}</span>
                      <span className="block text-[12px] text-ql-muted">
                        {[item.category ? String(item.category).charAt(0) + String(item.category).slice(1).toLowerCase() : null, new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), item.percentage != null ? `${item.percentage}% used` : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="shrink-0 font-ql-display text-[15px] font-semibold tabular-nums">{money(item.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {finance.canViewFinance ? (
        <section aria-labelledby="flock-revenue">
          <div className="flex items-baseline justify-between">
            <QlLabel as="h2" id="flock-revenue">Revenue</QlLabel>
            <QlLabel as="span">{(finance.revenueBreakdown || []).length} {(finance.revenueBreakdown || []).length === 1 ? 'entry' : 'entries'} · {money(finance.totalRevenue)}</QlLabel>
          </div>
          {(finance.revenueBreakdown || []).length === 0 ? (
            <div className="mt-2 rounded-2xl border border-dashed border-ql-line p-4 text-center">
              <p className="text-[13px] text-ql-muted">No revenue recorded for this batch</p>
              <Link href={`/dashboard/sales?sellBatchId=${batch.id}`} className={qlButton('ghost', 'mt-3 w-full rounded-2xl border-ql-line text-ql-text')}>Record a sale</Link>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-ql-line overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
              {(finance.revenueBreakdown || []).map((item: any) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.description}</span>
                    <span className="block text-[12px] text-ql-muted">{[new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), item.quantity != null ? `${nf(item.quantity)} units` : null, item.percentage != null ? `${item.percentage}%` : null].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 font-ql-display text-[15px] font-semibold tabular-nums">{money(item.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section aria-labelledby="flock-mortality">
        <div className="flex items-center justify-between gap-2">
          <QlLabel as="h2" id="flock-mortality">Mortality</QlLabel>
          <div role="radiogroup" aria-label="Mortality view" className="flex gap-1.5">
            {([['deaths', 'Deaths'], ['cumulative', 'Cumulative %']] as const).map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={mortalityView === value} onClick={() => setMortalityView(value)} className={cn("relative h-8 rounded-full border px-3 text-[12px] font-semibold after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']", mortalityView === value ? 'border-ql-coral/50 bg-ql-coral/10 text-ql-coral' : 'border-ql-line text-ql-muted')}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 rounded-2xl border border-ql-line bg-ql-surface p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-ql-display text-base font-semibold">{mortalityView === 'deaths' ? 'Deaths per day' : 'Share of the flock lost'}</p>
            <QlLabel as="span">Days with deaths</QlLabel>
          </div>
          {mortality.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ql-muted">No deaths logged for this batch.</p>
          ) : (
            <div className="relative mt-4 h-36">
              {mortalityView === 'deaths' && vetLine > 0 && vetLine <= chartMax ? (
                <div aria-hidden="true" className="absolute inset-x-0 z-10" style={{ bottom: `${(vetLine / chartMax) * 100}%` }}>
                  <span className="block border-t border-dashed border-ql-amber" />
                  <span className="absolute bottom-1 right-0 font-ql-mono text-[10px] text-ql-amber">1% a day · {nf(Math.round(vetLine))}</span>
                </div>
              ) : null}
              <ol className="absolute inset-0 flex items-end gap-1.5" aria-label={mortalityView === 'deaths' ? 'Deaths per day' : 'Cumulative share lost'}>
                {mortality.map((row) => {
                  const value = mortalityView === 'deaths' ? row.deaths : row.rate
                  const over = mortalityView === 'deaths' ? row.deaths >= vetLine && vetLine > 0 : row.rate >= 5
                  return (
                    <li key={row.label} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                      <span className={cn('mb-1 font-ql-mono text-[10px] font-semibold', over ? 'text-ql-coral' : 'text-ql-muted')}>{mortalityView === 'deaths' ? nf(value) : `${value}%`}</span>
                      <span aria-label={`${row.label}: ${mortalityView === 'deaths' ? `${row.deaths} deaths` : `${row.rate}% lost`}`} className={cn('block w-full max-w-8 rounded-t-[4px]', over ? 'bg-ql-coral' : 'bg-ql-coral/40')} style={{ height: `${Math.max((value / chartMax) * 100, 2)}%` }} />
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
          {mortality.length > 0 ? (
            <ol aria-hidden="true" className="mt-2 flex gap-1.5 font-ql-mono text-[10px] text-ql-muted">
              {mortality.map((row) => <li key={row.label} className="flex-1 truncate text-center">{row.label}</li>)}
            </ol>
          ) : null}
        </div>
        {worst ? (
          <>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <QlTile className="p-3"><QlLabel>Worst day</QlLabel><p className="mt-2 font-ql-display text-xl font-semibold tabular-nums">{nf(worst.deaths)}</p><p className="mt-1 text-[11px] text-ql-muted">{worst.label}</p></QlTile>
              <QlTile className="p-3"><QlLabel>Total</QlLabel><p className="mt-2 font-ql-display text-xl font-semibold tabular-nums"><QlDerived formula={`${nf(metrics.totalMortality)} ÷ ${nf(start)}`}>{shareText(pct(metrics.totalMortality, start))}</QlDerived></p><p className="mt-1 text-[11px] text-ql-muted">of {nf(start)}</p></QlTile>
              <QlTile className="p-3"><QlLabel>Line</QlLabel><p className={cn('mt-2 font-ql-display text-xl font-semibold tabular-nums', worst.deaths >= vetLine && 'text-ql-coral')}><QlDerived formula={`${nf(worst.deaths)} ÷ ${nf(Math.round(vetLine))} (1% of the flock)`}>{vetLine > 0 ? `${(worst.deaths / vetLine).toFixed(2)}×` : '—'}</QlDerived></p><p className="mt-1 text-[11px] text-ql-muted">the 1% a day mark</p></QlTile>
            </div>
            {vetLine > 0 && worst.deaths >= vetLine ? (
              <div className="mt-2 flex gap-3 rounded-2xl border border-ql-coral/30 bg-ql-coral/[0.06] p-4">
                <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-coral" />
                <p className="text-[13px] text-ql-muted"><span className="font-semibold text-ql-text">{nf(worst.deaths)} deaths on {worst.label}.</span> Over 1% in 24 hours? Contact a veterinarian.</p>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {(metrics.isLayer || metrics.totalEggs > 0) && (series.eggDaily || []).length > 0 ? (
        <section aria-labelledby="flock-eggs">
          <QlLabel as="h2" id="flock-eggs">Eggs per day</QlLabel>
          <div className="mt-2 rounded-2xl border border-ql-line bg-ql-surface p-4">
            {(() => {
              const eggs: Array<{ label: string; eggs: number }> = series.eggDaily.slice(-10)
              const top = Math.max(1, ...eggs.map((row) => row.eggs))
              return (
                <>
                  <ol className="flex h-28 items-end gap-1.5" aria-label="Eggs per day">
                    {eggs.map((row) => (
                      <li key={row.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                        <span aria-label={`${row.label}: ${row.eggs} eggs, ${Math.floor(row.eggs / epc)} crates`} className="block w-full max-w-8 rounded-t-[4px] bg-ql-shell/70" style={{ height: `${Math.max((row.eggs / top) * 100, 2)}%` }} />
                      </li>
                    ))}
                  </ol>
                  <ol aria-hidden="true" className="mt-2 flex gap-1.5 font-ql-mono text-[10px] text-ql-muted">
                    {eggs.map((row) => <li key={row.label} className="flex-1 truncate text-center">{row.label}</li>)}
                  </ol>
                </>
              )
            })()}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="flock-health">
        <QlLabel as="h2" id="flock-health">Health schedule · {logs.vaccinations.length} {logs.vaccinations.length === 1 ? 'vaccination' : 'vaccinations'} · {logs.medications.length} {logs.medications.length === 1 ? 'medication' : 'medications'}</QlLabel>
        <div className="mt-2">
          <FlockHealthSchedule
            batchId={batch.id}
            vaccinations={logs.vaccinations}
            medications={logs.medications}
            vaccineInventory={forms.vaccineInventory}
            medicineInventory={forms.medicineInventory}
            canEdit={forms.canEditHealth}
          />
        </div>
      </section>

      <section aria-labelledby="flock-activity">
        <QlLabel as="h2" id="flock-activity">Recent activity</QlLabel>
        {activity.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-ql-line px-4 py-6 text-center text-[13px] text-ql-muted">No activity logged yet. Use Quick log to record the first entry.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ql-line overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
            {activity.map((item, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-3">
                <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', item._type === 'MORTALITY' ? (item.type === 'SICK' ? 'bg-ql-amber' : 'bg-ql-coral') : item._type === 'EGGS' ? 'bg-ql-shell' : 'bg-ql-muted')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {item._type === 'FEED' ? `Logged ${nf(item.amountConsumed)} ${Number(item.amountConsumed) === 1 ? 'bag' : 'bags'} of feed` : null}
                    {item._type === 'MORTALITY' ? `Recorded ${nf(item.count)} ${item.type === 'SICK' ? 'sick' : Number(item.count) === 1 ? 'death' : 'deaths'}` : null}
                    {item._type === 'EGGS' ? `Collected ${nf(Math.floor(Number(item.eggsCollected || 0) / epc))} crates${Number(item.eggsCollected || 0) % epc ? ` · ${Number(item.eggsCollected) % epc} eggs` : ''}` : null}
                    {item._type === 'WEIGHT' ? `Average weight ${item.averageWeight} kg` : null}
                  </span>
                  <span className="block font-ql-mono text-[10px] uppercase tracking-[0.06em] text-ql-muted">
                    {({ FEED: 'Feed', MORTALITY: 'Mortality', EGGS: 'Eggs', WEIGHT: 'Weight' } as Record<string, string>)[item._type]} ·{' '}
                    {new Date(item.logDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
                <WorkerStamp user={item.user} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ql-line bg-ql-ground/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:hidden">
        <button type="button" onClick={() => setQuickOpen(true)} className={qlButton('filled', 'min-h-12 w-full rounded-2xl')}>
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          Quick log
        </button>
      </div>
      <Dialog isOpen={quickOpen} onOpenChange={setQuickOpen} title="Quick log" description={batch.batchName || 'This batch'}>
        <FlockQuickLog
          batchId={batch.id}
          batchName={batch.batchName || 'This batch'}
          currentCount={batch.currentCount}
          isLayer={metrics.isLayer}
          feedInventory={forms.feedInventory}
          allocationBatches={forms.allocationBatches}
          canEditFinance={finance.canEditFinance}
        />
      </Dialog>
    </div>
  )
}
