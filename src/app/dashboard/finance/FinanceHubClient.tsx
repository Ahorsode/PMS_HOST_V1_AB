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
  CreditCard,
  GitBranch,
  XCircle
} from 'lucide-react'
import {
  Button,
  Dialog,
  Form,
  FormActions,
  FormError,
  FormRow,
  FormSection,
  FormSummary,
  FormSummaryRow,
  Input,
  MoreDetails,
  Segmented,
  Select,
  Textarea,
  fieldStyles,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { createFinancialTransaction, settleTransaction, deleteFinancialTransaction } from '@/lib/actions/financial-transaction-actions'
import { toLocalDateTimeInputValue } from '@/lib/finance/financial-dates'
import { SkeletonLine } from '@/components/ui/MutationFeedback'
import { MobileCardList } from '@/components/ui/MobileCardList'
import {
  SpecifyAllocationDialog,
  type SavedAllocation,
} from '@/components/finance/SpecifyAllocationDialog'
import { useMoney } from '@/components/providers/CurrencyProvider'
import { QUICK_ICON, quickButtonClass } from '@/components/ui/quick-action';
import { toast } from 'sonner'
import { MobileFinance, LargeAmountNote } from './MobileFinance'

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

/** Ledger rows drawn at first and per "Show more"; totals, search and filters still use every row. */
const LEDGER_PAGE_SIZE = 50

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

  // Phone delete: the reason comes from the type-the-name confirm sheet.
  const deleteFromPhone = async (tx: Transaction, reason: string) => {
    if (mutationMode) return false
    setSelectedTx(tx)
    setMutationMode('delete')
    try {
      const res = await deleteFinancialTransaction(tx.id, reason)
      if (res.success) {
        setTransactions(prev => prev.filter(t => t.id !== tx.id))
        setSelectedTx(null)
        return true
      }
      toast.error(res.error || 'Failed to delete transaction')
      return false
    } finally {
      setMutationMode(null)
    }
  }

  // How many matching rows are drawn. Changing the search or a filter starts
  // again from the first page.
  const filterKey = `${searchTerm}|${filterType}|${filterStatus}`
  const [shownRows, setShownRows] = useState({ filterKey, count: LEDGER_PAGE_SIZE })
  const visibleCount = shownRows.filterKey === filterKey ? shownRows.count : LEDGER_PAGE_SIZE

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
  const visibleTransactions = filteredTransactions.slice(0, visibleCount)

  return (
    <div className="md:space-y-6">
      {/* Phone layout (Quiet Ledger); the sections below are tablet and desktop only. The dialogs are shared. */}
      <div className="md:hidden">
        <MobileFinance
          transactions={transactions}
          filtered={filteredTransactions}
          totalRevenue={totalRevenue}
          totalExpense={totalExpense}
          netPosition={netPosition}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          filterType={filterType}
          onFilterType={setFilterType}
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          canEdit={canEdit}
          money={money}
          busyId={mutationMode ? selectedTx?.id ?? null : null}
          onNewEntry={() => setIsAddOpen(true)}
          onSettle={(tx) => {
            setSelectedTx(tx as Transaction)
            setIsSettleOpen(true)
          }}
          onDelete={(tx, reason) => deleteFromPhone(tx as Transaction, reason)}
        />
      </div>
      <div className="hidden md:block space-y-6">
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
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
          <Input
            aria-label="Search entries"
            type="search"
            placeholder="Search"
            leading={<Search className="h-4 w-4" strokeWidth={1.75} />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            wrapperClassName="md:w-80"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Segmented
              aria-label="Show"
              size="sm"
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'REVENUE', label: 'Money in' },
                { value: 'EXPENSE', label: 'Money out' },
              ]}
            />
            <Select
              aria-label="Paid status"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              wrapperClassName="sm:w-44"
              options={[
                { value: 'ALL', label: 'Any status' },
                { value: 'PAID', label: 'Paid' },
                { value: 'UNPAID', label: 'Not paid' },
                { value: 'PARTIALLY_PAID', label: 'Part paid' },
              ]}
            />
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
                items={visibleTransactions}
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
                  {visibleTransactions.map((tx) => {
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
              {filteredTransactions.length > visibleTransactions.length && (
                <div className="flex flex-col items-center gap-2 border-t border-fg/[0.08] px-5 py-4 sm:flex-row sm:justify-between">
                  <span className="font-mono text-xs tabular-nums text-fg-3">
                    Showing {visibleTransactions.length} of {filteredTransactions.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShownRows({ filterKey, count: visibleCount + LEDGER_PAGE_SIZE })}
                  >
                    Show {Math.min(LEDGER_PAGE_SIZE, filteredTransactions.length - visibleTransactions.length)} more
                  </Button>
                </div>
              )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* CREATE ENTRY MODAL */}
      <Dialog
        isOpen={isAddOpen}
        onOpenChange={(open) => !isAddingTransaction && setIsAddOpen(open)}
        title="Add money in or out"
        className="max-w-lg"
      >
        <Form onSubmit={handleAddSubmit}>
          <FormError>{errorMsg}</FormError>

          <Segmented
            label="Is this money in or money out"
            value={formData.type}
            onChange={handleTypeChange}
            options={[
              { value: 'REVENUE', label: 'Money in', icon: <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} /> },
              { value: 'EXPENSE', label: 'Money out', icon: <ArrowDownRight className="h-4 w-4" strokeWidth={1.75} /> },
            ]}
          />

          <FormSection title="What and how much">
            <Select
              label={formData.type === 'REVENUE' ? 'Where it came from' : 'What it was for'}
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
            >
              {formData.type === 'REVENUE' ? (
                <optgroup label="Money in">
                  {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              ) : (
                <>
                  <optgroup label="Running costs">
                    {OPEX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Equipment and buildings">
                    {CAPEX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </>
              )}
            </Select>
            <Input
              label="Amount"
              type="number"
              step="0.01"
              required
              unit={money.currency}
              placeholder="0.00"
              value={formData.amount}
              onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
            <LargeAmountNote amount={Number(formData.amount)} type={formData.type} transactions={transactions} money={money} />
          </FormSection>

          <FormSection title="Payment">
            <Segmented
              label="Paid?"
              value={formData.paymentStatus}
              onChange={(paymentStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID') => setFormData(prev => ({ ...prev, paymentStatus }))}
              options={[
                { value: 'PAID', label: 'Paid' },
                { value: 'PARTIALLY_PAID', label: 'Part paid' },
                { value: 'UNPAID', label: 'Not paid' },
              ]}
            />
            <FormRow>
              <Select
                label="Paid by"
                value={formData.paymentMethod}
                onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))}
              />
              <Input
                label="Date and time"
                type="datetime-local"
                required
                value={formData.transactionDate}
                onChange={e => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
              />
            </FormRow>
          </FormSection>

          <MoreDetails label="Reference, notes and split across flocks" defaultOpen={Boolean(savedAllocation)}>
            <Input
              label="Reference"
              optional
              type="text"
              placeholder="e.g. MoMo ID or receipt number"
              value={formData.referenceNum}
              onChange={e => setFormData(prev => ({ ...prev, referenceNum: e.target.value }))}
            />
            <Textarea
              label="Notes"
              optional
              placeholder="e.g. Paid to the vet for the March visit"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
            <div className="space-y-2">
              <p className={fieldStyles.label}>Split across flocks</p>
              {savedAllocation ? (
                <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-3.5 text-sm">
                  <span className="min-w-0 truncate font-medium text-fg">{savedAllocation.label}</span>
                  <button
                    type="button"
                    onClick={() => setSavedAllocation(null)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-neg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <XCircle className="h-4 w-4" strokeWidth={1.75} />
                    Clear
                  </button>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAllocationOpen(true)}
                disabled={!formData.amount || Number(formData.amount) <= 0}
                className="w-full"
              >
                <GitBranch className="h-4 w-4" strokeWidth={1.75} />
                {savedAllocation ? 'Change the split' : 'Split across flocks'}
              </Button>
              <p className={fieldStyles.hint}>
                {!formData.amount || Number(formData.amount) <= 0 ? 'Enter the amount first.' : 'Charge part of this to each flock.'}
              </p>
            </div>
          </MoreDetails>

          <SpecifyAllocationDialog
            isOpen={isAllocationOpen}
            onOpenChange={setIsAllocationOpen}
            totalAmount={Number(formData.amount) || 0}
            initial={savedAllocation}
            onSave={setSavedAllocation}
          />

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isAddingTransaction}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={isAddingTransaction} loadingText="Saving">
              Save
            </Button>
          </FormActions>
        </Form>
      </Dialog>

      {/* SETTLE MODAL */}
      <Dialog
        isOpen={isSettleOpen && Boolean(selectedTx)}
        onOpenChange={(open) => !isSettlingTransaction && setIsSettleOpen(open)}
        title="Mark as paid"
        description={
          selectedTx
            ? `${selectedTx.type === 'REVENUE' ? 'Money you are owed' : 'Money you owe'}, from ${new Date(selectedTx.transactionDate).toLocaleDateString()}`
            : undefined
        }
        className="max-w-md"
      >
        {selectedTx ? (
          <Form onSubmit={handleSettleSubmit}>
            <FormError>{errorMsg}</FormError>
            <FormSummary>
              <FormSummaryRow label={selectedTx.category} value={money.format(selectedTx.amount)} strong />
            </FormSummary>
            {selectedTx.description ? (
              <p className="-mt-3 truncate text-[13px] text-fg-3">{selectedTx.description}</p>
            ) : null}
            <Input
              label="Payment reference"
              type="text"
              required
              placeholder="e.g. MoMo ID, bank reference or cheque number"
              value={settleRef}
              onChange={e => setSettleRef(e.target.value)}
            />
            <FormActions>
              <Button type="button" variant="outline" onClick={() => setIsSettleOpen(false)} disabled={isSettlingTransaction}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" isLoading={isSettlingTransaction} loadingText="Saving">
                Mark as paid
              </Button>
            </FormActions>
          </Form>
        ) : null}
      </Dialog>

      {/* SOFT DELETE MODAL */}
      <Dialog
        isOpen={isDeleteOpen && Boolean(selectedTx)}
        onOpenChange={(open) => !isDeletingTransaction && setIsDeleteOpen(open)}
        title="Delete this entry?"
        description="It is moved out of your records and a note of why is kept."
        className="max-w-md"
      >
        {selectedTx ? (
          <Form onSubmit={handleDeleteSubmit}>
            <FormError>{errorMsg}</FormError>
            <p className="rounded-lg border border-fg/[0.08] bg-tile px-3.5 py-3 text-sm font-medium text-fg">
              {selectedTx.category} · {money.format(selectedTx.amount)}
            </p>
            <Textarea
              label="Reason for deleting"
              required
              rows={3}
              placeholder="e.g. Entered twice by mistake"
              hint="At least 5 characters."
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
            />
            <FormActions destructive>
              <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeletingTransaction}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="dangerSolid"
                disabled={deleteReason.trim().length < 5}
                isLoading={isDeletingTransaction}
                loadingText="Deleting"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                Delete
              </Button>
            </FormActions>
          </Form>
        ) : null}
      </Dialog>
    </div>
  )
}
