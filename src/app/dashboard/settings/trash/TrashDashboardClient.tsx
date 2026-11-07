'use client'

import React, { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trash2, RotateCcw, PawPrint, Egg, Wheat, XCircle, 
  Wallet, ShoppingBag, ClipboardList, Package, Search,
  AlertTriangle, CheckCircle2, Loader2, ArrowLeft
} from 'lucide-react'
import { restoreBatch } from '@/lib/actions/batch-actions'
import { restoreEggProduction } from '@/lib/actions/egg-actions'
import { restoreFeedingLog } from '@/lib/actions/feed-actions'
import { restoreExpense, deleteExpense } from '@/lib/actions/expense-actions'
import { restoreSale } from '@/lib/actions/sale-actions'
import { restoreOrder } from '@/lib/actions/order-actions'
import { restoreInventory } from '@/lib/actions/inventory-actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MutationBoundary } from '@/components/ui/MutationFeedback'
import { getBreedDisplayName } from '@/lib/livestock-breed-options'

type TrashItems = {
  batches: any[]
  feedingLogs: any[]
  eggProduction: any[]
  mortality: any[]
  expenses: any[]
  sales: any[]
  orders: any[]
  inventory: any[]
} | null

const TABS = [
  { key: 'batches',      label: 'Batches',     icon: PawPrint,     color: 'emerald' },
  { key: 'eggProduction',label: 'Egg logs',    icon: Egg,          color: 'yellow'  },
  { key: 'feedingLogs',  label: 'Feed logs',   icon: Wheat,        color: 'orange'  },
  { key: 'mortality',    label: 'Mortality',   icon: XCircle,      color: 'red'     },
  { key: 'expenses',     label: 'Expenses',    icon: Wallet,       color: 'purple'  },
  { key: 'sales',        label: 'Sales',       icon: ShoppingBag,  color: 'blue'    },
  { key: 'orders',       label: 'Orders',      icon: ClipboardList,color: 'indigo'  },
  { key: 'inventory',    label: 'Inventory',   icon: Package,      color: 'teal'    },
]

const COLOR_MAP: Record<string, { tab: string; badge: string; btn: string; glow: string }> = {
  emerald: { tab: 'text-fg border-fg/[0.12]', badge: 'bg-fg/[0.04] text-fg', btn: 'bg-fg/[0.04] hover:bg-fg/[0.04] text-fg', glow: '' },
  yellow:  { tab: 'text-fg border-yellow-500',  badge: 'bg-fg/[0.04] text-fg',  btn: 'bg-fg/[0.04] hover:bg-fg/[0.04] text-fg',  glow: ''  },
  orange:  { tab: 'text-fg border-orange-500',  badge: 'bg-fg/[0.04] text-fg',  btn: 'bg-fg/[0.04] hover:bg-fg/[0.04] text-fg',  glow: ''  },
  red:     { tab: 'text-neg border-red-500',        badge: 'bg-fg/[0.04] text-neg',        btn: 'bg-fg/[0.04] hover:bg-fg/[0.04] text-neg',           glow: ''     },
  purple:  { tab: 'text-fg-2 border-fg/[0.08]',  badge: 'bg-fg/[0.06] text-fg-2',  btn: 'bg-fg/[0.06] hover:bg-fg/[0.06] text-fg-2',  glow: ''  },
  blue:    { tab: 'text-fg-2 border-fg/[0.08]',      badge: 'bg-fg/[0.06] text-fg-2',      btn: 'bg-fg/[0.06] hover:bg-fg/[0.06] text-fg-2',        glow: ''    },
  indigo:  { tab: 'text-fg-2 border-fg/[0.08]',  badge: 'bg-fg/[0.06] text-fg-2',  btn: 'bg-fg/[0.06] hover:bg-fg/[0.06] text-fg-2',  glow: ''  },
  teal:    { tab: 'text-fg-2 border-fg/[0.08]',      badge: 'bg-fg/[0.06] text-fg-2',      btn: 'bg-fg/[0.06] hover:bg-fg/[0.06] text-fg-2',        glow: ''    },
}

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function currency(n: number) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(n)
}

type RestoreFn = (id: string) => Promise<{ success: boolean; error?: string }>

