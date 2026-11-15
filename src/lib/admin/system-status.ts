// Health checks for the admin System status page. Each check says what is set
// up, never the secret itself. Callers check the admin's permission first.
import prisma from '@/lib/db'
import { getBillingConfig } from '@/lib/billing/billing-config'
import { isPaystackConfigured } from '@/lib/billing/paystack'
import { getAppSettings } from '@/lib/settings/app-settings'
import { PLAN_FEATURE_DETAILS } from '@/lib/billing/pricing'

export type CheckState = 'ok' | 'warning' | 'problem' | 'info'

export type StatusCheck = { name: string; state: CheckState; detail: string; group: string }

/** Tables added by the admin console migrations; missing ones mean a migration has not run. */
const EXPECTED_TABLES = [
  'billing_settings',
  'app_settings',
  'admin_audit_log',
  'promo_codes',
  'farm_overrides',
  'farm_notes',
  'farm_messages',
  'admin_sessions',
] as const

const isSet = (value: string | undefined) => !!value && value.trim().length > 0

export async function getSystemStatus(): Promise<StatusCheck[]> {
  const checks: StatusCheck[] = []
  const add = (group: string, name: string, state: CheckState, detail: string) => checks.push({ group, name, state, detail })
  const production = process.env.NODE_ENV === 'production'

  // Database and migrations
  try {
    await prisma.$queryRaw`SELECT 1`
    add('Database', 'Connection', 'ok', 'The database answers.')
  } catch (error) {
    add('Database', 'Connection', 'problem', `The database did not answer: ${error instanceof Error ? error.message.slice(0, 160) : 'unknown error'}`)
    return checks
  }

  const tables = await prisma.$queryRaw<{ name: string; present: boolean }[]>`
    SELECT t.name, to_regclass('public.' || quote_ident(t.name)) IS NOT NULL AS present
    FROM unnest(${[...EXPECTED_TABLES]}::text[]) AS t(name)`.catch(() => [])
  const missing = tables.filter((table) => !table.present).map((table) => table.name)
  add('Database', 'Admin console tables', missing.length ? 'problem' : 'ok',
    missing.length ? `Missing: ${missing.join(', ')}. Run the latest migrations (prisma migrate deploy).` : 'All admin console tables exist.')

  const latest = await prisma.$queryRaw<{ migration_name: string; finished_at: Date | null }[]>`
    SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 1`.catch(() => null)
  if (latest?.[0]) {
    add('Database', 'Latest migration', latest[0].finished_at ? 'info' : 'problem',
      latest[0].finished_at ? latest[0].migration_name : `${latest[0].migration_name} started but did not finish`)
  } else {
    add('Database', 'Latest migration', 'warning', 'No migration history table found.')
  }

  // Payments
  const billing = await getBillingConfig()
  const paystackKeys = isPaystackConfigured()
  add('Payments', 'Paystack keys', paystackKeys ? 'ok' : 'warning', paystackKeys ? 'Set on the server.' : 'Not set, so online checkout cannot run.')
  add('Payments', 'Online checkout', billing.paystackEnabled && paystackKeys ? 'ok' : 'info',
    billing.paystackEnabled ? (paystackKeys ? 'On.' : 'Switched on in Plans & Pricing, but waiting for the keys.') : 'Switched off in Plans & Pricing.')
  add('Payments', 'Mobile Money payments', billing.manualPayment.enabled ? (billing.manualPayment.momoNumber ? 'ok' : 'warning') : 'info',
    billing.manualPayment.enabled ? (billing.manualPayment.momoNumber ? `On, to ${billing.manualPayment.momoNumber}.` : 'On, but no MoMo number is set in Plans & Pricing.') : 'Switched off.')
  if (!billing.paystackEnabled && !billing.manualPayment.enabled) {
    add('Payments', 'Can farms pay?', 'problem', 'Both Paystack and Mobile Money are off, so no farm can pay for a plan.')
  }
  add('Payments', 'Desktop license tokens', isSet(process.env.HATCHLOG_LICENSE_TOKEN_SECRET) ? 'ok' : 'problem',
    isSet(process.env.HATCHLOG_LICENSE_TOKEN_SECRET) ? 'Signing secret set.' : 'HATCHLOG_LICENSE_TOKEN_SECRET is missing, so desktop payments cannot be recorded.')

  // Security
  add('Security', 'Admin session secret', isSet(process.env.HATCHLOG_ADMIN_SESSION_SECRET) ? 'ok' : production ? 'problem' : 'warning',
    isSet(process.env.HATCHLOG_ADMIN_SESSION_SECRET) ? 'Set.' : 'HATCHLOG_ADMIN_SESSION_SECRET is missing (required in production).')
  add('Security', 'Farm sign-in secret', isSet(process.env.AUTH_SECRET) || isSet(process.env.NEXTAUTH_SECRET) ? 'ok' : 'problem',
    isSet(process.env.AUTH_SECRET) || isSet(process.env.NEXTAUTH_SECRET) ? 'Set.' : 'AUTH_SECRET is missing.')
  const upstash = isSet(process.env.UPSTASH_REDIS_REST_URL) && isSet(process.env.UPSTASH_REDIS_REST_TOKEN)
  add('Security', 'Rate limiting', upstash ? 'ok' : production ? 'problem' : 'info',
    upstash ? 'Upstash Redis set; limits apply across servers.' : production ? 'Upstash Redis is not set, so rate limits are bypassed in production.' : 'Upstash not set; limits use memory in development.')
  const superAdminsWithoutTwoStep = await prisma.adminUser.count({ where: { role: 'SUPER_ADMIN', isActive: true, totpEnabledAt: null } }).catch(() => 0)
  add('Security', 'Super admin two-step sign-in', superAdminsWithoutTwoStep ? 'warning' : 'ok',
    superAdminsWithoutTwoStep ? `${superAdminsWithoutTwoStep} super admin${superAdminsWithoutTwoStep === 1 ? ' has' : 's have'} not set it up yet (asked at next sign-in).` : 'Every super admin uses it.')

  // Background jobs and monitoring
  add('Jobs & monitoring', 'Daily reminders job', isSet(process.env.CRON_SECRET) ? 'info' : 'warning',
    isSet(process.env.CRON_SECRET)
      ? 'CRON_SECRET is set. Make sure a scheduler calls /api/cron/daily-reminders daily; this app does not record runs.'
      : 'CRON_SECRET is not set, so /api/cron/daily-reminders refuses every call.')
  add('Jobs & monitoring', 'Error tracking (Sentry)', isSet(process.env.SENTRY_DSN) || isSet(process.env.NEXT_PUBLIC_SENTRY_DSN) ? 'ok' : 'warning',
    isSet(process.env.SENTRY_DSN) || isSet(process.env.NEXT_PUBLIC_SENTRY_DSN) ? 'Set.' : 'No Sentry DSN, so server errors are only in the hosting logs.')
  add('Jobs & monitoring', 'Email / SMS', 'info', 'Not set up. Messages and reminders are shown inside the app only.')

  // App switches
  const system = await getAppSettings('system')
  add('App', 'Maintenance mode', system.maintenance.enabled ? 'warning' : 'ok', system.maintenance.enabled ? 'On: farms cannot save changes.' : 'Off.')
  add('App', 'Features switched off', system.disabledFeatures.length ? 'warning' : 'ok',
    system.disabledFeatures.length ? system.disabledFeatures.map((feature) => PLAN_FEATURE_DETAILS[feature].label).join(', ') : 'None.')

  return checks
}
