'use client'

import React, { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Receipt, 
  Tag, 
  Wallet, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Check,
  X,
  CreditCard,
  GitBranch,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { createFinancialTransaction, settleTransaction, deleteFinancialTransaction } from '@/lib/actions/financial-transaction-actions'
import { toLocalDateTimeInputValue } from '@/lib/financial-dates'
import { SkeletonLine } from '@/components/ui/MutationFeedback'
import { MobileCardList } from '@/components/ui/MobileCardList'
import {
  SpecifyAllocationDialog,
  type SavedAllocation,
} from '@/components/finance/SpecifyAllocationDialog'
import { useMoney } from '@/components/providers/CurrencyProvider'
import { QUICK_ICON, quickButtonClass } from '@/components/ui/quick-action';

interface Transaction {
  id: string
  type: string
  category: string
  amount: number
  paymentStatus: string
  paymentMethod: string
  referenceNum: string | null
  transactionDate: string
  description: string | null
  source?: 'LEDGER' | 'EXPENSE'
  user?: {
    firstname: string | null
    surname: string | null
    role: string
  } | null
}

const REVENUE_CATEGORIES = [
  'Egg Wholesale Revenue',
  'Broiler Sales',
  'Manure Sales',
  'Other Revenue'
]

const OPEX_CATEGORIES = [
  'Feed Purchases',
  'Flock Vaccines & Medication',
  'Day-Old Chicks Purchase',
  'Labor & Salaries',
  'Utilities',
  'Transport',
  'Other OpEx'
]

const CAPEX_CATEGORIES = [
  'Equipment & Maintenance',
  'Infrastructure & Setup',
  'Other CapEx'
]

const EXPENSE_CATEGORIES = [...OPEX_CATEGORIES, ...CAPEX_CATEGORIES]

const PAYMENT_METHODS = [
  'Cash',
  'Mobile Money',
  'Bank Transfer',
  'Card'
]

function statusLabel(status: string) {
  if (status === 'PAID') return 'Paid'
  if (status === 'UNPAID') return 'Unpaid'
  if (status === 'PARTIALLY_PAID') return 'Partially paid'
  const text = String(status || '').replace(/_/g, ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function FinanceHubClient({
  initialTransactions,
  canEdit = true
}: {
  initialTransactions: Transaction[]
  canEdit?: boolean
}) {
  const money = useMoney()
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  
  // Modals & form state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSettleOpen, setIsSettleOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [mutationMode, setMutationMode] = useState<'add' | 'settle' | 'delete' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  
  // Add Transaction Form state
  const [formData, setFormData] = useState({
    type: 'EXPENSE' as 'REVENUE' | 'EXPENSE',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    paymentStatus: 'PAID' as 'PAID' | 'UNPAID' | 'PARTIALLY_PAID',
    paymentMethod: 'Cash',
    referenceNum: '',
    transactionDate: toLocalDateTimeInputValue(),
    description: ''
  })
  const [savedAllocation, setSavedAllocation] = useState<SavedAllocation | null>(null)
  const [isAllocationOpen, setIsAllocationOpen] = useState(false)

  // Settle form state
  const [settleRef, setSettleRef] = useState('')

  // Delete form state
  const [deleteReason, setDeleteReason] = useState('')

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'REVENUE' | 'EXPENSE'>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const isAddingTransaction = mutationMode === 'add'
  const isSettlingTransaction = mutationMode === 'settle'
  const isDeletingTransaction = mutationMode === 'delete'

  // Calculate totals based on current list (excluding soft deleted)
  const totalRevenue = transactions
    .filter(t => t.type === 'REVENUE')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  const netPosition = totalRevenue - totalExpense

  // Handle Form Category Adjust when Type Changes
  const handleTypeChange = (type: 'REVENUE' | 'EXPENSE') => {
    setFormData(prev => ({
      ...prev,
      type,
      category: type === 'REVENUE' ? REVENUE_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
    }))
  }

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mutationMode) return
    setMutationMode('add')
    setErrorMsg('')

    const amt = parseFloat(formData.amount)
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0')
      setMutationMode(null)
      return
    }

    try {
      const res = await createFinancialTransaction({
        ...formData,
        amount: amt,
        allocationMode: savedAllocation?.allocationMode,
        allocations: savedAllocation?.allocations,
      })

      if (res.success && res.transaction) {
        // Safely prepend the new transaction
        setTransactions(prev => [res.transaction as any, ...prev])
        setIsAddOpen(false)
        setSavedAllocation(null)
        // reset form
        setFormData({
          type: 'EXPENSE',
          category: EXPENSE_CATEGORIES[0],
          amount: '',
          paymentStatus: 'PAID',
          paymentMethod: 'Cash',
          referenceNum: '',
          transactionDate: toLocalDateTimeInputValue(),
          description: ''
        })
      } else {
        setErrorMsg(res.error || 'Failed to create transaction')
      }
    } finally {
      setMutationMode(null)
    }
  }

  // Handle Settle Submit
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTx) return
    if (mutationMode) return
    setMutationMode('settle')
    setErrorMsg('')

    try {
      const res = await settleTransaction(selectedTx.id, settleRef)
      if (res.success) {
        const baseDesc = selectedTx.description || ''
        const settledSuffix = `Fully settled on ${new Date().toLocaleDateString()}${settleRef ? ` (ref: ${settleRef})` : ''}`
        const updatedDesc = baseDesc 
          ? `${baseDesc} | ${settledSuffix}`
          : settledSuffix;

        setTransactions(prev => prev.map(t => 
          t.id === selectedTx.id 
            ? { 
                ...t, 
                paymentStatus: 'PAID', 
                referenceNum: settleRef || t.referenceNum,
                description: updatedDesc
              } 
            : t
        ))
        setIsSettleOpen(false)
        setSettleRef('')
        setSelectedTx(null)
      } else {
        setErrorMsg(res.error || 'Failed to settle transaction')
      }
    } finally {
      setMutationMode(null)
    }
  }

  // Handle Delete Submit
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTx) return
    if (mutationMode) return
    setMutationMode('delete')
    setErrorMsg('')

    try {
      const res = await deleteFinancialTransaction(selectedTx.id, deleteReason)
      if (res.success) {
        setTransactions(prev => prev.filter(t => t.id !== selectedTx.id))
        setIsDeleteOpen(false)
        setDeleteReason('')
        setSelectedTx(null)
      } else {
        setErrorMsg(res.error || 'Failed to delete transaction')
      }
    } finally {
      setMutationMode(null)
    }
  }

  // Filter list
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.referenceNum && t.referenceNum.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = filterType === 'ALL' ? true : t.type === filterType
    const matchesStatus = filterStatus === 'ALL' ? true : t.paymentStatus === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 px-1 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-fg">Finance</h1>
          <p className="mt-2 text-sm text-fg-2">Every sale, expense and balance owed, in one ledger</p>
        </div>
        {canEdit && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New entry
          </Button>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-fg/[0.08] bg-card p-5">
          <p className="flex items-center gap-2 text-sm text-fg-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Revenue</p>
          <p className="mt-2 truncate text-3xl font-medium leading-none tabular-nums text-fg">{money.format(totalRevenue)}</p>
          <p className="mt-2 font-mono text-xs text-fg-3">All income in the ledger</p>
        </div>
        <div className="min-w-0 rounded-xl border border-fg/[0.08] bg-card p-5">
          <p className="flex items-center gap-2 text-sm text-fg-2"><span className="h-1.5 w-1.5 rounded-full bg-clay" />Expenses</p>
          <p className="mt-2 truncate text-3xl font-medium leading-none tabular-nums text-fg">{money.format(totalExpense)}</p>
          <p className="mt-2 font-mono text-xs text-fg-3">Operating and capital costs</p>
        </div>
        <div className="min-w-0 rounded-xl border border-fg/[0.08] bg-card p-5">
          <p className="text-sm text-fg-2">{netPosition >= 0 ? 'Net profit' : 'Net deficit'}</p>
          <p className={`mt-2 truncate text-3xl font-medium leading-none tabular-nums ${netPosition >= 0 ? 'text-accent' : 'text-neg'}`}>{money.format(netPosition)}</p>
          <p className="mt-2 font-mono text-xs text-fg-3">Revenue minus expenses</p>
        </div>
      </div>

      {/* Advanced Filter Matrix */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-fg-3" />
            </span>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg placeholder:text-fg-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex bg-raised rounded-lg p-0.5 border border-fg/[0.08]">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'ALL' ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg-2 hover:text-fg'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('REVENUE')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'REVENUE' ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg-2 hover:text-fg'}`}
              >
                Revenue
              </button>
              <button
                onClick={() => setFilterType('EXPENSE')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'EXPENSE' ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg-2 hover:text-fg'}`}
              >
                Expenses
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-fg-3 text-xs font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Status:
              </span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-raised border border-fg/[0.08] rounded-lg text-xs font-medium text-fg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-colors"
              >
                <option value="ALL">All status</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIALLY_PAID">Partially paid</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Ledger Balances (Accounts Payable / Receivable) */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-fg/[0.08] px-5 py-4 flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-fg">
            Outstanding balances
          </CardTitle>
          <span className="font-mono text-xs tabular-nums text-fg-3">
            {transactions.filter(t => t.paymentStatus !== 'PAID').length} open
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {transactions.filter(t => t.paymentStatus !== 'PAID').length === 0 ? (
              <div className="p-8 text-center text-fg-3 text-xs font-medium">
                Nothing outstanding
              </div>
            ) : (
              <>
              <MobileCardList
                items={transactions.filter(t => t.paymentStatus !== 'PAID')}
                getKey={(tx) => tx.id}
                onItemClick={canEdit ? (tx) => {
                  setSelectedTx(tx)
                  setIsSettleOpen(true)
                } : undefined}
                cardClassName={(tx) => (!!mutationMode && selectedTx?.id === tx.id ? 'bg-fg/[0.04] animate-pulse' : undefined)}
                title={(tx) => tx.category}
                subtitle={(tx) => `Due ${new Date(tx.transactionDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}`}
                badge={(tx) => (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium text-xs border ${
                    tx.paymentStatus === 'UNPAID'
                      ? 'bg-fg/[0.04] text-neg border-fg/[0.08]'
                      : 'bg-fg/[0.04] text-yolk border-fg/[0.08]'
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    {statusLabel(tx.paymentStatus)}
                  </span>
                )}
                fields={(tx) => [
                  {
                    label: 'Amount',
                    value: <span className={`font-medium ${tx.type === 'REVENUE' ? 'text-fg' : 'text-yolk'}`}>{`${money.format(tx.amount)}`}</span>,
                  },
                  {
                    label: 'Type',
                    value: <span className={`text-xs font-medium ${tx.type === 'REVENUE' ? 'text-fg' : 'text-yolk'}`}>{tx.type === 'REVENUE' ? 'Receivable' : 'Payable'}</span>,
                  },
                  { label: 'Reference', full: true, value: <span className="font-mono text-xs text-fg-3">{tx.referenceNum || '—'}</span> },
                ]}
                actions={canEdit ? (tx) => (
                  <button
                    onClick={() => {
                      setSelectedTx(tx)
                      setIsSettleOpen(true)
                    }}
                    className="inline-flex items-center gap-1 bg-fg/[0.04] text-fg px-3 py-2 rounded text-xs font-medium border border-fg/[0.08]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Settle
                  </button>
                ) : undefined}
              />
              <table className="hidden md:table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-fg/5 text-fg-3 text-xs font-medium border-b border-fg/5">
                    <th className="py-3 px-6">Due date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                    {canEdit && <th className="py-3 px-6 text-center">Quick action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-fg/5">
                  {transactions
                    .filter(t => t.paymentStatus !== 'PAID')
                    .map((tx) => {
                      const isMutatingTx = !!mutationMode && selectedTx?.id === tx.id

                      return (
                      <tr 
                        key={tx.id} 
                        onClick={() => {
                          if (canEdit) {
                            setSelectedTx(tx)
                            setIsSettleOpen(true)
                          }
                        }}
                        className={`hover:bg-fg/[0.04] transition-colors group cursor-pointer ${isMutatingTx ? 'bg-fg/[0.04] animate-pulse' : ''}`}
                        title="Click to quickly settle transaction"
                      >
                        <td className="py-4 px-6 text-fg text-xs font-medium">
                          {isMutatingTx ? <SkeletonLine className="h-3 w-24" /> : new Date(tx.transactionDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </td>
                        <td className="py-4 px-4 text-xs font-medium">
                          {isMutatingTx ? <SkeletonLine className="h-3 w-28" /> : <span className={`inline-flex items-center gap-1 ${tx.type === 'REVENUE' ? 'text-fg' : 'text-yolk'}`}>
                            {tx.type === 'REVENUE' ? (
                              <>
                                <ArrowUpRight className="w-4 h-4" />
                                Receivable
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="w-4 h-4" />
                                Payable
                              </>
                            )}
                          </span>}
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-fg max-w-[150px] truncate">
                          {isMutatingTx ? <SkeletonLine className="h-3 w-24" /> : tx.category}
                        </td>
                        <td className="py-4 px-4 text-xs text-fg-3 font-medium font-mono">
                          {isMutatingTx ? <SkeletonLine className="h-3 w-16" /> : tx.referenceNum || '—'}
                        </td>
                        <td className="py-4 px-4 text-xs">
                          {isMutatingTx ? <SkeletonLine className="h-5 w-20" /> : <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium text-xs border ${
                            tx.paymentStatus === 'UNPAID'
                              ? 'bg-fg/[0.04] text-neg border-fg/[0.08]'
                              : 'bg-fg/[0.04] text-yolk border-fg/[0.08]'
                          }`}>
                            <AlertTriangle className="w-3 h-3" />
                            {statusLabel(tx.paymentStatus)}
                          </span>}
                        </td>
                        <td className={`py-4 px-6 text-right text-sm font-medium ${tx.type === 'REVENUE' ? 'text-fg' : 'text-yolk'}`}>
                          {isMutatingTx ? <SkeletonLine className="ml-auto h-3 w-20" /> : `${money.format(tx.amount)}`}
                        </td>
                        {canEdit && (
                          <td className="py-4 px-6 text-center">
                            <span className="inline-flex items-center gap-1 bg-fg/[0.04] text-fg group-hover:bg-fg/[0.08] group-hover:text-fg px-2.5 py-1 rounded text-xs font-medium transition-colors border border-fg/[0.08]">
                              <Check className="w-3.5 h-3.5" />
                              Settle
                            </span>
                          </td>
                        )}
                      </tr>
                      )
                    })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Ledger Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-fg/[0.08] px-5 py-4 flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-fg">
            All transactions
          </CardTitle>
          <span className="font-mono text-xs tabular-nums text-fg-3">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-fg-3 text-sm font-medium">
                No financial ledger records found matching current criteria.
              </div>
            ) : (
              <>
              <MobileCardList
                items={filteredTransactions}
                getKey={(tx) => tx.id}
                cardClassName={(tx) => (!!mutationMode && selectedTx?.id === tx.id ? 'bg-fg/[0.04] animate-pulse' : undefined)}
                title={(tx) => tx.category}
                subtitle={(tx) => new Date(tx.transactionDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                badge={(tx) => (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium text-xs border ${
                    tx.paymentStatus === 'PAID'
                      ? 'bg-fg/[0.04] text-accent border-fg/[0.08]'
                      : tx.paymentStatus === 'UNPAID'
                      ? 'bg-fg/[0.04] text-neg border-fg/[0.08]'
                      : 'bg-fg/[0.04] text-yolk border-fg/[0.08]'
                  }`}>
                    {tx.paymentStatus === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                    {tx.paymentStatus === 'UNPAID' && <AlertTriangle className="w-3 h-3" />}
                    {tx.paymentStatus === 'PARTIALLY_PAID' && <Clock className="w-3 h-3" />}
                    {statusLabel(tx.paymentStatus)}
                  </span>
                )}
                fields={(tx) => [
                  {
                    label: 'Amount',
                    value: <span className={`font-medium ${tx.type === 'REVENUE' ? 'text-accent' : 'text-neg'}`}>{`${tx.type === 'REVENUE' ? '+' : '-'}${money.format(tx.amount)}`}</span>,
                  },
                  {
                    label: 'Type',
                    value: <span className={`text-xs font-medium ${tx.type === 'REVENUE' ? 'text-accent' : 'text-neg'}`}>{tx.type === 'REVENUE' ? 'Revenue' : 'Expense'}</span>,
                  },
                  { label: 'Method', value: <span className="text-xs font-medium text-fg-2">{tx.paymentMethod}</span> },
                  { label: 'Reference', value: <span className="font-mono text-xs text-fg-3">{tx.referenceNum || '—'}</span> },
                ]}
                actions={canEdit ? (tx) => (
                  tx.source === 'EXPENSE' ? (
                    <span
                      className="inline-flex items-center gap-1 bg-raised text-fg-3 px-2.5 py-1 rounded text-xs font-medium border border-fg/[0.08]"
                      title="Auto-logged operational expense — manage it from inventory, health, or the source module"
                    >
                      Auto-logged
                    </span>
                  ) : (
                    <>
                      {tx.paymentStatus !== 'PAID' && (
                        <button
                          onClick={() => {
                            setSelectedTx(tx)
                            setIsSettleOpen(true)
                          }}
                          className="bg-fg/[0.04] text-fg hover:bg-fg/[0.08] hover:text-fg px-3 py-2 rounded text-xs font-medium transition-colors border border-fg/[0.08] flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Settle
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedTx(tx)
                          setIsDeleteOpen(true)
                        }}
                        className={quickButtonClass('delete')}
                        aria-label="Delete transaction"
                        title="Delete"
                      >
                        <Trash2 {...QUICK_ICON} />
                      </button>
                    </>
                  )
                ) : undefined}
              />
              <table className="hidden md:table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-fg/5 text-fg-3 text-xs font-medium border-b border-fg/5">
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                    {canEdit && <th className="py-3 px-6 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-fg/5">
                  {filteredTransactions.map((tx) => {
                    const isMutatingTx = !!mutationMode && selectedTx?.id === tx.id

                    return (
                    <tr key={tx.id} className={`hover:bg-fg/5 transition-colors group ${isMutatingTx ? 'bg-fg/[0.04] animate-pulse' : ''}`}>
                      <td className="py-4 px-6 text-fg text-xs font-medium">
                        {isMutatingTx ? <SkeletonLine className="h-3 w-24" /> : new Date(tx.transactionDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-4 px-4 text-xs font-medium">
                        {isMutatingTx ? <SkeletonLine className="h-3 w-20" /> : <span className={`inline-flex items-center gap-1 ${tx.type === 'REVENUE' ? 'text-accent' : 'text-neg'}`}>
                          {tx.type === 'REVENUE' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {tx.type === 'REVENUE' ? 'Revenue' : 'Expense'}
                        </span>}
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-fg max-w-[150px] truncate" title={tx.category}>
                        {isMutatingTx ? <SkeletonLine className="h-3 w-28" /> : tx.category}
                      </td>
                      <td className="py-4 px-4 text-xs text-fg-2 font-medium">
                        {isMutatingTx ? <SkeletonLine className="h-3 w-16" /> : tx.paymentMethod}
                      </td>
                      <td className="py-4 px-4 text-xs text-fg-3 font-medium font-mono" title={tx.referenceNum || ''}>
                        {isMutatingTx ? <SkeletonLine className="h-3 w-16" /> : tx.referenceNum || '—'}
                      </td>
                      <td className="py-4 px-4 text-xs">
                        {isMutatingTx ? <SkeletonLine className="h-5 w-20" /> : <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium text-xs border ${
                          tx.paymentStatus === 'PAID' 
                            ? 'bg-fg/[0.04] text-accent border-fg/[0.08]' 
                            : tx.paymentStatus === 'UNPAID'
                            ? 'bg-fg/[0.04] text-neg border-fg/[0.08]'
                            : 'bg-fg/[0.04] text-yolk border-fg/[0.08]'
                        }`}>
                          {tx.paymentStatus === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                          {tx.paymentStatus === 'UNPAID' && <AlertTriangle className="w-3 h-3" />}
                          {tx.paymentStatus === 'PARTIALLY_PAID' && <Clock className="w-3 h-3" />}
                          {statusLabel(tx.paymentStatus)}
                        </span>}
                      </td>
                      <td className={`py-4 px-6 text-right text-sm font-medium ${tx.type === 'REVENUE' ? 'text-accent' : 'text-neg'}`}>
                        {isMutatingTx ? <SkeletonLine className="ml-auto h-3 w-20" /> : `${tx.type === 'REVENUE' ? '+' : '-'}${money.format(tx.amount)}`}
                      </td>
                      {canEdit && (
                        <td className="py-4 px-6 text-center">
                          {tx.source === 'EXPENSE' ? (
                            <span
                              className="inline-flex items-center gap-1 bg-raised text-fg-3 px-2.5 py-1 rounded text-xs font-medium border border-fg/[0.08]"
                              title="Auto-logged operational expense — manage it from inventory, health, or the source module"
                            >
                              Auto-logged
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              {tx.paymentStatus !== 'PAID' && (
                                <button
                                  onClick={() => {
                                    setSelectedTx(tx)
                                    setIsSettleOpen(true)
                                  }}
                                  className="bg-fg/[0.04] text-fg hover:bg-fg/[0.08] hover:text-fg px-2.5 py-1 rounded text-xs font-medium transition-colors border border-fg/[0.08] flex items-center gap-1"
                                  title="Settle outstanding balance"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Settle
                                </button>
                              )}
                              <button aria-label="Delete transaction (soft)"
                                onClick={() => {
                                  setSelectedTx(tx)
                                  setIsDeleteOpen(true)
                                }}
                                className={quickButtonClass('delete')}
                                title="Delete transaction (soft)"
                              >
                                <Trash2 {...QUICK_ICON} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CREATE ENTRY MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <Card className="bg-card border-fg/10 w-full max-w-lg relative">
            <button aria-label="Close" 
              onClick={() => setIsAddOpen(false)}
              disabled={isAddingTransaction}
              className="absolute top-4 right-4 text-fg-3 hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
            <CardHeader>
              <CardTitle className="text-fg text-xl font-medium">Record ledger entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSubmit} className="space-y-4 text-fg">
                {errorMsg && (
                  <div className="p-3 bg-fg/[0.04] border border-fg/[0.08] text-neg text-xs rounded-lg font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Type selector tabs */}
                <div className="grid grid-cols-2 bg-raised rounded-lg p-1 border border-fg/[0.08]">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('REVENUE')}
                    className={`py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${formData.type === 'REVENUE' ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg-2 hover:text-fg'}`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Revenue (inflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('EXPENSE')}
                    className={`py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${formData.type === 'EXPENSE' ? 'bg-rose-500 text-white shadow' : 'text-fg-2 hover:text-fg'}`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    Expense (outflow)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-fg-3 text-xs font-medium mb-1.5">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {formData.type === 'REVENUE' ? (
                        <optgroup label="Consolidated revenue streams">
                          {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ) : (
                        <>
                          <optgroup label="Operating expenses (OpEx)">
                            {OPEX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </optgroup>
                          <optgroup label="Capital expenditure (CapEx)">
                            {CAPEX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </optgroup>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-fg-3 text-xs font-medium mb-1.5">Amount ({money.currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-fg-3 text-xs font-medium mb-1.5">Payment method</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-fg-3 text-xs font-medium mb-1.5">Payment status</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={e => setFormData(prev => ({ ...prev, paymentStatus: e.target.value as any }))}
                      className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="PAID">Paid</option>
                      <option value="UNPAID">Unpaid</option>
                      <option value="PARTIALLY_PAID">Partially paid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-fg-3 text-xs font-medium mb-1.5">Date & time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.transactionDate}
                      onChange={e => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
                      className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-fg-3 text-xs font-medium mb-1.5">Reference number</label>
                    <input
                      type="text"
                      placeholder="e.g. TxRef-12345"
                      value={formData.referenceNum}
                      onChange={e => setFormData(prev => ({ ...prev, referenceNum: e.target.value }))}
                      className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-fg-3 text-xs font-medium mb-1.5">Description (notes)</label>
                  <textarea
                    placeholder="Log detail notes..."
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="rounded-lg border border-fg/[0.08] bg-raised p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-fg">Specify allocation</p>
                      <p className="text-[11px] text-fg-3">Split this entry across livestock batches</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setIsAllocationOpen(true)}
                      disabled={!formData.amount || Number(formData.amount) <= 0}
                      className="bg-raised hover:bg-slate-600 text-fg font-medium text-xs"
                    >
                      <GitBranch className="w-4 h-4" />
                      {savedAllocation ? 'Edit allocation' : 'Specify allocation'}
                    </Button>
                  </div>
                  {savedAllocation ? (
                    <div className="flex items-center justify-between rounded-md border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-xs">
                      <span className="font-medium text-accent">{savedAllocation.label}</span>
                      <button
                        type="button"
                        onClick={() => setSavedAllocation(null)}
                        className="inline-flex items-center gap-1 text-neg hover:text-neg"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>

                <SpecifyAllocationDialog
                  isOpen={isAllocationOpen}
                  onOpenChange={setIsAllocationOpen}
                  totalAmount={Number(formData.amount) || 0}
                  initial={savedAllocation}
                  onSave={setSavedAllocation}
                />

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    disabled={isAddingTransaction}
                    className="bg-raised hover:bg-slate-600 text-fg font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isAddingTransaction}
                    loadingText="Submitting..."
                    className="bg-fg hover:bg-fg/90 text-page font-medium"
                  >
                    Record transaction
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SETTLE MODAL */}
      {isSettleOpen && selectedTx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <Card className="bg-card border-fg/10 w-full max-w-md relative">
            <button aria-label="Close" 
              onClick={() => setIsSettleOpen(false)}
              disabled={isSettlingTransaction}
              className="absolute top-4 right-4 text-fg-3 hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
            <CardHeader className="pb-2">
              <CardTitle className="text-fg text-xl font-medium">Record settle payment</CardTitle>
              <p className="text-xs text-fg-3 font-medium mt-1">
                Settling {selectedTx.type === 'REVENUE' ? 'Receivable' : 'Payable'} invoice {selectedTx.referenceNum ? `#${selectedTx.referenceNum}` : 'for this transaction'} generated on {new Date(selectedTx.transactionDate).toLocaleDateString()} for {money.format(selectedTx.amount)}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSettleSubmit} className="space-y-4 text-fg">
                {errorMsg && (
                  <div className="p-3 bg-fg/[0.04] border border-fg/[0.08] text-neg text-xs rounded-lg font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="p-3 bg-raised rounded-lg border border-fg/[0.08] space-y-1.5">
                  <p className="text-fg-3 text-xs font-medium">Unpaid transaction info</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-fg">{selectedTx.category}</span>
                    <span className="font-medium text-fg">{money.format(selectedTx.amount)}</span>
                  </div>
                  {selectedTx.description && (
                    <p className="text-xs text-fg-3 truncate">{selectedTx.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-fg-3 text-xs font-medium mb-1.5">Settlement transaction reference (optional)</label>
                  <input
                    type="text"
                    required
                    placeholder="Momo TxID, bank ref, cheque num..."
                    value={settleRef}
                    onChange={e => setSettleRef(e.target.value)}
                    className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => setIsSettleOpen(false)}
                    disabled={isSettlingTransaction}
                    className="bg-raised hover:bg-slate-600 text-fg font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSettlingTransaction}
                    loadingText="Saving..."
                    className="bg-fg hover:bg-fg/90 text-page font-medium"
                  >
                    Confirm settlement
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SOFT DELETE MODAL */}
      {isDeleteOpen && selectedTx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <Card className="bg-card border-fg/10 w-full max-w-md relative">
            <button aria-label="Close" 
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeletingTransaction}
              className="absolute top-4 right-4 text-fg-3 hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
            <CardHeader>
              <CardTitle className="text-fg text-xl font-medium">Soft delete transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDeleteSubmit} className="space-y-4 text-fg">
                {errorMsg && (
                  <div className="p-3 bg-fg/[0.04] border border-fg/[0.08] text-neg text-xs rounded-lg font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="p-3 bg-fg/[0.04] border border-fg/[0.08] rounded-lg space-y-1 text-neg text-xs">
                  <p className="font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Destructive ledger action
                  </p>
                  <p>You are soft-deleting ledger item for <b>{selectedTx.category}</b> ({money.format(selectedTx.amount)}). An audit record will be logged with the reason.</p>
                </div>

                <div>
                  <label className="block text-fg-3 text-xs font-medium mb-1.5">Reason for deletion</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a valid accounting explanation (minimum 5 characters)..."
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    className="w-full bg-raised border border-fg/[0.08] rounded-lg text-sm text-fg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => setIsDeleteOpen(false)}
                    disabled={isDeletingTransaction}
                    className="bg-raised hover:bg-slate-600 text-fg font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={deleteReason.trim().length < 5}
                    isLoading={isDeletingTransaction}
                    loadingText="Deleting..."
                    className="bg-rose-500 hover:bg-rose-600 text-white font-medium"
                  >
                    Log deletion
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
