import {
  PAID_TIERS,
  PLAN_FEATURE_DETAILS,
  PLAN_TYPES,
  plansWithFeature,
  staffLimitLabel,
  type BillingConfig,
  type PaidTier,
  type PlanFeature,
  type TermMonths,
} from '@/lib/billing/pricing';
import type { PlanType } from '@prisma/client';

/** In every paid plan; mirrors the landing page's own list. */
export const CORE_PLAN_FEATURES = [
  'Egg, feed and mortality logging',
  'Houses and livestock batches',
  'Sales and orders',
  'Inventory and feed formulation',
  'Reports and analytics',
];

export type ModuleChip = { label: string; everyPlan: boolean };

/**
 * Which plans include a module, worked out from the admin plan lists:
 * "All plans", "Plus plans only" (when exactly the upper tier of each plan
 * type has it and both are named "… Plus"), or the plan names.
 */
export function planScope(billing: BillingConfig, features: PlanFeature[]): { text: string; everyPlan: boolean } {
  const total = PLAN_TYPES.length * PAID_TIERS.length;
  const sets = features.map((feature) => plansWithFeature(billing, feature));
  const names = sets.reduce((shared, set) => shared.filter((name) => set.includes(name)));
  if (names.length === total) return { text: 'All plans', everyPlan: true };
  if (names.length === 0) return { text: 'Not on any plan', everyPlan: false };
  const premium = PLAN_TYPES.map((planType) => billing.plans[planType].PREMIUM.name);
  const isPremiumOnly = names.length === premium.length && premium.every((name) => names.includes(name));
  if (isPremiumOnly && premium.every((name) => /\bplus$/i.test(name.trim()))) return { text: 'Plus plans only', everyPlan: false };
  return { text: `${names.join(', ')} only`, everyPlan: false };
}

/** The plan chips each feature row carries on phones, keyed by the row's title. */
export function moduleChips(billing: BillingConfig): Record<string, ModuleChip[]> {
  const scoped = (prefix: string | null, features: PlanFeature[]): ModuleChip => {
    const scope = planScope(billing, features);
    const short = scope.everyPlan ? 'all plans' : scope.text.replace(/ only$/, '').replace(/^Plus plans$/, 'Plus');
    const text = prefix ? `${prefix}: ${short}` : scope.text;
    return { label: text, everyPlan: scope.everyPlan };
  };
  const all: ModuleChip = { label: 'All plans', everyPlan: true };
  const crmAndSuppliersAlike =
    planScope(billing, ['CRM']).text === planScope(billing, ['SUPPLIERS']).text;

  return {
    'Flocks and houses': [all],
    'Egg production and stock': [all],
    'Feed and inventory': [all],
    'Health, vaccines and quarantine': [scoped(null, ['HEALTH'])],
    'Sales, customers and suppliers': [
      { label: 'Sales: all plans', everyPlan: true },
      ...(crmAndSuppliersAlike
        ? [scoped('Customers, suppliers', ['CRM', 'SUPPLIERS'])]
        : [scoped('Customers', ['CRM']), scoped('Suppliers', ['SUPPLIERS'])]),
    ],
    'Finance and reports': [{ label: 'Reports: all plans', everyPlan: true }, scoped('Finance hub', ['FINANCE'])],
  };
}

export type MobilePlan = {
  planType: PlanType;
  tier: PaidTier;
  name: string;
  description: string;
  highlight: boolean;
  monthlyGhs: number;
  monthlyUsd: number;
  /** Staff label plus every included feature, in the desktop card's order. */
  features: string[];
};

export type MobilePricingData = {
  plans: MobilePlan[];
  /** Offered terms, 1 = monthly. */
  terms: TermMonths[];
  discounts: Record<string, number>;
  trialDays: number;
};

export function buildMobilePricing(
  billing: BillingConfig,
  descriptions: Record<PlanType, Record<PaidTier, string>>,
  highlighted: { planType: PlanType; tier: PaidTier } | null,
): MobilePricingData {
  const plans = PLAN_TYPES.flatMap((planType) =>
    PAID_TIERS.map((tier) => {
      const plan = billing.plans[planType][tier];
      return {
        planType,
        tier,
        name: plan.name,
        description: descriptions[planType][tier],
        highlight: highlighted?.planType === planType && highlighted.tier === tier,
        monthlyGhs: plan.monthlyPrice,
        monthlyUsd: plan.monthlyPriceUsd,
        features: [
          staffLimitLabel(planType, plan.staffLimit),
          ...CORE_PLAN_FEATURES,
          ...plan.features.map((feature) => PLAN_FEATURE_DETAILS[feature].label),
        ],
      };
    }),
  );
  const terms = ([...billing.offeredTerms].sort((a, b) => a - b) as TermMonths[]).filter((t, i, all) => all.indexOf(t) === i);
  return {
    plans,
    terms: terms.includes(1) ? terms : ([1, ...terms] as TermMonths[]),
    discounts: { ...billing.termDiscounts },
    trialDays: billing.trial.days,
  };
}

/** Price for a term: per month after the term discount, billed once, and what the discount saves. */
export function termPrice(monthly: number, months: number, discount: number) {
  const safeDiscount = Number.isFinite(discount) ? Math.min(Math.max(discount, 0), 0.9) : 0;
  const round = (n: number) => Math.round(n * 100) / 100;
  const perMonth = round(monthly * (1 - safeDiscount));
  const billed = round(perMonth * months);
  const saved = round(monthly * months - billed);
  return { perMonth, billed, saved, discount: safeDiscount };
}

/** Features the upper tier adds over the lower tier of the same plan type. */
export function addedFeatures(lower: MobilePlan, upper: MobilePlan) {
  return upper.features.filter((feature) => !lower.features.includes(feature));
}
