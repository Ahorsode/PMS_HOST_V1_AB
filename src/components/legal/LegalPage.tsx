import React from 'react';
import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';
import { BUSINESS_ADDRESS, BUSINESS_NAME, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, LEGAL_LINKS, LEGAL_UPDATED_LABEL } from '@/lib/legal';

export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {LEGAL_LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className="underline-offset-2 hover:text-white hover:underline">
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-white/80 [&_li]:ml-5 [&_li]:list-disc [&_a]:text-emerald-300 [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </section>
  );
}

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#050d0a] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold">{BRAND_NAME}</span>
          </Link>
          <Link href="/login" className="text-sm font-semibold text-white/70 hover:text-white">
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-sm text-white/60">Last updated {LEGAL_UPDATED_LABEL}</p>
          <p className="text-[15px] leading-7 text-white/80">{intro}</p>
        </div>
        {children}
        <LegalSection title="Contact us">
          <p>
            {BUSINESS_NAME}
            {BUSINESS_ADDRESS ? <>, {BUSINESS_ADDRESS}</> : null}
          </p>
          <p>
            Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or call {CONTACT_PHONE_DISPLAY}.
          </p>
        </LegalSection>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <LegalLinks />
          <p>{`© ${new Date().getFullYear()} ${BUSINESS_NAME}`}</p>
        </div>
      </footer>
    </div>
  );
}
