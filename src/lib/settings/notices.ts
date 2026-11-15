import type { FarmAccess } from '@/lib/billing/access'
import { isPaidTier, type BillingConfig } from '@/lib/billing/pricing'
import { fillTemplate, type MessageKind, type MessageSettings } from '@/lib/settings/schemas'

const DAY_MS = 24 * 60 * 60 * 1000

export type MessageNotice = {
  kind: MessageKind
  title: string
  body: string
  /** Changes whenever the situation does, so a dismissed notice can come back for a new period. */
  dismissKey: string
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

/**
 * The one message an owner should see on the dashboard now, by priority:
 * plan ended, trial ending, payment received, welcome. Null when none applies
 * or the matching template is switched off.
 */
export function pickMessageNotice(input: {
  messages: MessageSettings
  billing: BillingConfig
  access: FarmAccess
  farm: { name: string; createdAt: Date }
  /** When the latest payment (Paystack or admin grant) was recorded. */
  lastPaymentAt: Date | null
  now?: Date
}): MessageNotice | null {
  const { messages, billing, access, farm, lastPaymentAt } = input
  const now = input.now ?? new Date()
  const { templates, schedule } = messages

  const planName = isPaidTier(access.tier) && !access.isTrial ? billing.plans[access.planType][access.tier].name : 'your free trial'
  const endsAt = access.endsAt
  const vars = {
    farmName: farm.name,
    planName,
    endDate: endsAt ? formatDate(endsAt) : 'no end date',
    daysLeft: endsAt ? String(Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS))) : '',
  }
  const build = (kind: MessageKind, key: string): MessageNotice | null =>
    templates[kind].enabled
      ? { kind, title: fillTemplate(templates[kind].title, vars), body: fillTemplate(templates[kind].body, vars), dismissKey: `${kind}:${key}` }
      : null

  if (access.state === 'GRACE' || access.state === 'LOCKED') {
    return build('planExpired', endsAt?.toISOString() ?? 'none')
  }

  if (access.state === 'TRIAL' && endsAt && endsAt.getTime() - now.getTime() <= schedule.trialEndingDaysBefore * DAY_MS) {
    return build('trialEnding', endsAt.toISOString())
  }

  if (access.state === 'PAID' && lastPaymentAt && now.getTime() - lastPaymentAt.getTime() <= schedule.paymentReceivedDays * DAY_MS) {
    return build('paymentReceived', lastPaymentAt.toISOString())
  }

  if (access.isTrial && now.getTime() - farm.createdAt.getTime() <= schedule.welcomeDays * DAY_MS) {
    return build('welcome', farm.createdAt.toISOString())
  }

  return null
}
