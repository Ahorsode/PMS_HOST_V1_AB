import React from 'react';
import Link from 'next/link';
import { getBillingConfig } from '@/lib/billing/billing-config';
import { getAppSettings } from '@/lib/settings/app-settings';
import { activeAnnouncement, type SiteSettings } from '@/lib/settings/schemas';
import { AnnouncementBanner } from '@/components/site/AnnouncementBanner';
import { PricingPlans, type PricingPlan } from '@/components/site/PricingPlans';
import {
  formatGhs,
  formatPlanPrice,
  PAID_TIERS,
  PLAN_FEATURE_DETAILS,
  PLAN_TYPES,
  staffLimitLabel,
  type BillingConfig,
} from '@/lib/billing/pricing';
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Bird,
  Check,
  ClipboardList,
  Egg,
  FileText,
  HeartPulse,
  Mail,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  Wheat,
} from 'lucide-react';
import { LandingNav } from '@/components/layout/LandingNav';
import { BRAND_NAME } from '@/lib/brand';
import { LegalLinks } from '@/components/legal/LegalPage';
import {
  BUSINESS_ADDRESS,
  BUSINESS_NAME,
} from '@/lib/legal/legal';
import { qlFontVariables } from '@/components/ui/ql/fonts';
import { qlButton } from '@/components/ui/ql/Button';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import { buildMobilePricing, moduleChips } from '@/components/site/landing/landing-plans';
import { MobilePricing } from '@/components/site/landing/MobilePricing';
import { MobileSamplePreview } from '@/components/site/landing/MobileSamplePreview';
import {
  MobileAuditNote,
  MobileFeatureRows,
  MobileModuleLinks,
  MobileSectionHead,
  MobileStepsRail,
} from '@/components/site/landing/MobileSections';
import { RoleSwitcher } from '@/components/site/landing/RoleSwitcher';
import { MobileFooter } from '@/components/site/landing/MobileFooter';
import { LandingStickyCta } from '@/components/site/landing/LandingStickyCta';

const features = [
  {
    icon: Bird,
    title: 'Flocks and houses',
    body: 'Register each batch by breed and hatch date, assign it to a house, and watch age, growth and population update on their own.',
  },
  {
    icon: Egg,
    title: 'Egg production and stock',
    body: 'Log daily collection per flock. Stock is tracked in crates and eggs, and sales draw down oldest stock first.',
  },
  {
    icon: Wheat,
    title: 'Feed and inventory',
    body: 'Record feeding, formulations and bag counts. Low-stock alerts land on the dashboard before the store runs empty.',
  },
  {
    icon: HeartPulse,
    title: 'Health, vaccines and quarantine',
    body: 'Keep a vaccination and medication schedule per flock, isolate sick birds, and log mortality with a reason.',
  },
  {
    icon: Banknote,
    title: 'Sales, customers and suppliers',
    body: 'Sell eggs, birds and manure, print invoices, and keep running statements for every customer and supplier.',
  },
  {
    icon: FileText,
    title: 'Finance and reports',
    body: 'Expenses, revenue and profit per flock, with batch comparison and downloadable reports for the accountant.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Set up your farm',
    body: 'Create an account with your phone number, name the farm, add your houses and register the first batch.',
  },
  {
    number: '02',
    title: 'Log the day in a minute',
    body: 'Workers record eggs, feed, deaths and treatments from their phones. Everything is stamped with who did it.',
    /** Phones show the audit note once, under the steps, so step 02 drops its last sentence there. */
    mobileBody: 'Workers record eggs, feed, deaths and treatments from their phones.',
  },
  {
    number: '03',
    title: 'Read the numbers',
    body: 'Owners open one dashboard: population, production, mortality rate, money in and out, and alerts that need attention.',
  },
];

const roles = [
  {
    icon: ShieldCheck,
    title: 'Owner and manager',
    body: 'Everything: flocks, money, reports, team permissions and the audit log.',
  },
  {
    icon: ClipboardList,
    title: 'Farm worker',
    body: 'Daily logging for eggs, feed, mortality and health, with only the sections they need.',
  },
  {
    icon: Banknote,
    title: 'Cashier',
    body: 'Record sales and manage customers without seeing farm finances.',
  },
  {
    icon: BarChart3,
    title: 'Accountant',
    body: 'Finance hub, statements and reports, without touching flock records.',
  },
];

