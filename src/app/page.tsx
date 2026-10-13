import React from 'react';
import Link from 'next/link';
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
  Package,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  Wheat,
} from 'lucide-react';
import { LandingNav } from '@/components/layout/LandingNav';
import { BRAND_NAME } from '@/lib/brand';

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

const plans = [
  {
    name: 'Standard Pro',
    price: 'GHS 350',
    cadence: 'per month',
    description: 'For commercial farms that need automation, team controls and stronger reporting.',
    features: [
      'Up to 10 livestock units',
      'Advanced health analytics',
      'Full financial controls',
      'Inventory management',
      'Team management for 3 workers',
      'Email and WhatsApp notifications',
    ],
    highlight: false,
  },
  {
    name: 'Enterprise Suite',
    price: 'GHS 950',
    cadence: 'per month',
    description: 'For large operations with multiple farms, unlimited teams and priority support.',
    features: [
      'Unlimited livestock units',
      'Predictive analytics',
      'Custom financial reporting',
      'Multi-farm consolidation',
      'Unlimited team members',
      'Priority concierge support',
    ],
    highlight: true,
  },
];

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
            Live
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

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050d0a] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="absolute right-[-10%] top-[40%] h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
      </div>

      <LandingNav />

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Built for layer and broiler farms
            </div>

            <h1 className="mt-5 text-[2.25rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Run your poultry farm
              <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                from one screen.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              {BRAND_NAME} records eggs, feed, mortality, health and sales for every flock, then turns it into the
              numbers an owner needs: stock on hand, cost per bird, and profit this month.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
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
                <dd className="mt-1 font-bold text-white">Ghana cedis</dd>
              </div>
            </dl>
          </div>

          <DashboardPreview />
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-white/5 bg-white/[0.02] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">What it covers</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Every record a farm keeps on paper, in one place.
              </h2>
              <p className="mt-4 text-base text-white/65 sm:text-lg">
                Each module feeds the others: a sale reduces egg stock, a feeding reduces bags in store, a death updates
                the flock count and mortality rate.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
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
        <section id="roles" className="scroll-mt-20 border-y border-white/5 bg-white/[0.02] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Teams</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Each person sees their part of the farm.</h2>
              <p className="mt-4 text-base text-white/65 sm:text-lg">
                Invite staff by phone number or email. Permissions are set per section, so a worker can log eggs
                without ever opening the finance hub.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <section id="pricing" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Start on Basic. Upgrade when the farm grows.</h2>
              <p className="mt-4 text-base text-white/65 sm:text-lg">
                Every new farm begins on the Basic plan. Upgrade from inside the app when you need more units, more
                staff or deeper reporting. Pay for 3, 6 or 12 months to save up to 15%.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-3xl border p-7 ${
                    plan.highlight
                      ? 'border-emerald-400/40 bg-gradient-to-b from-emerald-500/15 to-[#0a1510]/80 shadow-[0_0_60px_rgba(52,211,153,0.15)]'
                      : 'border-white/10 bg-[#0a1510]/70'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-7 rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#04150e]">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-2 text-sm text-white/65">{plan.description}</p>
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-sm text-white/50">{plan.cadence}</span>
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-white/80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors ${
                      plan.highlight
                        ? 'bg-emerald-400 text-[#04150e] hover:bg-emerald-300'
                        : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    Get started
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-[#0a1510] to-[#0a1510] px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
            <Package className="mx-auto h-10 w-10 text-emerald-300" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Know what the farm is doing today.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
              Create the farm, register a flock and log the first collection. It takes less time than counting the
              crates.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
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

      <footer className="relative border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold">{BRAND_NAME}</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link href="/signup" className="hover:text-white">Sign up</Link>
          </nav>
          <p className="text-sm text-white/50">{`© ${year} ${BRAND_NAME}. All rights reserved.`}</p>
        </div>
      </footer>
    </div>
  );
}
