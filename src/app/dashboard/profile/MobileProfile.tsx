'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, Download, Info, Mail, MapPin, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QlOverflowMenu } from '@/components/ui/ql/OverflowMenu';
import { qlButton } from '@/components/ui/ql/Button';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Display only: "benjamin delali" reads "Benjamin Delali". The stored name is unchanged. */
const titleCase = (name: string) => name.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase())
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .join('') || '?';

function tenure(since: Date, now: Date) {
  const months = (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth()) - (now.getDate() < since.getDate() ? 1 : 0);
  if (months < 1) return 'under a month';
  if (months < 12) return `about ${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.floor(months / 12);
  return `about ${years} ${years === 1 ? 'year' : 'years'}`;
}

/** The account screen on a phone: who you are, the farm, your data, and delete behind a menu. */
export function MobileProfile({
  name,
  email,
  roleLabel,
  createdAt,
  farmName,
  location,
  isFarmOwner,
  deletionDays,
  deletionMailto,
  legalLinks,
  editInitial,
}: {
  name: string;
  email: string;
  roleLabel: string;
  createdAt: string;
  farmName: string;
  location: string | null;
  isFarmOwner: boolean;
  deletionDays: number;
  deletionMailto: string;
  legalLinks: ReadonlyArray<{ href: string; label: string }>;
  editInitial: { firstname: string; middleName?: string; surname: string };
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const shownName = titleCase(name || 'Farm user');
  const since = new Date(createdAt);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const place = (location || '').trim();
  const placeUnfinished = place.length > 0 && place.replace(/[^a-z]/gi, '').length < 4;

  return (
    <div className="space-y-3 pb-4 font-ql-sans">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Account</h1>
          <p className="text-[13px] text-ql-muted">Governance</p>
        </div>
        <QlOverflowMenu
          label="Account actions"
          placement="below"
          items={[
            { label: 'Edit profile', icon: Pencil, onSelect: () => setEditOpen(true) },
            { label: 'Request deletion', icon: Trash2, destructive: true, onSelect: () => setDeleteOpen(true) },
          ]}
        />
      </div>

      <QlHero aria-labelledby="ql-who">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ql-mint/50 bg-ql-mint/10 font-ql-display text-[18px] font-semibold text-ql-mint">
            {initials(shownName)}
          </span>
          <div className="min-w-0">
            <p id="ql-who" className="break-words font-ql-display text-[20px] font-semibold leading-tight text-ql-text">{shownName}</p>
            <QlChip tone="mint" className="mt-1">{roleLabel}</QlChip>
          </div>
        </div>
        <p className="mt-4 flex min-w-0 items-center gap-2 text-[14px] text-ql-text">
          <Mail className="h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
          <span className={cn('min-w-0 break-all', !email && 'text-ql-muted')}>{email || 'No email saved'}</span>
        </p>
        <p className="mt-2 font-ql-mono text-[11px] uppercase tracking-[0.06em] text-ql-muted">
          Member since {MONTHS[since.getMonth()]} {since.getFullYear()}
          {now ? (
            <>
              {' · '}
              <QlDerived formula="from the month you joined to today">{tenure(since, now)}</QlDerived>
            </>
          ) : null}
        </p>
        <button type="button" onClick={() => setEditOpen(true)} className={qlButton('filled', 'mt-4 min-h-12 w-full rounded-2xl')} {...QL_PRIMARY_ATTR}>
          <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Edit profile
        </button>
      </QlHero>

      <QlLabel as="h2" className="px-1 pt-2">Farm organization</QlLabel>
      <QlTile className="p-0">
        <div className="flex min-h-16 items-center gap-3 border-b border-ql-line px-4 py-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ql-line bg-ql-ground text-ql-muted">
            <Building2 className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="min-w-0">
            <QlLabel as="span">Entity name</QlLabel>
            <span className="mt-1 block break-words text-[15px] font-semibold text-ql-text">{farmName || 'Not linked to your account'}</span>
          </span>
        </div>
        <div className="flex min-h-16 items-center gap-3 px-4 py-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ql-line bg-ql-ground text-ql-muted">
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <QlLabel as="span">Location</QlLabel>
            <span className={cn('mt-1 block break-words text-[15px] font-semibold', place ? 'text-ql-text' : 'text-ql-muted')}>{place || 'Not set'}</span>
          </span>
          {farmName && (placeUnfinished || !place) ? <QlChip tone="amber">Check</QlChip> : null}
        </div>
      </QlTile>
      {farmName && (placeUnfinished || !place) ? (
        <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
          <p className="text-[13px] leading-snug">
            <span className="block font-semibold text-ql-text">{place ? 'Location looks unfinished' : 'No location yet'}</span>
            <span className="text-ql-muted">
              {place ? `“${place}” is ${place.length} ${place.length === 1 ? 'letter' : 'letters'}. ` : ''}Add a town and region so the farm is easy to tell apart.
            </span>
            {isFarmOwner ? (
              <Link
                href="/dashboard/settings?tab=farm"
                className="relative mt-1 block w-fit font-semibold text-ql-amber after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-amber/60"
              >
                Add location
              </Link>
            ) : (
              <span className="mt-1 block font-ql-mono text-[11px] text-ql-muted">Only the farm owner can change it.</span>
            )}
          </p>
        </div>
      ) : null}

      <QlLabel as="h2" className="px-1 pt-2">Your data</QlLabel>
      <QlTile>
        <p className="text-[15px] font-semibold text-ql-text">Download my data</p>
        <p className="mt-1 text-[13px] leading-snug text-ql-muted">
          {isFarmOwner
            ? 'A JSON file with your account details and every record of this farm.'
            : 'A JSON file with your account details. Farm records belong to the farm owner.'}
        </p>
        <a href="/api/account/export" className={qlButton('ghost', 'mt-3 w-full border-ql-line text-ql-text')}>
          <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Download
        </a>
      </QlTile>
      <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
        <p className="text-[13px] leading-snug">
          <span className="block font-semibold text-ql-text">Before you delete anything</span>
          <span className="text-ql-muted">
            Deleting removes your personal data within {deletionDays} days{isFarmOwner ? ", together with this farm's records" : ''}. Download a copy first. Request deletion is in the ⋯ menu above.
          </span>
        </p>
      </div>

      <QlLabel as="h2" className="px-1 pt-2">Legal</QlLabel>
      <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
        {legalLinks.map((link) => (
          <li key={link.href} className="border-b border-ql-line last:border-b-0">
            <Link href={link.href} className="flex min-h-12 items-center justify-between px-4 text-[15px] text-ql-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60">
              {link.label}
              <ChevronRight className="h-4 w-4 text-ql-muted" strokeWidth={1.5} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <EditProfileModal isOpen={editOpen} onOpenChange={setEditOpen} initialData={editInitial} />
      <DeleteAccountSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        farmName={farmName}
        isFarmOwner={isFarmOwner}
        deletionDays={deletionDays}
        deletionMailto={deletionMailto}
      />
    </div>
  );
}

function DeleteAccountSheet({
  open,
  onOpenChange,
  farmName,
  isFarmOwner,
  deletionDays,
  deletionMailto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmName: string;
  isFarmOwner: boolean;
  deletionDays: number;
  deletionMailto: string;
}) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const reasonId = useId();
  const target = (farmName || 'delete').trim();
  const matches = typed.trim().toLowerCase() === target.toLowerCase();
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const steps = [
    ['Your personal data goes', `Deleted within ${deletionDays} days of your request.`],
    ...(isFarmOwner ? [[`${farmName || 'This farm'}'s records go with it`, "This farm's records are deleted together with your data."]] : []),
    ['Sent from your email app', 'We get a deletion request; you choose when to send it.'],
  ];

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} title="Delete account" description="Account">
      <div className="space-y-4 pb-2 font-ql-sans">
        <ol className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex gap-3 border-b border-ql-line px-4 py-3 last:border-b-0">
              <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ql-mint/50 font-ql-mono text-[11px] text-ql-mint">
                {i + 1}
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-ql-text">{title}</span>
                <span className="block text-[13px] text-ql-muted">{body}</span>
              </span>
            </li>
          ))}
        </ol>
        <a href="/api/account/export" className={qlButton('ghost', 'w-full border-ql-line text-ql-text')}>
          <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Download my data first
        </a>
        <div>
          <label htmlFor={inputId} className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
            Type <span className="text-ql-text normal-case">{target}</span> to confirm
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={target}
            aria-describedby={matches ? undefined : reasonId}
            className="mt-2 h-12 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] text-ql-text placeholder:text-ql-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-coral/50"
          />
        </div>
        {!matches ? (
          <p id={reasonId} className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">
            Turns on when the name matches
          </p>
        ) : null}
        {matches ? (
          <a
            href={deletionMailto}
            onClick={() => onOpenChange(false)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ql-coral/60 bg-ql-coral/15 text-[15px] font-semibold text-ql-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-coral/60"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Request deletion
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-describedby={reasonId}
            className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-ql-coral/25 text-[15px] font-semibold text-ql-coral/50"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Request deletion
          </button>
        )}
      </div>
    </Dialog>
  );
}
