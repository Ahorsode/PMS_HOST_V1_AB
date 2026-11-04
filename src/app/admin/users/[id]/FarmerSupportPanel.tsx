'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRightLeft, KeyRound, LogOut, Mail, Search } from 'lucide-react'
import {
  adminResetFarmerLogin,
  adminSearchFarmers,
  adminSignOutFarmer,
  adminTransferFarm,
  adminUpdateFarmerContact,
  type FarmerActionResult,
  type FarmerDetail,
  type FarmerSearchRow,
} from '@/lib/actions/admin-farmer-actions'
import { cn } from '@/lib/utils'

const inputClass =
  'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50'

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <h2 className="flex items-center gap-2 border-b border-zinc-800 px-5 py-3 text-sm font-semibold text-white">{icon}{title}</h2>
      <div className="space-y-3 p-5">{children}</div>
    </section>
  )
}

/** Support actions for one farmer: sign-in code, contact details, sign-out, farm hand-over. */
export default function FarmerSupportPanel({ farmer, canManage }: { farmer: FarmerDetail; canManage: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState<{ code: string; message: string } | null>(null)
  const [email, setEmail] = useState(farmer.email ?? '')
  const [phone, setPhone] = useState(farmer.phoneNumber ?? '')
  const [transferFarmId, setTransferFarmId] = useState<string | null>(null)
  const [newOwnerId, setNewOwnerId] = useState('')
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<FarmerSearchRow[]>([])
  const disabled = !canManage || isPending

  function run(action: () => Promise<FarmerActionResult>, success: string, after?: (result: Extract<FarmerActionResult, { success: true }>) => void) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(success)
        after?.(result)
        router.refresh()
      } catch (error) {
        console.error('[FarmerSupportPanel]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-normal">{farmer.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {farmer.role.replace('_', ' ').toLowerCase()} · joined {new Date(farmer.createdAt).toLocaleDateString('en-GH')}
          {farmer.mustChangePassword ? ' · must choose a new password at next sign-in' : ''}
        </p>
        {farmer.memberships.length > 0 ? (
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            {farmer.memberships.map((membership) => (
              <Link key={membership.farmId} href={`/admin/farms/${membership.farmId}`}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:border-zinc-500">
                {membership.farmName} · {membership.role.toLowerCase()}
              </Link>
            ))}
          </p>
        ) : null}
        {!canManage ? <p className="mt-2 text-xs text-amber-200">Your admin role can view but not change this account.</p> : null}
      </header>

      <Card icon={<KeyRound className="h-4 w-4 text-emerald-200" />} title="Help them sign in">
        <p className="text-sm text-zinc-400">
          Gives them a one-time code to sign in with instead of their password, then they choose a new password. Their old
          password stops working and they are signed out everywhere.
        </p>
        <button type="button" disabled={disabled}
          onClick={() => {
            if (!window.confirm(`Reset ${farmer.name}'s sign-in? Their current password will stop working.`)) return
            run(() => adminResetFarmerLogin(farmer.id), 'One-time code created', (result) => setCode({ code: result.code ?? '', message: result.message ?? '' }))
          }}
          className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
          Create one-time sign-in code
        </button>
        {code ? (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="font-mono text-2xl font-bold tracking-widest text-white">{code.code}</p>
            <p className="mt-2 text-xs text-emerald-100/80">{code.message} It is not shown again.</p>
          </div>
        ) : null}
      </Card>

      <Card icon={<Mail className="h-4 w-4 text-emerald-200" />} title="Sign-in details">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            run(() => adminUpdateFarmerContact(farmer.id, { email: email || null, phoneNumber: phone || null }), 'Sign-in details updated')
          }}
        >
          <label className="block">
            <span className="text-xs font-semibold text-zinc-300">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={disabled} placeholder="0540000000" className={cn(inputClass, 'mt-1')} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-zinc-300">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} className={cn(inputClass, 'mt-1')} />
          </label>
          <button type="submit" disabled={disabled} className="h-10 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:border-zinc-500 disabled:opacity-50">
            Save
          </button>
        </form>
      </Card>

      <Card icon={<LogOut className="h-4 w-4 text-emerald-200" />} title="Sign out everywhere">
        <p className="text-sm text-zinc-400">For a lost or shared phone. They stay signed out until they sign in again with their password.</p>
        <button type="button" disabled={disabled}
          onClick={() => run(() => adminSignOutFarmer(farmer.id), `${farmer.name} signed out everywhere`)}
          className="h-10 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:border-red-400/50 disabled:opacity-50">
          Sign out everywhere
        </button>
      </Card>

      {farmer.ownedFarms.length > 0 ? (
        <Card icon={<ArrowRightLeft className="h-4 w-4 text-emerald-200" />} title="Hand over a farm">
          <p className="text-sm text-zinc-400">
            Makes someone else the owner. {farmer.name} stays on as a manager; both are signed out so their access updates.
          </p>
          {farmer.ownedFarms.map((farm) => (
            <div key={farm.id} className="rounded-md border border-zinc-800 p-3">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/admin/farms/${farm.id}`} className="font-semibold text-zinc-100 hover:underline">{farm.name}</Link>
                <button type="button" disabled={disabled}
                  onClick={() => {
                    setTransferFarmId(transferFarmId === farm.id ? null : farm.id)
                    setNewOwnerId('')
                    setOwnerResults([])
                    setOwnerQuery('')
                  }}
                  className="h-8 rounded-md border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 disabled:opacity-50">
                  Hand over
                </button>
              </div>
              {transferFarmId === farm.id ? (
                <div className="mt-3 space-y-2">
                  <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} disabled={disabled} className={inputClass} aria-label="New owner">
                    <option value="">Choose the new owner…</option>
                    {farm.members.map((member) => (
                      <option key={member.userId} value={member.userId}>{member.name} (now {member.role.toLowerCase()})</option>
                    ))}
                    {ownerResults
                      .filter((result) => result.id !== farmer.id && !farm.members.some((member) => member.userId === result.id))
                      .map((result) => (
                        <option key={result.id} value={result.id}>{result.name} ({result.phoneNumber ?? result.email ?? 'no contact'})</option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input value={ownerQuery} onChange={(e) => setOwnerQuery(e.target.value)} disabled={disabled}
                        placeholder="Not on the farm? Find them by phone, email or name" className={cn(inputClass, 'pl-9')} />
                    </div>
                    <button type="button" disabled={disabled || ownerQuery.trim().length < 2}
                      onClick={() => startTransition(async () => {
                        const results = await adminSearchFarmers(ownerQuery)
                        setOwnerResults(results)
                        if (results.length === 0) toast.info('No account found. They need to sign up first.')
                      })}
                      className="h-10 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 disabled:opacity-50">
                      Find
                    </button>
                  </div>
                  <button type="button" disabled={disabled || !newOwnerId}
                    onClick={() => {
                      if (!window.confirm(`Make the selected person the owner of ${farm.name}?`)) return
                      run(() => adminTransferFarm(farm.id, newOwnerId), `${farm.name} handed over`, () => setTransferFarmId(null))
                    }}
                    className="h-10 rounded-md bg-amber-500 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50">
                    Make them the owner
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  )
}
