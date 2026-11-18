import React from 'react';
import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';
import { LegalLinks } from '@/components/legal/LegalPage';
import { QlLabel } from '@/components/ui/ql/Surface';
import { ContactRow, contactRows, type LandingContact } from './ContactRows';

const linkClass = 'flex min-h-11 items-center text-sm text-ql-text';

/** Phone footer: Product and Account groups, contact as rows, legal last and quieter. */
export function MobileFooter({ contact, copyright }: { contact: LandingContact; copyright: string }) {
  return (
    <div className="px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-6 font-ql-sans text-ql-text md:hidden">
      <div className="flex items-center gap-2.5">
        <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
        <span className="font-ql-display font-semibold">{BRAND_NAME}</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <nav aria-label="Product">
          <QlLabel as="h2">Product</QlLabel>
          <ul className="mt-2">
            <li><a href="#features" className={linkClass}>Features</a></li>
            <li><a href="#how-it-works" className={linkClass}>How it works</a></li>
            <li><a href="#roles" className={linkClass}>Teams</a></li>
            <li><a href="#pricing" className={linkClass}>Pricing</a></li>
          </ul>
        </nav>
        <nav aria-label="Account">
          <QlLabel as="h2">Account</QlLabel>
          <ul className="mt-2">
            <li><Link href="/login" className={linkClass}>Log in</Link></li>
            <li><Link href="/signup" className={linkClass}>Sign up</Link></li>
            <li><a href="#contact-us" className={linkClass}>Contact</a></li>
          </ul>
        </nav>
      </div>

      <div id="contact-us" className="mt-6 scroll-mt-20">
        <QlLabel as="h2">Contact us</QlLabel>
        <ul className="mt-3 space-y-2">
          {contactRows(contact).map((row) => (
            <li key={row.key}>
              <ContactRow row={row} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 space-y-2 text-xs text-ql-muted">
        <LegalLinks className="gap-x-4 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center" />
        <p>{copyright}</p>
      </div>
    </div>
  );
}
