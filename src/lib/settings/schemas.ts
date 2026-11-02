// Admin-editable settings sections (other than billing, see billing/pricing.ts):
// their shape, validation and built-in defaults. Client-safe so the admin
// editors can validate before saving.
import { z } from 'zod'
import { BRAND_NAME } from '@/lib/brand'
import { PAID_TIERS, PLAN_FEATURE_KEYS, PLAN_TYPES } from '@/lib/billing/pricing'
import { RATE_LIMIT_POLICY_NAMES } from '@/lib/performance/rate-limit-policies'
import {
  getDefaultPermissionsForRole,
  STAFF_ROLES,
  type StaffPermissionKey,
} from '@/lib/staff-permission-defaults'

const text = (max: number, label = 'This field') =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`)
const requiredText = (max: number, label = 'This field') => text(max, label).min(1, `${label} is required`)
const isoDateOrNull = z
  .string()
  .nullable()
  .refine((value) => value === null || !Number.isNaN(Date.parse(value)), 'Enter a valid date')

// ---------------------------------------------------------------- site

const planDescriptions = z.object({
  STANDARD: requiredText(200, 'Plan description'),
  PREMIUM: requiredText(200, 'Plan description'),
})

export const siteSettingsSchema = z.object({
  contact: z.object({
    email: z.string().trim().email('Enter a valid email').max(120),
    /** Shown on the site, e.g. "0554101675". */
    phoneDisplay: requiredText(30, 'Phone number'),
    /** Digits with country code, e.g. "233554101675"; used for call and WhatsApp links. */
    phoneInternational: z.string().trim().regex(/^\d{8,15}$/, 'Use digits only, with the country code (e.g. 233554101675)'),
    whatsappEnabled: z.boolean(),
  }),
  landing: z.object({
    heroBadge: text(80, 'Badge'),
    heroTitle: requiredText(80, 'Headline'),
    heroTitleAccent: text(80, 'Headline accent'),
    heroSubtitle: requiredText(400, 'Intro'),
    /** {trialDays} is replaced with the free trial length. */
    pricingIntro: text(400, 'Pricing intro'),
    ctaTitle: requiredText(120, 'Closing headline'),
    ctaSubtitle: text(300, 'Closing text'),
    planDescriptions: z.object({ SOLO: planDescriptions, TEAM: planDescriptions }),
    highlightedPlan: z.object({ planType: z.enum(PLAN_TYPES), tier: z.enum(PAID_TIERS) }).nullable(),
    testimonials: z
      .array(z.object({ quote: requiredText(400, 'Quote'), name: requiredText(80, 'Name'), detail: text(80, 'Farm or role') }))
      .max(6, 'Add at most 6 testimonials'),
    faq: z
      .array(z.object({ question: requiredText(200, 'Question'), answer: requiredText(800, 'Answer') }))
      .max(12, 'Add at most 12 questions'),
  }),
  announcement: z.object({
    enabled: z.boolean(),
    message: text(300, 'Announcement'),
    tone: z.enum(['info', 'warning', 'success']),
    startsAt: isoDateOrNull,
    endsAt: isoDateOrNull,
    showOnDashboard: z.boolean(),
    showOnLanding: z.boolean(),
  }),
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  contact: {
    email: 'info@poultryledger.com',
    phoneDisplay: '0554101675',
    phoneInternational: '233554101675',
    whatsappEnabled: true,
  },
  landing: {
    heroBadge: 'Built for layer and broiler farms',
    heroTitle: 'Run your poultry farm',
    heroTitleAccent: 'from one screen.',
    heroSubtitle: `${BRAND_NAME} records eggs, feed, mortality, health and sales for every flock, then turns it into the numbers an owner needs: stock on hand, cost per bird, and profit this month.`,
    pricingIntro:
      'Every new farm gets all features free for {trialDays} days. Then pick a Solo plan if you run the farm alone, or a Business plan if your staff log work too.',
    ctaTitle: 'Know what the farm is doing today.',
    ctaSubtitle: 'Create the farm, register a flock and log the first collection. It takes less time than counting the crates.',
    planDescriptions: {
      SOLO: {
        STANDARD: 'For an owner running the farm alone who needs the daily records.',
        PREMIUM: 'More features for an owner running the farm alone.',
      },
      TEAM: {
        STANDARD: 'For farms with a small team logging the daily work.',
        PREMIUM: 'More features for growing farms with a full team.',
      },
    },
    highlightedPlan: { planType: 'TEAM', tier: 'PREMIUM' },
    testimonials: [],
    faq: [],
  },
  announcement: {
    enabled: false,
    message: '',
    tone: 'info',
    startsAt: null,
    endsAt: null,
    showOnDashboard: true,
    showOnLanding: false,
  },
}

/** The announcement to show now, or null when it is off, empty or outside its dates. */
export function activeAnnouncement(site: SiteSettings, where: 'dashboard' | 'landing', now = new Date()) {
  const { announcement } = site
  if (!announcement.enabled || !announcement.message) return null
  if (where === 'dashboard' ? !announcement.showOnDashboard : !announcement.showOnLanding) return null
  if (announcement.startsAt && new Date(announcement.startsAt) > now) return null
  if (announcement.endsAt && new Date(announcement.endsAt) <= now) return null
  return announcement
}

// ---------------------------------------------------------------- system

const rateLimitOverride = z.object({
  limit: z.number().int('Use a whole number').min(1).max(10_000),
  windowMinutes: z.number().int('Use a whole number').min(1).max(1440),
})

export const systemSettingsSchema = z.object({
  /** How long an admin stays signed in. */
  adminSessionHours: z.number().int('Use a whole number').min(1, 'At least 1 hour').max(168, 'At most 7 days'),
  /** Overrides for built-in rate limits; missing policies use the built-in limit. */
  rateLimits: z.partialRecord(z.enum(RATE_LIMIT_POLICY_NAMES), rateLimitOverride),
  /** Plan features switched off for every farm, whatever its plan. */
  disabledFeatures: z.array(z.enum(PLAN_FEATURE_KEYS)),
  maintenance: z.object({
    enabled: z.boolean(),
    message: requiredText(300, 'Maintenance message'),
  }),
})
export type SystemSettings = z.infer<typeof systemSettingsSchema>

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  adminSessionHours: 12,
  rateLimits: {},
  disabledFeatures: [],
  maintenance: {
    enabled: false,
    message: 'We are doing scheduled maintenance. You can view your records, but changes are paused for a short while.',
  },
}

// ---------------------------------------------------------------- farm defaults

export const STAFF_PERMISSION_KEYS = Object.keys(getDefaultPermissionsForRole('NONE')) as StaffPermissionKey[]

const permissionSet = z.object(
  Object.fromEntries(STAFF_PERMISSION_KEYS.map((key) => [key, z.boolean()])) as Record<StaffPermissionKey, z.ZodBoolean>,
)

export const farmDefaultsSchema = z.object({
  /** Egg categories created for every new farm (besides "Unsorted", which is always available). */
  eggCategories: z
    .array(z.object({ name: requiredText(40, 'Category name'), description: text(160, 'Description') }))
    .max(12, 'Add at most 12 categories')
    .refine((items) => new Set(items.map((item) => item.name.toLowerCase())).size === items.length, 'Category names must be unique'),
  /** Sales settings a new farm starts with. */
  salesSettings: z.object({
    allowBatchOverride: z.boolean(),
    allowWorkerDiscounts: z.boolean(),
    defaultDiscountType: z.enum(['item', 'flat', 'percent']),
  }),
  /** Starting permissions when a staff member is invited with a role. */
  rolePermissions: z.object(
    Object.fromEntries(STAFF_ROLES.map((role) => [role, permissionSet])) as Record<(typeof STAFF_ROLES)[number], typeof permissionSet>,
  ),
})
export type FarmDefaults = z.infer<typeof farmDefaultsSchema>

export const DEFAULT_FARM_DEFAULTS: FarmDefaults = {
  eggCategories: [],
  salesSettings: { allowBatchOverride: false, allowWorkerDiscounts: false, defaultDiscountType: 'item' },
  rolePermissions: Object.fromEntries(
    STAFF_ROLES.map((role) => [role, getDefaultPermissionsForRole(role)]),
  ) as FarmDefaults['rolePermissions'],
}

// ---------------------------------------------------------------- messages

export const MESSAGE_KINDS = ['welcome', 'trialEnding', 'paymentReceived', 'planExpired'] as const
export type MessageKind = (typeof MESSAGE_KINDS)[number]

export const MESSAGE_PLACEHOLDERS = ['{farmName}', '{planName}', '{endDate}', '{daysLeft}'] as const

export const MESSAGE_KIND_DETAILS: Record<MessageKind, { label: string; when: string }> = {
  welcome: { label: 'Welcome', when: 'For the first days after a farm is created.' },
  trialEnding: { label: 'Trial ending', when: 'In the last days of the free trial.' },
  paymentReceived: { label: 'Payment received', when: 'For a few days after a plan is paid for.' },
  planExpired: { label: 'Plan ended', when: 'When the trial or plan has ended (grace period or locked).' },
}

const template = z.object({
  enabled: z.boolean(),
  title: requiredText(80, 'Title'),
  body: requiredText(500, 'Message'),
})

export const messageSettingsSchema = z.object({
  templates: z.object({
    welcome: template,
    trialEnding: template,
    paymentReceived: template,
    planExpired: template,
  }),
  schedule: z.object({
    welcomeDays: z.number().int().min(1, 'At least 1 day').max(30, 'At most 30 days'),
    trialEndingDaysBefore: z.number().int().min(1, 'At least 1 day').max(30, 'At most 30 days'),
    paymentReceivedDays: z.number().int().min(1, 'At least 1 day').max(14, 'At most 14 days'),
  }),
})
export type MessageSettings = z.infer<typeof messageSettingsSchema>

export const DEFAULT_MESSAGE_SETTINGS: MessageSettings = {
  templates: {
    welcome: {
      enabled: true,
      title: 'Welcome to {farmName}',
      body: 'Your farm is set up and every feature is free until {endDate}. Start by adding a house and your first batch.',
    },
    trialEnding: {
      enabled: true,
      title: 'Your free trial ends in {daysLeft} days',
      body: 'Choose a plan before {endDate} to keep using every feature on {farmName}.',
    },
    paymentReceived: {
      enabled: true,
      title: 'Payment received',
      body: 'Thank you. {farmName} is on {planName} until {endDate}.',
    },
    planExpired: {
      enabled: true,
      title: 'Your plan has ended',
      body: 'Choose a plan to keep {farmName} unlocked. Your records are safe.',
    },
  },
  schedule: { welcomeDays: 3, trialEndingDaysBefore: 7, paymentReceivedDays: 3 },
}

/** Replaces {farmName}, {planName}, {endDate} and {daysLeft}; unknown placeholders are left as typed. */
export function fillTemplate(value: string, vars: Partial<Record<'farmName' | 'planName' | 'endDate' | 'daysLeft', string>>) {
  return value.replace(/\{(farmName|planName|endDate|daysLeft)\}/g, (match, key: keyof typeof vars) => vars[key] ?? match)
}

// ---------------------------------------------------------------- registry

export const APP_SETTINGS_SECTIONS = {
  site: { schema: siteSettingsSchema, defaults: DEFAULT_SITE_SETTINGS, label: 'Website & announcements' },
  system: { schema: systemSettingsSchema, defaults: DEFAULT_SYSTEM_SETTINGS, label: 'System' },
  'farm-defaults': { schema: farmDefaultsSchema, defaults: DEFAULT_FARM_DEFAULTS, label: 'Farm defaults' },
  messages: { schema: messageSettingsSchema, defaults: DEFAULT_MESSAGE_SETTINGS, label: 'Messages & reminders' },
} as const

export type AppSettingsSection = keyof typeof APP_SETTINGS_SECTIONS
export type AppSettingsValue<S extends AppSettingsSection> = z.infer<(typeof APP_SETTINGS_SECTIONS)[S]['schema']>

export function isAppSettingsSection(value: unknown): value is AppSettingsSection {
  return typeof value === 'string' && value in APP_SETTINGS_SECTIONS
}

/**
 * Validates a stored or submitted section. Saved values are merged over the
 * defaults first, so a row saved before a field existed still loads.
 */
export function parseAppSettings<S extends AppSettingsSection>(section: S, value: unknown): AppSettingsValue<S> | null {
  const { schema, defaults } = APP_SETTINGS_SECTIONS[section]
  const merged = value && typeof value === 'object' && !Array.isArray(value) ? { ...defaults, ...value } : value
  const parsed = schema.safeParse(merged)
  return parsed.success ? (parsed.data as AppSettingsValue<S>) : null
}