/** Contact links from the admin Website settings. */
function buildContacts(contact: SiteSettings['contact']) {
  return [
    { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    ...(contact.whatsappEnabled
      ? [{ icon: MessageCircle, label: 'WhatsApp', value: `WhatsApp ${contact.phoneDisplay}`, href: `https://wa.me/${contact.phoneInternational}` }]
      : []),
    { icon: Phone, label: 'Call', value: `Call ${contact.phoneDisplay}`, href: `tel:+${contact.phoneInternational}` },
  ];
}

// Prices come from the admin Plans & Pricing page. Saving there revalidates this
// page; the hourly refresh also covers a build that could not reach the database.
export const revalidate = 3600;

/** In every paid plan; the admin-configurable features are listed after these. */
const coreFeatures = [
  'Egg, feed and mortality logging',
  'Houses and livestock batches',
  'Sales and orders',
  'Inventory and feed formulation',
  'Reports and analytics',
];

/** Plan cards from the admin-set names, prices, staff limits and features. */
function buildPlans(billing: BillingConfig, landing: SiteSettings['landing']): PricingPlan[] {
  // Yearly uses the admin-set 12-month term discount, when that term is offered.
  const offersYearly = billing.offeredTerms.includes(12);
  const yearlyFactor = 12 * (1 - (billing.termDiscounts['12'] ?? 0));
  const round = (n: number) => Math.round(n * 100) / 100;
  return PLAN_TYPES.flatMap((planType) =>
    PAID_TIERS.map((tier) => {
      const plan = billing.plans[planType][tier];
      return {
        name: plan.name,
        // Farms in Ghana pay in cedis; everyone else pays in US dollars.
        monthly: { ghs: formatGhs(plan.monthlyPrice), usd: formatPlanPrice(plan.monthlyPriceUsd, 'USD') },
        yearly: offersYearly
          ? {
              ghs: formatGhs(round(plan.monthlyPrice * yearlyFactor)),
              usd: formatPlanPrice(round(plan.monthlyPriceUsd * yearlyFactor), 'USD'),
              ghsPerMonth: formatGhs(round((plan.monthlyPrice * yearlyFactor) / 12)),
            }
          : null,
        description: landing.planDescriptions[planType][tier],
        highlight: landing.highlightedPlan?.planType === planType && landing.highlightedPlan.tier === tier,
        features: [
          staffLimitLabel(planType, plan.staffLimit),
          ...coreFeatures,
          ...plan.features.map((feature) => PLAN_FEATURE_DETAILS[feature].label),
        ],
      };
    }),
  );
}

const eggBars = [62, 70, 66, 78, 74, 84, 90];
const mortalityBars = [30, 22, 26, 18, 14, 12, 10];

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="absolute -inset-3 rounded-[2rem] bg-emerald-500/20 blur-3xl sm:-inset-6" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a1510]/90 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Farm overview</span>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Sample data
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Total population</p>
            <p className="mt-1 text-3xl font-bold text-white">12,480</p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">4 flocks · 3 houses</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Eggs today</p>
            <p className="mt-1 text-3xl font-bold text-white">
              318 <span className="text-base text-white/50">crates</span>
            </p>
            <div className="mt-3 flex h-10 items-end gap-1">
              {eggBars.map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-sm bg-blue-400/80"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Mortality rate</p>
              <TrendingDown className="h-4 w-4 text-red-300" />
            </div>
            <p className="mt-1 text-3xl font-bold text-white">0.8%</p>
            <div className="mt-3 flex h-8 items-end gap-1">
              {mortalityBars.map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-sm bg-red-400/70"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Alerts</p>
            <ul className="mt-2 space-y-2 text-xs">
              <li className="flex items-center gap-2 rounded-lg bg-black/30 px-2.5 py-2 text-white/85">
                <HeartPulse className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                Gumboro booster due · House 2
              </li>
              <li className="flex items-center gap-2 rounded-lg bg-black/30 px-2.5 py-2 text-white/85">
                <Wheat className="h-3.5 w-3.5 shrink-0 text-red-300" />
                Layer mash low · 6 bags left
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white/60">This month</span>
            <span className="font-bold text-emerald-300">+ GHS 18,420 profit</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const [billing, site] = await Promise.all([getBillingConfig(), getAppSettings('site')]);
  const { landing } = site;
  const plans = buildPlans(billing, landing);
  const contacts = buildContacts(site.contact);
  const announcement = activeAnnouncement(site, 'landing');
  // Only the longer terms that are offered and actually discounted, e.g. "3, 6 or 12".
  const discountedTerms = billing.offeredTerms.filter((months) => months > 1 && billing.termDiscounts[`${months}`] > 0);
  const maxDiscountPercent = Math.round(Math.max(0, ...discountedTerms.map((months) => billing.termDiscounts[`${months}`])) * 100);
  const termList = discountedTerms.length > 1
    ? `${discountedTerms.slice(0, -1).join(', ')} or ${discountedTerms[discountedTerms.length - 1]}`
    : String(discountedTerms[0] ?? '');

  const year = new Date().getFullYear();
  const copyright = `© ${year} ${BUSINESS_NAME}${BUSINESS_ADDRESS ? `, ${BUSINESS_ADDRESS}` : ''}. All rights reserved.`;
  const chips = moduleChips(billing);
  const mobilePricing = buildMobilePricing(billing, landing.planDescriptions, landing.highlightedPlan);

  return (
    <div className={`relative min-h-screen overflow-x-hidden bg-ql-ground text-white md:bg-[#050d0a] ${qlFontVariables}`}>
      {/* Glows and dot grid stay on tablet and desktop; phones use the flat Quiet Ledger ground. */}
      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="absolute right-[-10%] top-[40%] h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
      </div>

      <LandingNav contact={site.contact} />
      {announcement ? (
        <div className="relative mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <AnnouncementBanner announcement={announcement} />
        </div>
      ) : null}

      <main className="relative pb-24 md:pb-0">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-8 sm:px-6 md:gap-12 md:pb-16 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            {landing.heroBadge?.trim() && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-ql-mint/12 px-3 py-1.5 font-ql-sans text-xs font-semibold text-ql-mint md:border md:border-emerald-400/30 md:bg-emerald-400/10 md:font-sans md:text-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute hidden h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping md:inline-flex" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {landing.heroBadge}
              </div>
            )}

            <h1 className="font-ql-display text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-ql-text md:font-sans md:text-5xl md:font-extrabold md:leading-[1.08] md:tracking-tight md:text-white lg:text-6xl">
              {landing.heroTitle}
              <span className="block text-ql-mint md:bg-gradient-to-r md:from-emerald-300 md:via-emerald-400 md:to-teal-300 md:bg-clip-text md:text-transparent">
                {landing.heroTitleAccent}
              </span>
            </h1>

            <p className="mt-4 max-w-xl font-ql-sans text-[15px] leading-relaxed text-ql-muted md:mt-5 md:font-sans md:text-lg md:text-white/70">
              {landing.heroSubtitle}
            </p>

            {/* Phones: one mint button, the trial note where the decision is made, three facts as rows. */}
            <div className="mt-6 md:hidden">
              <Link href="/signup" {...QL_PRIMARY_ATTR} className={qlButton('filled', 'min-h-12 w-full text-[15px]')}>
                Create your farm account
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <p className="mt-2 flex items-center gap-2.5 rounded-2xl border border-ql-line bg-ql-surface px-3 py-2.5 font-ql-sans text-[13px] text-ql-muted">
                <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-ql-mint/12 text-ql-mint">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
                All features free for {billing.trial.days} days
              </p>
              <dl className="mt-4 divide-y divide-ql-line rounded-2xl border border-ql-line bg-ql-surface px-4 font-ql-sans">
                {[
                  ['Sign in with', 'Phone or Google'],
                  ['Works on', 'Phone and desktop'],
                  ['Priced in', 'GHS in Ghana, USD elsewhere'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-3">
                    <dt className="font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">{label}</dt>
                    <dd className="text-right text-[13px] font-semibold text-ql-text">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-8 hidden flex-col gap-3 sm:flex-row md:flex">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-7 py-3.5 text-base font-bold text-[#04150e] shadow-[0_0_40px_rgba(52,211,153,0.35)] transition-all hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                Create your farm account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10"
              >
                Log in
              </Link>
            </div>

            <dl className="mt-10 hidden grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm md:grid">
              <div>
                <dt className="text-white/50">Sign in with</dt>
                <dd className="mt-1 font-bold text-white">Phone or Google</dd>
              </div>
              <div>
                <dt className="text-white/50">Works on</dt>
                <dd className="mt-1 font-bold text-white">Phone and desktop</dd>
              </div>
              <div>
                <dt className="text-white/50">Priced in</dt>
                <dd className="mt-1 font-bold text-white">Cedis in Ghana, US dollars elsewhere</dd>
              </div>
            </dl>
          </div>

          <div className="md:hidden">
            <MobileSamplePreview />
          </div>
          <div className="hidden md:block">
            <DashboardPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 border-t border-ql-line py-12 md:scroll-mt-20 md:border-white/5 md:bg-white/[0.02] md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="md:hidden">
              <MobileSectionHead label="What it covers" title="Every record a farm keeps on paper, in one place.">
                Each module feeds the others.
              </MobileSectionHead>
              <MobileModuleLinks />
              <MobileFeatureRows features={features} chips={chips} />
              <a href="#pricing" className={qlButton('ghost', 'mt-3 w-full border-ql-line text-ql-text hover:bg-ql-text/[0.04]')}>
                Compare plans
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-ql-mint" />
              </a>
            </div>
            <div className="hidden max-w-2xl md:block">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">What it covers</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Every record a farm keeps on paper, in one place.
              </h2>
              <p className="mt-4 text-base text-white/65 sm:text-lg">
                Each module feeds the others: a sale reduces egg stock, a feeding reduces bags in store, a death updates
                the flock count and mortality rate.
              </p>
            </div>

            <div className="mt-12 hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-white/10 bg-[#0a1510]/70 p-6 transition-colors hover:border-emerald-400/30 hover:bg-emerald-500/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 transition-colors group-hover:bg-emerald-400/20">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 border-t border-ql-line py-12 md:scroll-mt-20 md:border-t-0 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="md:hidden">
              <MobileSectionHead label="How it works" title={<>{["Set up once.", "Log daily.", "Decide weekly."].map((line) => <span key={line} className="block">{line}</span>)}</>}>
                Workers only see the forms they use, so logging takes a minute at the end of a shift. The owner sees
                the result without chasing anyone for a notebook.
              </MobileSectionHead>
              <MobileStepsRail steps={steps.map((step) => ({ ...step, body: step.mobileBody ?? step.body }))} />
              <MobileAuditNote>Every entry is stamped with the worker who made it, and owners can review the full audit log.</MobileAuditNote>
            </div>
            <div className="hidden gap-12 md:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">How it works</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Set up once. Log daily. Decide weekly.</h2>
                <p className="mt-4 text-base text-white/65 sm:text-lg">
                  Workers only see the forms they use, so logging takes a minute at the end of a shift. The owner sees
                  the result without chasing anyone for a notebook.
                </p>
                <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-white/75">
                    Every entry is stamped with the worker who made it, and owners can review the full audit log.
                  </p>
                </div>
              </div>

              <ol className="space-y-4">
                {steps.map((step) => (
                  <li
                    key={step.number}
                    className="flex gap-5 rounded-2xl border border-white/10 bg-[#0a1510]/70 p-6"
                  >
                    <span className="text-2xl font-black text-emerald-400/60">{step.number}</span>
                    <div>
                      <h3 className="text-lg font-bold">{step.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/65">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-16 border-t border-ql-line py-12 md:scroll-mt-20 md:border-y md:border-white/5 md:bg-white/[0.02] md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="md:hidden">
              <MobileSectionHead label="Teams" title="Each person sees their part of the farm.">
                Invite staff by phone number or email. Permissions are set per section, so a worker can log eggs
                without ever opening the finance hub.
              </MobileSectionHead>
              <RoleSwitcher />
            </div>
            <div className="hidden max-w-2xl md:block">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Teams</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Each person sees their part of the farm.</h2>
              <p className="mt-4 text-base text-white/65 sm:text-lg">
                Invite staff by phone number or email. Permissions are set per section, so a worker can log eggs
                without ever opening the finance hub.
              </p>
            </div>

            <div className="mt-12 hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
              {roles.map((role) => (
                <div key={role.title} className="rounded-2xl border border-white/10 bg-[#0a1510]/70 p-6">
                  <role.icon className="h-6 w-6 text-emerald-300" />
                  <h3 className="mt-4 text-base font-bold">{role.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{role.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 border-t border-ql-line py-12 md:scroll-mt-20 md:border-t-0 md:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <div className="md:hidden">
              <MobileSectionHead label="Pricing" title={`Try everything free for ${billing.trial.days} days.`}>
                {landing.pricingIntro.replaceAll('{trialDays}', String(billing.trial.days))}
              </MobileSectionHead>
              <MobilePricing data={mobilePricing} />
            </div>
            <div className="mx-auto hidden max-w-2xl text-center md:block">
              <p className="text-lg font-extrabold uppercase tracking-[0.2em] text-emerald-300 sm:text-xl">Pricing</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Try everything free for 30 days.</h2>
              <p className="mt-4 text-base text-white/65 sm:text-lg">
                {landing.pricingIntro.replaceAll('{trialDays}', String(billing.trial.days))}{maxDiscountPercent > 0 ? ` Pay for ${termList} months to save up to ${maxDiscountPercent}%.` : ''}
              </p>
            </div>

            <div className="hidden md:block">
              <PricingPlans
                plans={plans}
                yearlySavePercent={Math.round((billing.termDiscounts['12'] ?? 0) * 100)}
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        {landing.testimonials.length > 0 ? (
          <section id="testimonials" className="scroll-mt-16 border-t border-ql-line py-12 font-ql-sans md:scroll-mt-20 md:border-white/5 md:py-20 md:font-sans">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="font-ql-display text-[26px] font-semibold text-ql-text md:text-center md:font-sans md:text-4xl md:font-bold md:tracking-tight md:text-white">What farmers say</h2>
              <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {landing.testimonials.map((item, index) => (
                  <figure key={index} className="flex flex-col rounded-2xl border border-ql-line bg-ql-surface p-4 md:rounded-3xl md:border-white/10 md:bg-[#0a1510]/70 md:p-6">
                    <blockquote className="flex-1 text-[15px] leading-relaxed text-ql-text md:text-base md:text-white/80">&ldquo;{item.quote}&rdquo;</blockquote>
                    <figcaption className="mt-5 text-sm">
                      <span className="font-semibold text-ql-text md:font-bold md:text-white">{item.name}</span>
                      {item.detail ? <span className="text-ql-muted md:text-white/55"> · {item.detail}</span> : null}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {landing.faq.length > 0 ? (
          <section id="faq" className="scroll-mt-16 border-t border-ql-line py-12 font-ql-sans md:scroll-mt-20 md:border-white/5 md:py-20 md:font-sans">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <h2 className="font-ql-display text-[26px] font-semibold text-ql-text md:text-center md:font-sans md:text-4xl md:font-bold md:tracking-tight md:text-white">Questions</h2>
              <div className="mt-10 space-y-3">
                {landing.faq.map((item, index) => (
                  <details key={index} className="rounded-2xl border border-ql-line bg-ql-surface px-4 py-3 md:border-white/10 md:bg-[#0a1510]/70 md:px-5 md:py-4">
                    <summary className="cursor-pointer py-1.5 font-semibold text-ql-text md:py-0 md:text-white">{item.question}</summary>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ql-muted md:text-white/70">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="px-4 pb-8 pt-4 sm:px-6 md:pb-20 md:pt-0">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[24px] rounded-tl-[8px] border border-ql-mint/25 bg-ql-surface px-5 py-8 font-ql-sans md:rounded-3xl md:border-emerald-400/30 md:bg-transparent md:bg-gradient-to-br md:from-emerald-500/20 md:via-[#0a1510] md:to-[#0a1510] md:px-12 md:py-14 md:text-center md:font-sans">
            <div className="pointer-events-none absolute -right-20 -top-20 hidden h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl md:block" aria-hidden />
            <Package className="h-7 w-7 text-ql-mint md:mx-auto md:h-10 md:w-10 md:text-emerald-300" strokeWidth={1.75} />
            <h2 className="mt-4 font-ql-display text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-ql-text md:mt-5 md:font-sans md:text-4xl md:font-bold md:tracking-tight md:text-white">{landing.ctaTitle}</h2>
            {landing.ctaSubtitle ? (
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ql-muted md:mx-auto md:mt-4 md:text-lg md:text-white/70">{landing.ctaSubtitle}</p>
            ) : null}
            {/* Phones: one door and one link. */}
            <div className="mt-6 md:hidden">
              <Link href="/signup" {...QL_PRIMARY_ATTR} className={qlButton('filled', 'min-h-12 w-full text-[15px]')}>
                Create your farm account
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-[13px] text-ql-muted">
                Already have an account?{' '}
                <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-ql-mint">Log in</Link>
              </p>
            </div>
            <div className="mt-8 hidden flex-col justify-center gap-3 sm:flex-row md:flex">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-7 py-3.5 text-base font-bold text-[#04150e] transition-colors hover:bg-emerald-300"
              >
                Create your farm account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="relative border-t border-ql-line md:border-white/10 md:py-10">
        <MobileFooter contact={site.contact} copyright={copyright} />
        <div className="hidden md:block">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold">{BRAND_NAME}</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#contact" className="hover:text-white">Contact</a>
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link href="/signup" className="hover:text-white">Sign up</Link>
          </nav>
        </div>
        <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-6 border-t border-white/10 px-4 pt-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/80">Contact us</h2>
            <ul className="mt-3 flex flex-col gap-3 text-sm text-white/60 sm:flex-row sm:flex-wrap sm:gap-x-8">
              {contacts.map(({ icon: Icon, label, value, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-emerald-400" />
                    <span className="sr-only">{label}: </span>
                    {value}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2 text-sm text-white/60 md:text-right">
            <LegalLinks className="md:justify-end" />
            <p>{copyright}</p>
          </div>
        </div>
        </div>
      </footer>
      <LandingStickyCta />
    </div>
  );
}
