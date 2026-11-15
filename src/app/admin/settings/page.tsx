import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminGetAppSettings } from '@/lib/actions/admin-settings-actions'
import { getBillingConfig } from '@/lib/billing/billing-config'
import { APP_SETTINGS_SECTIONS, isAppSettingsSection, type AppSettingsSection } from '@/lib/settings/schemas'
import { cn } from '@/lib/utils'
import SiteSettingsForm from './SiteSettingsForm'
import SystemSettingsForm from './SystemSettingsForm'
import FarmDefaultsForm from './FarmDefaultsForm'
import MessagesForm from './MessagesForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Settings | Poultry Ledger Admin',
  description: 'Website text, announcements, maintenance mode, feature switches, rate limits, farm defaults and messages.',
}

const TABS: AppSettingsSection[] = ['site', 'messages', 'farm-defaults', 'system']

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePaymentAdminPage('settings.manage')
  const { tab: requested } = await searchParams
  const tab: AppSettingsSection = isAppSettingsSection(requested) ? requested : 'site'

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pt-6 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold tracking-normal">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Change how the app behaves without a code change. Each tab saves on its own and takes effect right away.
          </p>
        </header>
        <nav className="flex flex-wrap gap-1 border-b border-zinc-800" aria-label="Settings sections">
          {TABS.map((value) => (
            <Link key={value} href={`/admin/settings?tab=${value}`} aria-current={tab === value ? 'page' : undefined}
              className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
                tab === value ? 'border-emerald-400 text-emerald-100' : 'border-transparent text-zinc-400 hover:text-white')}>
              {APP_SETTINGS_SECTIONS[value].label}
            </Link>
          ))}
        </nav>
        <SettingsTab tab={tab} />
      </div>
    </div>
  )
}

async function SettingsTab({ tab }: { tab: AppSettingsSection }) {
  switch (tab) {
    case 'site': {
      const [initial, billing] = await Promise.all([adminGetAppSettings('site'), getBillingConfig()])
      const planNames = {
        SOLO: { STANDARD: billing.plans.SOLO.STANDARD.name, PREMIUM: billing.plans.SOLO.PREMIUM.name },
        TEAM: { STANDARD: billing.plans.TEAM.STANDARD.name, PREMIUM: billing.plans.TEAM.PREMIUM.name },
      }
      return <SiteSettingsForm key="site" initial={initial} planNames={planNames} />
    }
    case 'system':
      return <SystemSettingsForm key="system" initial={await adminGetAppSettings('system')} />
    case 'farm-defaults':
      return <FarmDefaultsForm key="farm-defaults" initial={await adminGetAppSettings('farm-defaults')} />
    case 'messages':
      return <MessagesForm key="messages" initial={await adminGetAppSettings('messages')} />
  }
}
