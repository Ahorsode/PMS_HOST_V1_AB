import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getActiveAdminUser } from '@/lib/admin-auth'
import { sanitizeAdminCallbackUrl } from '@/lib/admin-session'
import AdminLoginForm from './AdminLoginForm'

export const metadata: Metadata = {
  title: 'Admin Login | Poultry Ledger',
  description: 'Internal Poultry Ledger admin login.',
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>
}) {
  const params = await searchParams
  const callbackUrl = sanitizeAdminCallbackUrl(params?.callbackUrl)
  // Check the session is still live, not just that the cookie is signed:
  // an ended session or deactivated admin would otherwise loop between here
  // and the page guard.
  const adminUser = await getActiveAdminUser()

  if (adminUser) {
    redirect(callbackUrl)
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-page px-4 py-10">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-fg/[0.08] bg-card lg:grid-cols-2">
        <div className="hidden flex-col justify-between border-r border-fg/[0.08] p-8 lg:flex">
          <div>
            <p className="text-sm font-medium text-fg-3">Poultry Ledger internal</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-fg">Admin console</h1>
            <p className="mt-3 max-w-sm text-[15px] leading-6 text-fg-2">
              Farms, payments, plans and settings for Poultry Ledger. For Poultry Ledger staff only.
            </p>
          </div>
          <div className="rounded-xl border border-fg/[0.08] bg-tile p-5">
            <p className="text-sm font-semibold text-fg">Two-step sign-in</p>
            <p className="mt-2 text-sm leading-6 text-fg-2">
              Super admins need an authenticator app code as well as their password. Other admins can turn it on from their Account page.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <AdminLoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  )
}
