"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BRAND_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { qlButton } from '@/components/ui/ql/Button';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import { ContactRow, contactRows, type LandingContact } from '@/components/site/landing/ContactRows';

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'Teams' },
  { href: '#pricing', label: 'Pricing' },
];

type Sheet = 'menu' | 'contact' | null;

export function LandingNav({ contact }: { contact?: LandingContact }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [scrolled, setScrolled] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = sheet !== null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The phone sheet covers the page: lock scrolling under it and close on Escape.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSheet(null);
      triggerRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Leaving phone width with the sheet open would leave the page locked.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = () => query.matches && setSheet(null);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const close = () => setSheet(null);
  const rows = contact ? contactRows(contact) : [];
  const whatsapp = rows.find((row) => row.key === 'whatsapp');

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 border-b transition-colors',
        // Phones: Quiet Ledger ground with a hairline. Tablet and desktop keep the transparent-until-scrolled bar.
        'border-ql-line bg-ql-ground md:border-transparent md:bg-transparent',
        (scrolled || open) && 'md:border-white/10 md:bg-[#050d0a]/90 md:backdrop-blur-xl',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-20">
        <Link href="/" onClick={close} className="flex items-center gap-2.5 font-ql-display text-[17px] font-semibold text-white md:font-sans md:text-xl md:font-bold">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl object-cover md:shadow-lg md:shadow-emerald-500/20" />
          {BRAND_NAME}
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-white/65 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Phones: Log in as a ghost pill in the header; the hero keeps the one mint button. */}
          <Link
            href="/login"
            className="relative inline-flex min-h-9 items-center rounded-full border border-ql-line px-4 font-ql-sans text-sm font-semibold text-ql-text after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] md:hidden"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="hidden items-center rounded-full px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:text-white md:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="hidden items-center gap-1.5 rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-bold text-[#04150e] shadow-[0_0_24px_rgba(52,211,153,0.35)] transition-colors hover:bg-emerald-300 md:inline-flex"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            ref={triggerRef}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ql-text md:hidden"
            aria-expanded={open}
            aria-controls="landing-mobile-sheet"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setSheet((value) => (value ? null : 'menu'))}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="landing-mobile-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={sheet === 'contact' ? 'Contact us' : 'Menu'}
          className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col overflow-y-auto bg-ql-ground px-4 pb-[max(env(safe-area-inset-bottom),16px)] font-ql-sans text-ql-text md:hidden motion-safe:animate-rise-in"
        >
          {sheet === 'menu' ? (
            <>
              <ul className="divide-y divide-ql-line border-b border-ql-line">
                {links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} onClick={close} className="flex min-h-[60px] items-center justify-between font-ql-display text-[24px] font-semibold">
                      {link.label}
                      <ArrowRight aria-hidden="true" className="h-4 w-4 text-ql-muted" />
                    </a>
                  </li>
                ))}
                {rows.length > 0 ? (
                  <li>
                    <button type="button" onClick={() => setSheet('contact')} className="flex min-h-[60px] w-full items-center justify-between font-ql-display text-[24px] font-semibold">
                      Contact
                      <ArrowRight aria-hidden="true" className="h-4 w-4 text-ql-muted" />
                    </button>
                  </li>
                ) : null}
              </ul>

              <div className="mt-auto space-y-2 pt-8">
                {whatsapp ? <ContactRow row={whatsapp} onNavigate={close} /> : null}
                <Link href="/login" onClick={close} className={qlButton('ghost', 'w-full border-ql-line text-ql-text hover:bg-ql-text/[0.04]')}>
                  Log in
                </Link>
                <Link href="/signup" onClick={close} {...QL_PRIMARY_ATTR} className={qlButton('filled', 'w-full')}>
                  Create your farm account
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="pt-6">
              <h2 className="font-ql-display text-[26px] font-semibold">Contact us</h2>
              <p className="mt-1 text-[15px] text-ql-muted">Pick the way that suits you.</p>
              <ul className="mt-5 space-y-2">
                {rows.map((row, index) => (
                  <li key={row.key}>
                    <ContactRow row={row} primary={index === 0} onNavigate={close} />
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setSheet('menu')} className={qlButton('text', 'mt-4 px-0')}>
                Back to the menu
              </button>
            </div>
          )}
        </div>
      ) : null}
    </nav>
  );
}