function RestoreButton({ id, onRestore, color }: { id: string; onRestore: RestoreFn; color: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const router = useRouter()
  const c = COLOR_MAP[color]

  const handle = () => {
    if (isPending) return
    startTransition(async () => {
      const res = await onRestore(id)
      if (res.success) {
        setDone(true)
        setTimeout(() => router.refresh(), 800)
      }
    })
  }

  if (done) return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
      <CheckCircle2 className="w-4 h-4" /> Restored
    </span>
  )

  return (
    <motion.button
      
      whileTap={{ scale: 0.96 }}
      onClick={handle}
      disabled={isPending}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${c.btn} shadow-md ${c.glow}`}
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
      {isPending ? 'Restoring...' : 'Restore'}
    </motion.button>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-16 h-16 rounded-full bg-fg/5 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-fg-3" />
      </div>
      <p className="text-fg/60 font-medium text-sm">No deleted {label} found</p>
      <p className="text-fg/60 text-xs">Records you delete will appear here for recovery</p>
    </div>
  )
}

function Row({ children, isMutating = false }: { children: React.ReactNode; isMutating?: boolean }) {
  return (
    <MutationBoundary active={isMutating} label="Restoring record..." className="rounded-lg">
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-fg/5 border border-fg/10 hover:border-fg/20 hover:bg-fg/8 transition-colors"
    >
      {children}
    </motion.div>
    </MutationBoundary>
  )
}

export function TrashDashboardClient({ trashItems }: { trashItems: TrashItems }) {
  const [activeTab, setActiveTab] = useState('batches')
  const [search, setSearch] = useState('')

  if (!trashItems) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-fg/40 text-sm">Unable to load trash data.</p>
    </div>
  )

  const totalCount = Object.values(trashItems).reduce((s, a) => s + a.length, 0)

  const activeTabConfig = TABS.find(t => t.key === activeTab)!
  const c = COLOR_MAP[activeTabConfig.color]

  const renderRows = () => {
    const q = search.toLowerCase()

    if (activeTab === 'batches') {
      const items = trashItems.batches.filter(b =>
        b.batchName.toLowerCase().includes(q) || b.breedType.toLowerCase().includes(q)
      )
      if (!items.length) return <EmptyState label="batches" />
      return items.map(b => (
        <Row key={b.id}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-fg truncate">{b.batchName}</p>
            <p className="text-xs text-fg/50">{getBreedDisplayName(b.breedType)} &bull; {b.initialCount} birds &bull; Arrived {fmt(b.arrivalDate)}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>{b.status}</span>
          <RestoreButton id={b.id} onRestore={restoreBatch} color={activeTabConfig.color} />
        </Row>
      ))
    }

    if (activeTab === 'eggProduction') {
      const items = trashItems.eggProduction.filter(e =>
        (e.batch?.batchName || '').toLowerCase().includes(q)
      )
      if (!items.length) return <EmptyState label="egg logs" />
      return items.map(e => (
        <Row key={e.id}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-fg">{e.batch?.batchName || 'Recovered egg log'}</p>
            <p className="text-xs text-fg/50">{e.eggsCollected} collected &bull; {e.unusableCount} unusable &bull; {fmt(e.logDate)}</p>
          </div>
          <RestoreButton id={e.id} onRestore={restoreEggProduction} color={activeTabConfig.color} />
        </Row>
      ))
    }

    if (activeTab === 'feedingLogs') {
      const items = trashItems.feedingLogs.filter(l =>
        (l.batch?.batchName || '').toLowerCase().includes(q)
      )
      if (!items.length) return <EmptyState label="feed logs" />
      return items.map(l => (
        <Row key={l.id}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-fg">{l.batch?.batchName || 'Recovered feed log'}</p>
            <p className="text-xs text-fg/50">{l.amountConsumed} kg consumed &bull; {fmt(l.logDate)}</p>
          </div>
          <RestoreButton id={l.id} onRestore={restoreFeedingLog} color={activeTabConfig.color} />
        </Row>
      ))
    }

    if (activeTab === 'mortality') {
      const items = trashItems.mortality.filter(m =>
        (m.batch?.batchName || '').toLowerCase().includes(q) || (m.reason || '').toLowerCase().includes(q)
      )
      if (!items.length) return <EmptyState label="mortality records" />
      return items.map(m => (
        <Row key={m.id}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-fg">{m.batch?.batchName || 'Recovered mortality record'}</p>
            <p className="text-xs text-fg/50">{m.count} {m.type.toLowerCase()} &bull; {m.reason || 'No reason'} &bull; {fmt(m.logDate)}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.type === 'DEAD' ? 'bg-fg/[0.04] text-neg' : 'bg-fg/[0.04] text-yolk'}`}>{m.type}</span>
          {/* Mortality restore intentionally omitted — mortality records should not be undone silently */}
          <span className="text-xs text-fg/60">Audit only</span>
        </Row>
      ))
    }

    if (activeTab === 'expenses') {
      const items = trashItems.expenses.filter(e =>
        (e.description || '').toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
      )
      if (!items.length) return <EmptyState label="expenses" />
      return items.map(e => (
        <Row key={e.id}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-fg">{e.description || e.category}</p>
            <p className="text-xs text-fg/50">{e.category} &bull; {fmt(e.expenseDate)}</p>
          </div>
          <span className="text-sm font-medium text-fg/80">{currency(e.amount)}</span>
          <RestoreButton id={e.id} onRestore={restoreExpense} color={activeTabConfig.color} />
        </Row>
      ))
    }

    if (activeTab === 'sales') {
      const items = trashItems.sales.filter(s =>
        (s.customerName || '').toLowerCase().includes(q)
      )
      if (!items.length) return <EmptyState label="sales" />
      return items.map(s => (
        <Row key={s.id}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-fg">{s.customerName || 'Walk-in Customer'}</p>
            <p className="text-xs text-fg/50">{s.items.length} item(s) &bull; {s.status} &bull; {fmt(s.saleDate)}</p>
          </div>
          <span className="text-sm font-medium text-fg/80">{currency(s.totalAmount)}</span>
          <RestoreButton id={s.id} onRestore={restoreSale} color={activeTabConfig.color} />
        </Row>
      ))
    }

    if (activeTab === 'orders') {
      const items = trashItems.orders.filter(o =>
        (o.customer?.name || '').toLowerCase().includes(q)
      )
      if (!items.length) return <EmptyState label="orders" />
      return items.map(o => (
        <Row key={o.id}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-fg">{o.customer?.name || 'No Customer'}</p>
            <p className="text-xs text-fg/50">{o.items.length} item(s) &bull; {o.status} &bull; {fmt(o.orderDate)}</p>
          </div>
          <span className="text-sm font-medium text-fg/80">{currency(o.totalAmount)}</span>
          <RestoreButton id={o.id} onRestore={restoreOrder} color={activeTabConfig.color} />
        </Row>
      ))
    }

    if (activeTab === 'inventory') {
      const items = trashItems.inventory.filter(i =>
        i.itemName.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)
      )
      if (!items.length) return <EmptyState label="inventory items" />
      return items.map(i => (
        <Row key={i.id}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-fg">{i.itemName}</p>
            <p className="text-xs text-fg/50">{i.stockLevel} {i.unit} &bull; {i.category || 'General'}</p>
          </div>
          <RestoreButton id={i.id} onRestore={restoreInventory} color={activeTabConfig.color} />
        </Row>
      ))
    }

    return null
  }

  return (
    <div className="min-h-screen px-0 pt-2 pb-7 md:p-8 space-y-6">
      <Link
        href="/dashboard/settings?tab=farm"
        className="inline-flex items-center gap-2 text-sm font-medium text-fg/60 hover:text-fg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-fg/[0.04] border border-fg/[0.08] flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-neg" />
            </div>
            <h1 className="text-3xl font-medium leading-tight text-fg">Deleted records</h1>
          </div>
          <p className="text-fg/40 text-sm ml-13 pl-0.5">
            Restore records that were deleted. The data is kept until you restore it.
          </p>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fg/[0.04] border border-fg/[0.08]">
            <AlertTriangle className="w-4 h-4 text-neg" />
            <span className="text-xs font-medium text-neg">{totalCount} record{totalCount !== 1 ? 's' : ''} in trash</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30" />
        <input
          type="text"
          placeholder="Search records…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-fg/5 border border-fg/10 rounded-xl text-fg placeholder:text-fg/50 focus:outline-none focus:border-fg/30 transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const count = (trashItems as any)[tab.key]?.length ?? 0
          const isActive = activeTab === tab.key
          const tc = COLOR_MAP[tab.color]
          return (
            <motion.button
              key={tab.key}
              
              whileTap={{ scale: 0.97 }}
              onClick={() => { setActiveTab(tab.key); setSearch('') }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                isActive
                  ? `border-current bg-fg/10 ${tc.tab}`
                  : 'border-fg/10 text-fg/50 hover:text-fg/70 hover:border-fg/20 bg-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${isActive ? tc.badge : 'bg-fg/10 text-fg/50'}`}>
                  {count}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Records List */}
      <div className="glass-pill rounded-2xl p-5 space-y-2.5 min-h-[300px]">
        <AnimatePresence mode="popLayout">
          {renderRows()}
        </AnimatePresence>
      </div>
    </div>
  )
}
