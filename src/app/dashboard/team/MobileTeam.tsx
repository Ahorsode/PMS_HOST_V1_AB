'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ChevronDown, KeyRound, Mail, PauseCircle, PlayCircle, Plus, RotateCcw, Settings, Trash2, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { QlOverflowMenu, type QlMenuItem } from '@/components/ui/ql/OverflowMenu';
import { QlConfirmSheet } from '@/components/ui/ql/ConfirmSheet';
import { QlDerived } from '@/components/ui/ql/Derived';
import { qlButton } from '@/components/ui/ql/Button';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';

export const ROLE_OPTIONS = [
  { value: 'WORKER', label: 'Worker' },
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'FINANCE_OFFICER', label: 'Finance officer' },
] as const;

const roleLabel = (role: string) => ROLE_OPTIONS.find((r) => r.value === role)?.label ?? (role === 'OWNER' ? 'Owner' : role.charAt(0) + role.slice(1).toLowerCase());
const personName = (m: any) => `${m.user?.firstname || ''} ${m.user?.surname || ''}`.trim() || m.user?.email || m.user?.phoneNumber || 'Team member';

/** Team on a phone: who is on the farm, one menu per person, and one Invite staff bar. */
export function MobileTeam({
  members,
  invitations,
  loading,
  currentUserRole,
  canEdit,
  limitCheck,
  staffPlan,
  roleDescriptions,
  busyUserId,
  onChangeRole,
  onEditAccess,
  onTogglePause,
  onResetAccess,
  onNewCode,
  onRemoveMember,
  onEditInvite,
  onResetInvite,
  onCancelInvite,
  inviteRole,
  onInviteRole,
  onInvite,
  inviting,
  message,
  permissionToggles,
  onResetToggles,
}: {
  members: any[];
  invitations: any[];
  loading: boolean;
  currentUserRole: string;
  canEdit: boolean;
  limitCheck: { canAdd: boolean; limit: number | null; current: number } | null;
  staffPlan: { planType: 'SOLO' | 'TEAM'; staffLimit: number | null; overLimitCount: number } | null;
  roleDescriptions: Record<string, string>;
  busyUserId: string | null;
  onChangeRole: (member: any, role: string) => void;
  onEditAccess: (member: any) => void;
  onTogglePause: (member: any) => void;
  onResetAccess: (member: any) => void;
  onNewCode: (member: any) => void;
  onRemoveMember: (member: any) => Promise<void>;
  onEditInvite: (invite: any) => void;
  onResetInvite: (invite: any) => void;
  onCancelInvite: (invite: any) => Promise<void>;
  inviteRole: string;
  onInviteRole: (role: string) => void;
  onInvite: (e: React.FormEvent<HTMLFormElement>) => void;
  inviting: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  permissionToggles: React.ReactNode;
  onResetToggles: () => void;
}) {
  const isOwner = currentUserRole === 'OWNER';
  const canManage = canEdit && (isOwner || currentUserRole === 'MANAGER');
  const ownerId = members.find((m) => m.role === 'OWNER')?.userId ?? '';
  const [roleFor, setRoleFor] = useState<any>(null);
  const [removing, setRemoving] = useState<any>(null);
  const [cancelling, setCancelling] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [togglesOpen, setTogglesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const staffCount = members.filter((m) => m.role !== 'OWNER').length;
  const limitReached = !!limitCheck && !limitCheck.canAdd;

  // Close the invite sheet once the invitation went through (the login code shows at the top of the page).
  useEffect(() => {
    if (message?.type === 'success' && inviteOpen) {
      setInviteOpen(false);
      setAddress('');
    }
  }, [message, inviteOpen]);

  const memberMenu = (member: any): QlMenuItem[] => {
    const items: QlMenuItem[] = [];
    if (member.role === 'OWNER') return items;
    if (canEdit && isOwner) items.push({ label: 'Change role', icon: UserCog, onSelect: () => setRoleFor(member) });
    if (canEdit && isOwner && member.userId !== ownerId) items.push({ label: 'Edit access', icon: Settings, onSelect: () => onEditAccess(member) });
    if (canEdit && isOwner)
      items.push({
        label: member.accessStatus === 'PAUSED' ? 'Restore access' : 'Pause access',
        icon: member.accessStatus === 'PAUSED' ? PlayCircle : PauseCircle,
        onSelect: () => onTogglePause(member),
      });
    if (canEdit && isOwner && member.userId !== ownerId) items.push({ label: 'Reset to role defaults', icon: RotateCcw, onSelect: () => onResetAccess(member) });
    if (canManage && member.user?.mustChangePassword) items.push({ label: 'New login code', icon: KeyRound, onSelect: () => onNewCode(member) });
    if (canManage) items.push({ label: 'Remove from farm', icon: Trash2, destructive: true, onSelect: () => setRemoving(member) });
    return items;
  };

  const inviteMenu = (invite: any): QlMenuItem[] => {
    const items: QlMenuItem[] = [];
    if (canManage) items.push({ label: 'New login code', icon: KeyRound, onSelect: () => onNewCode({ invitation: invite }) });
    if (canEdit && isOwner) {
      items.push({ label: 'Edit access', icon: Settings, onSelect: () => onEditInvite(invite) });
      items.push({ label: 'Reset to role defaults', icon: RotateCcw, onSelect: () => onResetInvite(invite) });
    }
    if (canManage) items.push({ label: 'Cancel invitation', icon: Trash2, destructive: true, onSelect: () => setCancelling(invite) });
    return items;
  };

  const sendReason = limitReached
    ? limitCheck?.limit === 0
      ? 'Solo plans are owner only'
      : 'Your plan’s staff limit is reached'
    : !address.trim()
      ? 'Add an email or phone number first'
      : null;

  return (
    <div className={cn('space-y-3 font-ql-sans', canManage ? 'pb-24' : 'pb-4')}>
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Team</h1>
        <p className="text-[13px] text-ql-muted">{isOwner ? 'You are the farm owner' : `Your role: ${roleLabel(currentUserRole).toLowerCase()}`}</p>
      </div>

      {staffPlan && isOwner && (staffPlan.overLimitCount > 0 || staffPlan.staffLimit === 0) && staffCount > 0 ? (
        <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
          <p className="text-[13px] leading-snug">
            <span className="block font-semibold text-ql-text">
              {staffPlan.staffLimit === 0
                ? 'Solo plans are owner only, so your staff cannot sign in.'
                : `Your plan allows ${staffPlan.staffLimit} staff, so ${staffPlan.overLimitCount} ${staffPlan.overLimitCount === 1 ? 'person is' : 'people are'} locked out.`}
            </span>
            <span className="text-ql-muted">
              {staffPlan.staffLimit === 0 ? 'Switch to a Team plan to give them access again.' : 'Pause someone to give their seat to a locked person.'}{' '}
            </span>
            <Link href="/dashboard/license-upgrade" className="relative font-semibold text-ql-amber after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']">
              See plans
            </Link>
          </p>
        </div>
      ) : null}

      {limitCheck && (isOwner || currentUserRole === 'MANAGER') ? (
        <section aria-labelledby="ql-workers" className="rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p id="ql-workers" className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Staff</p>
            {limitCheck.limit === null ? (
              <span className="inline-flex h-6 items-center rounded-full bg-ql-mint/12 px-2.5 text-[11px] font-semibold text-ql-mint">No limit</span>
            ) : limitReached ? (
              <span className="inline-flex h-6 items-center rounded-full bg-ql-coral/14 px-2.5 text-[11px] font-semibold text-ql-coral">Limit reached</span>
            ) : (
              <span className="inline-flex h-6 items-center rounded-full bg-ql-text/[0.06] px-2.5 text-[11px] font-semibold text-ql-muted">
                {limitCheck.limit - limitCheck.current} seats left
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="font-ql-display text-[32px] font-semibold leading-none text-ql-text">
              {limitCheck.current}
              {limitCheck.limit !== null ? <span className="text-[16px] text-ql-muted"> of {limitCheck.limit}</span> : null}
            </p>
            {staffPlan ? <p className="text-[12px] text-ql-muted">{staffPlan.planType === 'SOLO' ? 'Solo plan' : 'Team plan'}</p> : null}
          </div>
          {limitReached ? (
            <p className="mt-2 text-[13px] text-ql-muted">
              {limitCheck.limit === 0 ? 'Solo plans are owner only. Switch to a Team plan to invite staff.' : 'Upgrade to Business Plus for unlimited staff.'}{' '}
              <Link href="/dashboard/license-upgrade" className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']">
                See plans
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <h2 className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Active members</h2>
        <span className="font-ql-mono text-[11px] text-ql-muted">
          <QlDerived formula="everyone listed below">{members.length}</QlDerived>
        </span>
      </div>
      {loading && members.length === 0 ? (
        <p className="py-8 text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted motion-safe:animate-pulse">Loading the team…</p>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ql-line bg-ql-surface px-5 py-6 text-center">
          <p className="text-[15px] font-semibold text-ql-text">No one on the team yet</p>
          <p className="mt-1 text-[13px] text-ql-muted">{canManage ? 'Invite staff with the button below.' : 'The farm owner can invite staff.'}</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
          {members.map((member) => {
            const items = memberMenu(member);
            const name = personName(member);
            return (
              <li key={member.id} className={cn('flex items-center gap-3 border-b border-ql-line px-4 py-3 last:border-b-0', busyUserId === member.userId && 'motion-safe:animate-pulse')}>
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ql-line bg-ql-ground font-ql-display text-[15px] font-semibold text-ql-text">
                  {name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="break-words text-[15px] font-semibold text-ql-text">{name}</span>
                    <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold', member.role === 'OWNER' ? 'bg-ql-mint/12 text-ql-mint' : 'bg-ql-text/[0.06] text-ql-muted')}>
                      {roleLabel(member.role)}
                    </span>
                    {member.accessStatus && member.accessStatus !== 'ACTIVE' ? (
                      <span className="inline-flex h-5 items-center rounded-full bg-ql-amber/14 px-2 text-[10px] font-semibold text-ql-amber">
                        {member.accessStatus === 'PAUSED' ? 'Paused' : 'Locked · over limit'}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[12px] text-ql-muted">{[member.user?.phoneNumber, member.user?.email].filter(Boolean).join(' · ') || 'No email on file'}</p>
                </div>
                {items.length > 0 ? <QlOverflowMenu label={`Actions for ${name}`} items={items} placement="below" /> : null}
              </li>
            );
          })}
        </ul>
      )}

      {invitations.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-ql-line bg-ql-surface px-4 py-3">
          <Mail className="h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
          <p className="text-[13px] leading-snug">
            <span className="block font-semibold text-ql-text">No pending invitations</span>
            <span className="text-ql-muted">Invitations you send wait here.</span>
          </p>
        </div>
      ) : (
        <>
          <h2 className="px-1 pt-1 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Pending invitations</h2>
          <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
            {invitations.map((invite) => {
              const items = inviteMenu(invite);
              const who = invite.email || invite.phoneNumber;
              return (
                <li key={invite.id} className="flex items-center gap-3 border-b border-ql-line px-4 py-3 last:border-b-0">
                  <Mail className="h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="break-all text-[15px] font-semibold text-ql-text">{who}</span>
                      <span className="inline-flex h-5 items-center rounded-full bg-ql-text/[0.06] px-2 text-[10px] font-semibold text-ql-muted">{roleLabel(invite.role)}</span>
                    </p>
                    <p className="text-[12px] text-ql-muted">Waiting to accept · sent {new Date(invite.createdAt).toLocaleDateString()}</p>
                  </div>
                  {items.length > 0 ? <QlOverflowMenu label={`Actions for the invitation to ${who}`} items={items} placement="below" /> : null}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {canManage ? (
        <div className="fixed inset-x-0 bottom-[calc(4rem+max(env(safe-area-inset-bottom),6px))] z-40 border-t border-ql-line bg-ql-ground/95 px-4 py-3 backdrop-blur md:hidden">
          <button type="button" onClick={() => setInviteOpen(true)} className={qlButton('filled', 'min-h-12 w-full rounded-2xl')} {...QL_PRIMARY_ATTR}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Invite staff
          </button>
        </div>
      ) : (
        <p className="px-1 font-ql-mono text-[11px] text-ql-muted">Inviting staff needs the owner or a manager with team access.</p>
      )}

      <Dialog isOpen={inviteOpen} onOpenChange={(open) => !inviting && setInviteOpen(open)} title="Invite staff" description="Team">
        <form onSubmit={onInvite} className="space-y-4 pb-2 font-ql-sans" noValidate>
          {message ? (
            <p className={cn('flex items-start gap-2 rounded-xl border p-3 text-[13px]', message.type === 'success' ? 'border-ql-mint/40 text-ql-text' : 'border-ql-coral/40 text-ql-coral')}>
              {message.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ql-mint" aria-hidden /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
              {message.text}
            </p>
          ) : null}
          <label className="block">
            <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
              Email or phone number <span className="text-ql-coral">*</span>
            </span>
            <input
              name="emailOrPhone"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 0540000000 or kofi@example.com"
              autoComplete="off"
              disabled={inviting}
              className="mt-2 h-12 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] text-ql-text placeholder:text-ql-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
            />
          </label>
          <RolePicker value={inviteRole} onChange={onInviteRole} descriptions={roleDescriptions} disabled={inviting} />
          <div className="rounded-2xl border border-ql-line bg-ql-surface">
            <button
              type="button"
              onClick={() => setTogglesOpen((v) => !v)}
              aria-expanded={togglesOpen}
              className="flex min-h-12 w-full items-center gap-3 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ql-text">Choose what they can see and change</span>
                <span className="block text-[12px] text-ql-muted">Optional. You can adjust it later.</span>
              </span>
              <ChevronDown className={cn('h-4 w-4 text-ql-muted transition-transform motion-reduce:transition-none', togglesOpen && 'rotate-180')} strokeWidth={1.5} aria-hidden />
            </button>
            {togglesOpen ? (
              <div className="border-t border-ql-line px-3 pb-3">
                {permissionToggles}
                <button type="button" onClick={onResetToggles} className={qlButton('text', 'w-full')}>
                  Back to the {roleLabel(inviteRole).toLowerCase()} defaults
                </button>
              </div>
            ) : null}
          </div>
          {sendReason && !inviting ? (
            <p id="ql-send-reason" className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">
              {sendReason}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!!sendReason || inviting}
            aria-describedby={sendReason ? 'ql-send-reason' : undefined}
            className={qlButton('filled', 'min-h-12 w-full rounded-2xl')}
          >
            {inviting ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </Dialog>

      <Dialog isOpen={!!roleFor} onOpenChange={(open) => !open && setRoleFor(null)} title={roleFor ? `Role for ${personName(roleFor)}` : 'Role'} description="Team">
        {roleFor ? (
          <div className="space-y-4 pb-2 font-ql-sans">
            <RolePicker
              value={roleFor.role}
              onChange={(role) => {
                onChangeRole(roleFor, role);
                setRoleFor(null);
              }}
              descriptions={roleDescriptions}
            />
            <p className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Picking a role saves it</p>
          </div>
        ) : null}
      </Dialog>

      <QlConfirmSheet
        open={!!removing}
        onOpenChange={(open) => !open && !busy && setRemoving(null)}
        title={removing ? `Remove ${personName(removing)}` : 'Remove'}
        description="They lose access to this farm. Pause access instead if you may bring them back."
        name={removing ? personName(removing) : ''}
        confirmLabel="Remove from farm"
        busy={busy}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await onRemoveMember(removing);
            setRemoving(null);
          } finally {
            setBusy(false);
          }
        }}
      />
      <QlConfirmSheet
        open={!!cancelling}
        onOpenChange={(open) => !open && !busy && setCancelling(null)}
        title="Cancel this invitation?"
        description="The invitation stops working. You can invite them again later."
        name={cancelling ? cancelling.email || cancelling.phoneNumber : ''}
        confirmLabel="Cancel invitation"
        busy={busy}
        onConfirm={async () => {
          if (!cancelling) return;
          setBusy(true);
          try {
            await onCancelInvite(cancelling);
            setCancelling(null);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

/** Role choice with its description right under it. */
function RolePicker({ value, onChange, descriptions, disabled }: { value: string; onChange: (role: string) => void; descriptions: Record<string, string>; disabled?: boolean }) {
  const current = ROLE_OPTIONS.find((r) => r.value === value) ?? ROLE_OPTIONS[0];
  return (
    <div>
      <p className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Their role</p>
      <div role="radiogroup" aria-label="Role" className="mt-2 flex flex-wrap gap-2">
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role.value}
            type="button"
            role="radio"
            aria-checked={value === role.value}
            disabled={disabled}
            onClick={() => onChange(role.value)}
            className={cn(
              'min-h-11 rounded-full border px-3.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
              value === role.value ? 'border-ql-mint bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
            )}
          >
            {role.label}
          </button>
        ))}
      </div>
      <div className="mt-2 rounded-2xl border border-ql-line bg-ql-surface p-3">
        <p className="text-[14px] font-semibold text-ql-text">{current.label}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-ql-muted">{descriptions[current.value]}</p>
      </div>
    </div>
  );
}
