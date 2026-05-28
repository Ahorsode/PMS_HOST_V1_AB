'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  Fingerprint,
  KeyRound,
  Loader2,
  LockKeyhole,
  RadioTower,
  RefreshCcw,
  Search,
  ServerCog,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  confirmManualLicensePayment,
  type LicenseStatus,
  type PaymentAdminDashboardData,
  type PaymentAdminRow,
} from '@/lib/actions/admin-payment-actions'
import { cn, formatCurrency } from '@/lib/utils'

const durationPacks = [
  { value: 30, label: '+30 Days Starter Extension', amount: '120' },
  { value: 90, label: '+3 Months Subscription', amount: '300' },
  { value: 180, label: '+6 Months Subscription', amount: '560' },
  { value: 365, label: '+12 Months Subscription', amount: '1000' },
]

const statusStyle: Record<LicenseStatus, string> = {
  PAID: 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100',
  TRIALING: 'border-amber-300/40 bg-amber-300/15 text-amber-100',
  EXPIRED: 'border-red-300/40 bg-red-300/15 text-red-100',
  PENDING: 'border-stone-300/30 bg-stone-300/10 text-stone-200',
}

const statusDot: Record<LicenseStatus, string> = {
  PAID: 'bg-emerald-300',
  TRIALING: 'bg-amber-300',
  EXPIRED: 'bg-red-300',
  PENDING: 'bg-stone-300',
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not recorded'

  return new Intl.DateTimeFormat('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en-GH', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getExpectedExpiry(row: PaymentAdminRow | null, durationDays: number) {
  const now = new Date()
  const currentExpiry = row?.accessValidUntil ? new Date(row.accessValidUntil) : null
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now
  return addDays(baseDate, durationDays)
}

function MetricRibbon({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  helper: string
  icon: React.ElementType
  tone: string
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[#f7f1df]/10 bg-[#1c1b14]/105 p-5 shadow-2xl shadow-black/20">
      <div className={cn('absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl', tone)} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#d8c78f]/70">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[#fff9e8]">{value}</p>
          <p className="mt-2 text-xs font-semibold text-[#c5ba9a]/75">{helper}</p>
        </div>
        <div className="rounded-2xl border border-[#f7f1df]/10 bg-[#f7f1df]/10 p-3 text-[#fff3c0]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: LicenseStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em]',
        statusStyle[status],
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', statusDot[status])} />
      {status === 'TRIALING' ? 'Trialing' : status.toLowerCase()}
    </span>
  )
}

function TokenPanel({
  token,
  expiresAt,
  copied,
  onCopy,
}: {
  token: string
  expiresAt: string | null
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="rounded-[1.35rem] border border-emerald-300/25 bg-emerald-300/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-emerald-100/100">
            Activation License Token
          </p>
          <p className="mt-2 break-all font-[var(--font-payment-admin-mono)] text-xl font-black tracking-[0.12em] text-emerald-50">
            {token}
          </p>
          <p className="mt-2 text-xs font-semibold text-emerald-100/70">
            Valid until {formatDate(expiresAt)}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onCopy}
          className="border-emerald-200/20 bg-emerald-100/15 text-emerald-50 hover:bg-emerald-100/25"
        >
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy Code'}
        </Button>
      </div>
    </div>
  )
}

export default function PaymentAdminDashboard({
  data,
  adminName,
}: {
  data: PaymentAdminDashboardData
  adminName: string
}) {
  const router = useRouter()
  const [rows, setRows] = useState(data.rows)
  const [metrics, setMetrics] = useState(data.metrics)
  const [query, setQuery] = useState('')
  const [selectedRow, setSelectedRow] = useState<PaymentAdminRow | null>(null)
  const [durationDays, setDurationDays] = useState(90)
  const [amount, setAmount] = useState('300')
  const [paymentModeNote, setPaymentModeNote] = useState('')
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [generatedExpiry, setGeneratedExpiry] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedActivationField, setCopiedActivationField] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(data.rows)
    setMetrics(data.metrics)
  }, [data])

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return rows

    return rows.filter((row) =>
      [
        row.farmName,
        row.ownerName,
        row.ownerPhoneNumber,
        row.ownerEmail,
        row.hardwareId,
        row.deviceName,
        row.rawStatus,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search)),
    )
  }, [query, rows])

  const expectedExpiry = useMemo(
    () => getExpectedExpiry(selectedRow, durationDays),
    [selectedRow, durationDays],
  )

  function openActivationModal(row: PaymentAdminRow) {
    const defaultPack = durationPacks.find((pack) => pack.value === 90) ?? durationPacks[0]
    setSelectedRow(row)
    setDurationDays(defaultPack.value)
    setAmount(defaultPack.amount)
    setPaymentModeNote('')
    setGeneratedToken(null)
    setGeneratedExpiry(null)
    setCopiedToken(false)
    setCopiedActivationField(null)
    setFormError(null)
  }

  function closeModal() {
    if (isPending) return
    setSelectedRow(null)
    setGeneratedToken(null)
    setGeneratedExpiry(null)
    setCopiedToken(false)
    setCopiedActivationField(null)
    setFormError(null)
  }

  function handleDurationChange(value: string) {
    const nextDuration = Number(value)
    const pack = durationPacks.find((option) => option.value === nextDuration)
    setDurationDays(nextDuration)
    if (pack) setAmount(pack.amount)
  }

  async function copyToken(token: string) {
    await navigator.clipboard.writeText(token)
    setCopiedToken(true)
    window.setTimeout(() => setCopiedToken(false), 1800)
  }

  async function copyActivationField(field: string, value: string | null | undefined) {
    if (!value) return

    await navigator.clipboard.writeText(value)
    setCopiedActivationField(field)
    window.setTimeout(() => setCopiedActivationField(null), 1800)
  }

  function handleConfirmPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRow || isPending) return

    setFormError(null)
    setGeneratedToken(null)
    setGeneratedExpiry(null)
    setCopiedToken(false)

    startTransition(async () => {
      const result = await confirmManualLicensePayment({
        deviceRegistrationId: selectedRow.id,
        durationDays,
        amount: Number(amount),
        paymentModeNote,
      })

      if (!result.success) {
        setFormError(result.error)
        return
      }

      const nextPayment = {
        amount: Number(amount),
        currency: 'GHS',
        paymentModeNote,
        createdAt: new Date().toISOString(),
        durationDays,
      }

      setGeneratedToken(result.activationToken)
      setGeneratedExpiry(result.expiresAt)
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === selectedRow.id
            ? {
                ...row,
                licenseStatus: 'PAID',
                rawStatus: 'PAID',
                accessValidUntil: result.expiresAt,
                lastActivationToken: result.activationToken,
                lastPayment: nextPayment,
              }
            : row,
        ),
      )
      setMetrics((currentMetrics) => ({
        ...currentMetrics,
        totalManualRevenueGhs: currentMetrics.totalManualRevenueGhs + Number(amount),
        activePaidLicenses:
          selectedRow.licenseStatus === 'PAID'
            ? currentMetrics.activePaidLicenses
            : currentMetrics.activePaidLicenses + 1,
        expiredLicenses:
          selectedRow.licenseStatus === 'EXPIRED'
            ? Math.max(0, currentMetrics.expiredLicenses - 1)
            : currentMetrics.expiredLicenses,
      }))
      router.refresh()
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(218,168,70,0.20),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(61,156,132,0.24),transparent_30%),linear-gradient(135deg,#10120c_0%,#171611_42%,#221b0f_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto flex max-w-[1500px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="grid gap-5 rounded-[2rem] border border-[#f7f1df]/10 bg-[#14150f]/100 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:grid-cols-[1fr_auto] lg:p-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8c78f]/25 bg-[#d8c78f]/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#fff0b8]">
              <LockKeyhole className="h-3.5 w-3.5" />
              Internal billing ops
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] text-[#fff9e8] sm:text-5xl">
              Payment Management and Offline License Activation
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#d7ccb0]/100 sm:text-base">
              Track registrations, inspect hardware fingerprints, confirm physical cash or MoMo receipts,
              and issue deterministic HatchLog activation tokens for desktop installs.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-[#f7f1df]/10 bg-black/25 p-4 lg:min-w-72">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-200/20 bg-emerald-200/10 p-3 text-emerald-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d8c78f]/70">Authorized admin</p>
                <p className="font-bold text-[#fff9e8]">{adminName}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.refresh()}
              className="justify-center border-[#f7f1df]/10 bg-[#f7f1df]/10 text-[#fff9e8] hover:bg-[#f7f1df]/15"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh registry
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricRibbon
            label="Registered Farms"
            value={metrics.totalRegisteredFarms.toLocaleString()}
            helper="All farms in HatchLog"
            icon={ServerCog}
            tone="bg-[#e4b45c]/30"
          />
          <MetricRibbon
            label="Free Trials"
            value={metrics.activeFreeTrialsCurrentMonth.toLocaleString()}
            helper="Active this month"
            icon={CalendarClock}
            tone="bg-amber-300/30"
          />
          <MetricRibbon
            label="Paid Licenses"
            value={metrics.activePaidLicenses.toLocaleString()}
            helper="Currently active"
            icon={KeyRound}
            tone="bg-emerald-300/30"
          />
          <MetricRibbon
            label="Expired"
            value={metrics.expiredLicenses.toLocaleString()}
            helper="Needs follow-up"
            icon={AlertTriangle}
            tone="bg-red-300/25"
          />
          <MetricRibbon
            label="Manual Revenue"
            value={formatCurrency(metrics.totalManualRevenueGhs, 'GHS')}
            helper="Cash and MoMo receipts"
            icon={Banknote}
            tone="bg-[#9bd6c5]/25"
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#f7f1df]/10 bg-[#14150f]/105 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 border-b border-[#f7f1df]/10 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
            <div>
              <div className="flex items-center gap-2 text-[#fff9e8]">
                <Fingerprint className="h-5 w-5 text-[#d8c78f]" />
                <h2 className="text-xl font-black tracking-tight">Device Registry and Payment Tracking</h2>
              </div>
              <p className="mt-1 text-sm font-semibold text-[#c5ba9a]/75">
                {filteredRows.length.toLocaleString()} of {rows.length.toLocaleString()} registered devices shown
              </p>
            </div>
            <label className="relative block w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d8c78f]/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search farm, phone, owner, hardware ID..."
                className="h-12 w-full rounded-full border border-[#f7f1df]/10 bg-black/25 pl-11 pr-4 text-sm font-bold text-[#fff9e8] outline-none transition focus:border-[#d8c78f]/45 focus:ring-4 focus:ring-[#d8c78f]/10"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#f7f1df]/10 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#d8c78f]/70">
                  <th className="px-5 py-4">Farm / Owner Phone</th>
                  <th className="px-5 py-4">Hardware ID Fingerprint</th>
                  <th className="px-5 py-4">License Status</th>
                  <th className="px-5 py-4">Access Valid Until</th>
                  <th className="px-5 py-4">Last Offline Sync Checkpoint</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f1df]/10">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-[#f7f1df]/5">
                    <td className="px-5 py-5 align-top">
                      <div className="font-black text-[#fff9e8]">{row.farmName}</div>
                      <div className="mt-1 text-sm font-semibold text-[#c5ba9a]/100">{row.ownerName}</div>
                      <div className="mt-2 font-[var(--font-payment-admin-mono)] text-xs font-bold text-[#d8c78f]/100">
                        {row.ownerPhoneNumber || row.ownerEmail || 'No contact saved'}
                      </div>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="max-w-[310px] rounded-2xl border border-[#f7f1df]/10 bg-black/25 px-3 py-2">
                        <p className="font-[var(--font-payment-admin-mono)] text-xs font-bold leading-5 text-[#fff9e8]">
                          {row.hardwareId || 'Awaiting desktop install fingerprint'}
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-[#c5ba9a]/65">
                        {row.deviceName || 'Unlabeled terminal'} {row.deviceType ? `(${row.deviceType})` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <StatusBadge status={row.licenseStatus} />
                      {row.lastPayment && (
                        <p className="mt-2 text-xs font-semibold text-[#c5ba9a]/65">
                          Last receipt: {formatCurrency(row.lastPayment.amount, row.lastPayment.currency)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-5 align-top">
                      <p className="font-bold text-[#fff9e8]">{formatDate(row.accessValidUntil)}</p>
                      <p className="mt-2 text-xs font-semibold text-[#c5ba9a]/65">
                        Registered {formatDate(row.registeredAt)}
                      </p>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/10 bg-black/25 px-3 py-1.5">
                        <RadioTower className="h-3.5 w-3.5 text-[#9bd6c5]" />
                        <span className="font-[var(--font-payment-admin-mono)] text-xs font-bold text-[#fff9e8]">
                          {formatDateTime(row.lastSync)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-right align-top">
                      <Button
                        type="button"
                        variant={row.hardwareId ? 'primary' : 'secondary'}
                        disabled={!row.hardwareId}
                        onClick={() => openActivationModal(row)}
                        className={cn(
                          'min-w-40',
                          row.hardwareId
                            ? 'bg-gradient-to-r from-[#d9a441] to-[#2f9f83] text-[#11140d] shadow-[#d9a441]/20'
                            : 'border-[#f7f1df]/10 bg-[#f7f1df]/10 text-[#c5ba9a]',
                        )}
                      >
                        <KeyRound className="h-4 w-4" />
                        {row.hardwareId ? 'Activate/Renew' : 'No hardware'}
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-md rounded-[1.5rem] border border-[#f7f1df]/10 bg-black/20 p-7">
                        <Search className="mx-auto h-8 w-8 text-[#d8c78f]/70" />
                        <p className="mt-3 text-lg font-black text-[#fff9e8]">No matching farms found</p>
                        <p className="mt-2 text-sm font-semibold text-[#c5ba9a]/70">
                          Try a farm name, owner phone number, hardware fingerprint, or device label.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#f7f1df]/12 bg-[#171711] shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4 border-b border-[#f7f1df]/10 p-5 sm:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d8c78f]/25 bg-[#d8c78f]/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#fff0b8]">
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Manual activation
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-[#fff9e8]">{selectedRow.farmName}</h3>
                <p className="mt-1 text-sm font-semibold text-[#c5ba9a]/100">
                  {selectedRow.ownerName} | {selectedRow.ownerPhoneNumber || selectedRow.ownerEmail || 'No contact saved'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-full border border-[#f7f1df]/10 bg-[#f7f1df]/10 p-2 text-[#fff9e8] transition hover:bg-[#f7f1df]/20 disabled:opacity-50"
                aria-label="Close activation modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="grid gap-5 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[1.35rem] border border-[#d8c78f]/20 bg-[#d8c78f]/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#d8c78f]/90">
                        Farm ID for activation
                      </p>
                      <p className="mt-2 break-all font-[var(--font-payment-admin-mono)] text-sm font-black leading-6 text-[#fff9e8]">
                        {selectedRow.farmId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyActivationField('farmId', selectedRow.farmId)}
                      className="rounded-xl border border-[#f7f1df]/10 bg-[#f7f1df]/10 p-2 text-[#fff9e8] transition hover:bg-[#f7f1df]/20"
                      aria-label="Copy farm ID"
                      title="Copy farm ID"
                    >
                      {copiedActivationField === 'farmId' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-[#c5ba9a]/80">
                    Send this with the license token to bind the farmer&apos;s desktop app to the right farm.
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-[#f7f1df]/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#d8c78f]/70">
                        Hardware Fingerprint Payload
                      </p>
                      <p className="mt-2 break-all font-[var(--font-payment-admin-mono)] text-sm font-bold leading-6 text-[#fff9e8]">
                        {selectedRow.hardwareId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyActivationField('hardwareId', selectedRow.hardwareId)}
                      className="rounded-xl border border-[#f7f1df]/10 bg-[#f7f1df]/10 p-2 text-[#fff9e8] transition hover:bg-[#f7f1df]/20"
                      aria-label="Copy hardware fingerprint"
                      title="Copy hardware fingerprint"
                    >
                      {copiedActivationField === 'hardwareId' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d8c78f]">
                    Duration pack
                  </span>
                  <select
                    value={durationDays}
                    onChange={(event) => handleDurationChange(event.target.value)}
                    disabled={isPending}
                    className="h-12 w-full rounded-2xl border border-[#f7f1df]/10 bg-[#0f100b] px-4 text-sm font-bold text-[#fff9e8] outline-none transition focus:border-[#d8c78f]/45 focus:ring-4 focus:ring-[#d8c78f]/10 disabled:opacity-50"
                  >
                    {durationPacks.map((pack) => (
                      <option key={pack.value} value={pack.value}>
                        {pack.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d8c78f]">
                    Amount received (GHS)
                  </span>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={isPending}
                    inputMode="decimal"
                    className="h-12 w-full rounded-2xl border border-[#f7f1df]/10 bg-[#0f100b] px-4 font-[var(--font-payment-admin-mono)] text-sm font-bold text-[#fff9e8] outline-none transition focus:border-[#d8c78f]/45 focus:ring-4 focus:ring-[#d8c78f]/10 disabled:opacity-50"
                    placeholder="300"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d8c78f]">
                    Payment mode note
                  </span>
                  <textarea
                    value={paymentModeNote}
                    onChange={(event) => setPaymentModeNote(event.target.value)}
                    disabled={isPending}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-[#f7f1df]/10 bg-[#0f100b] px-4 py-3 text-sm font-semibold leading-6 text-[#fff9e8] outline-none transition placeholder:text-[#c5ba9a]/45 focus:border-[#d8c78f]/45 focus:ring-4 focus:ring-[#d8c78f]/10 disabled:opacity-50"
                    placeholder="Received via Mobile Money - Ref Tx: #1234"
                  />
                </label>

                <div className="rounded-[1.25rem] border border-[#f7f1df]/10 bg-[#f7f1df]/10 p-4 md:w-56">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#d8c78f]/70">
                    Target expiry
                  </p>
                  <p className="mt-2 text-lg font-black text-[#fff9e8]">{formatDate(expectedExpiry.toISOString())}</p>
                  <p className="mt-1 text-xs font-semibold text-[#c5ba9a]/70">
                    Deterministic token is bound to this date and hardware ID.
                  </p>
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-3 rounded-[1.25rem] border border-red-300/25 bg-red-300/10 p-4 text-sm font-bold text-red-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              {generatedToken && (
                <TokenPanel
                  token={generatedToken}
                  expiresAt={generatedExpiry}
                  copied={copiedToken}
                  onCopy={() => copyToken(generatedToken)}
                />
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#f7f1df]/10 pt-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={isPending}
                  className="border-[#f7f1df]/10 bg-[#f7f1df]/10 text-[#fff9e8] hover:bg-[#f7f1df]/15"
                >
                  {generatedToken ? 'Close' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  isLoading={isPending}
                  loadingText="Confirming..."
                  disabled={isPending || !selectedRow.hardwareId}
                  className="bg-gradient-to-r from-[#d9a441] to-[#2f9f83] text-[#11140d] shadow-[#d9a441]/20"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                  Confirm Cash Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

