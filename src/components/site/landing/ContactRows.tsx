import React from 'react';
import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';

export type LandingContact = {
  email: string;
  phoneDisplay: string;
  phoneInternational: string;
  whatsappEnabled: boolean;
};

type Row = { key: 'whatsapp' | 'call' | 'email'; icon: typeof Mail; label: string; value: string; action: string; href: string; external: boolean };

/** Contact methods from the admin Website settings, WhatsApp first when it's on. */
export function contactRows(contact: LandingContact): Row[] {
  return [
    ...(contact.whatsappEnabled
      ? [{ key: 'whatsapp' as const, icon: MessageCircle, label: 'WhatsApp', value: contact.phoneDisplay, action: 'Chat', href: `https://wa.me/${contact.phoneInternational}`, external: true }]
      : []),
    { key: 'call', icon: Phone, label: 'Call', value: contact.phoneDisplay, action: 'Call', href: `tel:+${contact.phoneInternational}`, external: false },
    { key: 'email', icon: Mail, label: 'Email', value: contact.email, action: 'Write', href: `mailto:${contact.email}`, external: false },
  ];
}

/** One contact as a row: icon, label, value and a one-word action. `primary` fills it mint. */
export function ContactRow({ row, primary = false, onNavigate }: { row: Row; primary?: boolean; onNavigate?: () => void }) {
  return (
    <a
      href={row.href}
      target={row.external ? '_blank' : undefined}
      rel={row.external ? 'noopener noreferrer' : undefined}
      onClick={onNavigate}
      {...(primary ? QL_PRIMARY_ATTR : {})}
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5 font-ql-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
        primary ? 'border-transparent bg-ql-mint text-ql-on-mint' : 'border-ql-line bg-ql-surface text-ql-text',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', primary ? 'bg-ql-on-mint/10' : 'bg-ql-mint/10 text-ql-mint')}
      >
        <row.icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[11px]', primary ? 'opacity-75' : 'text-ql-muted')}>{row.label}</span>
        <span className="block truncate text-sm font-semibold">{row.value}</span>
      </span>
      {primary ? (
        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      ) : (
        <span className="shrink-0 text-[13px] font-semibold text-ql-mint">{row.action}</span>
      )}
    </a>
  );
}
