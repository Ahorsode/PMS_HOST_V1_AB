'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Mail, Shield, UserPlus, Loader2, CheckCircle2, XCircle, Trash2, ShieldCheck, UserCheck, Settings, AlertCircle, Phone, ChevronDown, RotateCcw, KeyRound, PauseCircle, PlayCircle } from 'lucide-react';
import { inviteWorker, getFarmMembers, deleteMember, deleteInvitation, updateWorkerPermissions, resetWorkerPermissions, updateFarmMemberRole, getUserForInvite, regenerateInviteCode, setMemberAccessPaused } from '@/lib/actions/staff-actions';
import Link from 'next/link';
import { InviteCodePanel, type IssuedInviteCode } from '@/components/team/InviteCodePanel';
import { getDefaultPermissionsForRole, type RolePermissionDefaults } from '@/lib/staff-permission-defaults';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PermissionsModal } from '@/components/ui/PermissionsModal';
import { useRouter } from 'next/navigation';
import { MutationBoundary } from '@/components/ui/MutationFeedback';
import { toast } from 'sonner';

export default function TeamView({
  canEdit = true,
  rolePermissions,
}: {
  canEdit?: boolean;
  /** Admin-set starting permissions per role (Farm defaults settings). */
  rolePermissions?: RolePermissionDefaults;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [resettingPermissionsUserId, setResettingPermissionsUserId] = useState<string | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('WORKER');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [issuedCode, setIssuedCode] = useState<IssuedInviteCode | null>(null);
  const [issuingCodeFor, setIssuingCodeFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'member' | 'invite' } | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<any>(null);
  const [limitCheck, setLimitCheck] = useState<{ canAdd: boolean, limit: number | null, current: number } | null>(null);
  const [staffPlan, setStaffPlan] = useState<{ planType: 'SOLO' | 'TEAM', staffLimit: number | null, overLimitCount: number } | null>(null);
  const [changingAccessUserId, setChangingAccessUserId] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>('WORKER');
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, boolean>>({});
  const [editPermissionsInvite, setEditPermissionsInvite] = useState<{
    inviteId: string;
    userId: string;
    name: string;
    role: string;
    currentPermissions: any;
  } | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    setPendingPermissions({});
  }, [inviteRole]);

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const data = await getFarmMembers() as any;
      if (data) {
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
        setCurrentUserRole(data.currentUserRole || 'WORKER');
        setLimitCheck(data.limitCheck || null);
        setStaffPlan(data.staffPlan || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isInviting) return;
    setIsInviting(true);
    setMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const emailOrPhone = formData.get('emailOrPhone') as string;
    const role = inviteRole as any;

    try {
      const result = await inviteWorker({
        emailOrPhone,
        role,
        permissions: Object.keys(pendingPermissions).length > 0 ? pendingPermissions : undefined,
      }) as any;
      if (result?.success) {
        setMessage({ type: 'success', text: result.inviteCode ? `${emailOrPhone} added. Share their login code below.` : `${emailOrPhone} added. They can sign in with their existing password.` });
        if (result.inviteCode) setIssuedCode({ code: result.inviteCode, recipient: emailOrPhone });
        form.reset();
        setInviteRole('WORKER');
        setPendingPermissions({});
        setShowPermissions(false);
        router.refresh();
        await loadTeam();
      } else {
        setMessage({ type: 'error', text: (result as any)?.error || 'Failed to send invitation.' });
      }
    } catch (err: any) {
      console.error("Client side exception:", err);
      setMessage({ type: 'error', text: err.message || String(err) || 'An unexpected error occurred.' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleNewCode = async (
    target: { invitationId?: string; memberUserId?: string },
    recipient: string,
  ) => {
    const key = target.invitationId || target.memberUserId || '';
    if (issuingCodeFor) return;
    setIssuingCodeFor(key);
    try {
      const result = await regenerateInviteCode(target) as any;
      if (result?.success && result.inviteCode) {
        setIssuedCode({ code: result.inviteCode, recipient });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(result?.error || 'Could not issue a new code');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not issue a new code');
    } finally {
      setIssuingCodeFor(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'member') {
        await deleteMember(deleteTarget.id);
      } else {
        await deleteInvitation(deleteTarget.id);
      }
      setDeleteTarget(null);
      await loadTeam();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSavePermissions = async (permissions: any) => {
    if (!permissionTarget || isSavingPermissions) return;
    setIsSavingPermissions(true);
    try {
      const response = await updateWorkerPermissions(permissionTarget.userId, permissions) as any;
      if (response?.success) {
        toast.success('Permissions updated. Active sessions will be refreshed.');
        setPermissionTarget(null);
        router.refresh();
        await loadTeam();
      } else {
        toast.error((response as any)?.error || 'Failed to save permissions');
      }
    } catch (err: any) {
      toast.error(err.message || 'Unknown error');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleResetPermissions = async (targetUserId: string, staffName: string, role: string) => {
    if (isSavingPermissions || resettingPermissionsUserId) return;

    const confirmed = window.confirm(
      `Reset ${staffName.trim() || 'this staff member'} to the default ${role} permissions? Their active session will be refreshed.`
    );
    if (!confirmed) return;

    setResettingPermissionsUserId(targetUserId);
    try {
      const response = await resetWorkerPermissions(targetUserId) as any;
      if (response?.success) {
        toast.success('Permissions reset to role defaults.');
        setPermissionTarget(null);
        setEditPermissionsInvite(null);
        router.refresh();
        await loadTeam();
      } else {
        toast.error(response?.error || 'Failed to reset permissions');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset permissions');
    } finally {
      setResettingPermissionsUserId(null);
    }
  };

  const handleSavePendingInvitePermissions = async (permissions: any) => {
    if (!editPermissionsInvite || isSavingPermissions) return;
    setIsSavingPermissions(true);
    try {
      const response = await updateWorkerPermissions(editPermissionsInvite.userId, permissions) as any;
      if (response?.success) {
        setEditPermissionsInvite(null);
        router.refresh();
        await loadTeam();
      } else {
        toast.error(response?.error || 'Failed to save pending invite permissions');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save pending invite permissions');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleAccessChange = async (member: any, paused: boolean) => {
    if (changingAccessUserId) return;
    setChangingAccessUserId(member.userId);
    try {
      const result = await setMemberAccessPaused(member.userId, paused);
      if (!result.success) {
        toast.error(result.error || 'Could not change access');
        return;
      }
      toast.success(paused ? 'Access paused' : 'Access restored');
      await loadTeam();
    } finally {
      setChangingAccessUserId(null);
    }
  };

  const handleRoleChange = async (member: any, nextRole: string) => {
    if (member.role === nextRole || updatingRoleUserId) return;

    const previousRole = member.role;
    setUpdatingRoleUserId(member.userId);
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role: nextRole, user: { ...item.user, role: nextRole } } : item));

    try {
      const response = await updateFarmMemberRole(member.userId, nextRole as any) as any;
      if (response?.success) {
        toast.success('Role updated. Active sessions will be refreshed.');
        router.refresh();
        await loadTeam();
      } else {
        setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role: previousRole, user: { ...item.user, role: previousRole } } : item));
        toast.error(response?.error || 'Failed to update role');
      }
    } catch (err: any) {
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role: previousRole, user: { ...item.user, role: previousRole } } : item));
      toast.error(err.message || 'Failed to update role');
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const configs: any = {
      OWNER: { class: 'bg-white/[0.06] text-[#a1a1a6] border-white/[0.08]', icon: ShieldCheck },
      MANAGER: { class: 'bg-white/[0.06] text-[#a1a1a6] border-white/[0.08]', icon: Shield },
      WORKER: { class: 'bg-green-50 text-green-700 border-green-100', icon: UserCheck },
      ACCOUNTANT: { class: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: ShieldCheck },
      FINANCE_OFFICER: { class: 'bg-white/[0.06] text-[#a1a1a6] border-white/[0.08]', icon: ShieldCheck },
      CASHIER: { class: 'bg-amber-50 text-amber-700 border-amber-100', icon: UserCheck }
    };
    const config = configs[role] || { class: 'bg-[#141415] text-[#a1a1a6] border-white/[0.08]', icon: Users };
    const Icon = config.icon;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${config.class}`}>
        <Icon className="w-3 h-3" />
        {role}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-7 px-0 md:px-3 pt-2 pb-7 md:py-7 relative">
      {issuedCode && <InviteCodePanel issued={issuedCode} onDismiss={() => setIssuedCode(null)} />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/10 p-7 rounded-lg border border-white/10 relative overflow-hidden gap-4">
        <div className="relative z-10">
          <h1 className="text-3xl font-medium leading-tight text-[#ededed]">Team</h1>
          <p className="mt-2 text-sm text-[#a1a1a6]">
             {currentUserRole === 'OWNER' ? 'You are the farm owner' : `Your role: ${currentUserRole.toLowerCase()}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <div className="lg:col-span-2 space-y-7">
          <Card className="rounded-lg border border-white/10 bg-white/10 overflow-hidden">
            <CardHeader className="bg-white/10 rounded-t-[2.5rem] border-b border-white/10 px-7 py-5">
              <CardTitle className="flex items-center text-white font-medium">
                <Users className="w-5 h-5 mr-2 text-[#85858b]" />
                Active members
              </CardTitle>
            </CardHeader>
            <CardContent className="p-7">
              {isLoading && members.length === 0 ? (
                <div className="flex justify-center p-16 text-[#ededed]"><Loader2 className="animate-spin h-10 w-10" /></div>
              ) : members.length === 0 ? (
                <div className="text-center py-16 bg-white/10 rounded-lg border-2 border-dashed border-white/10">
                  <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/70 font-medium text-xs">No staff members found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staffPlan && currentUserRole === 'OWNER' && (staffPlan.overLimitCount > 0 || staffPlan.staffLimit === 0) && members.some((m) => m.role !== 'OWNER') && (
                    <div className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-amber-100">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#85858b]" />
                      <div className="space-y-1">
                        {staffPlan.staffLimit === 0 ? (
                          <p className="font-medium">Solo plans are owner only, so your staff cannot sign in.</p>
                        ) : (
                          <p className="font-medium">
                            Your plan allows {staffPlan.staffLimit} staff, so {staffPlan.overLimitCount} {staffPlan.overLimitCount === 1 ? 'person is' : 'people are'} locked out.
                          </p>
                        )}
                        <p className="text-amber-100/80">
                          {staffPlan.staffLimit === 0
                            ? 'Switch to a Team plan to give them access again.'
                            : 'The most recently added staff are locked unless you choose. Pause someone with the pause button to give their seat to a locked person.'}{' '}
                          <Link href="/dashboard/license-upgrade" className="font-medium underline underline-offset-2">See plans</Link>
                        </p>
                      </div>
                    </div>
                  )}
                  {members.map((member) => {
                    const isMutatingMember = isDeleting && deleteTarget?.type === 'member' && deleteTarget.id === member.id;
                    const isUpdatingRole = updatingRoleUserId === member.userId;

                    return (
                    <MutationBoundary key={member.id} active={isMutatingMember || isUpdatingRole} label={isUpdatingRole ? 'Updating role...' : 'Revoking access...'}>
                    <div className="p-4 rounded-lg border border-white/5 bg-white/10 hover:border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center justify-between group relative overflow-hidden">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-md bg-white/[0.04] flex items-center justify-center text-[#ededed] font-medium text-xl border border-white/[0.08]">
                          {(member.user.firstname?.charAt(0) || member.user.surname?.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white text-lg tracking-normal">
                            {member.user.firstname} {member.user.surname}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {member.user.phoneNumber && (
                              <span className="inline-flex items-center gap-1 text-xs text-[#ededed] font-medium tracking-normal">
                                <Phone className="w-3 h-3" />
                                {member.user.phoneNumber}
                              </span>
                            )}
                            <span className="text-xs text-white/70 font-medium tracking-normal">{member.user.email || 'No email on file'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {canEdit && member.user.mustChangePassword && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            type="button"
                            onClick={() => handleNewCode(
                              { memberUserId: member.userId },
                              member.user.phoneNumber || member.user.email || 'this team member',
                            )}
                            disabled={issuingCodeFor !== null}
                            title="They haven't set a password yet. Issue a new one-time login code."
                            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-[#ededed] transition hover:bg-white/[0.04] disabled:opacity-50"
                          >
                            {issuingCodeFor === member.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                            New code
                          </button>
                        )}
                        {currentUserRole === 'OWNER' && member.role !== 'OWNER' ? (
                          <div className="relative">
                            <select
                              value={member.role}
                              onChange={(event) => handleRoleChange(member, event.target.value)}
                              disabled={!canEdit || isUpdatingRole}
                              className="h-10 rounded-md border border-white/10 bg-[#19191b] px-3 pr-9 text-xs font-medium text-white outline-none transition-colors focus:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Update employee role"
                            >
                              <option value="WORKER">Worker</option>
                              <option value="CASHIER">Cashier</option>
                              <option value="MANAGER">Manager</option>
                              <option value="ACCOUNTANT">Accountant</option>
                              <option value="FINANCE_OFFICER">Finance officer</option>
                            </select>
                            {isUpdatingRole && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[#85858b]" />}
                          </div>
                        ) : (
                          getRoleBadge(member.role)
                        )}
                        {member.accessStatus && member.accessStatus !== 'ACTIVE' && (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-[#ededed]">
                            {member.accessStatus === 'PAUSED' ? 'Paused' : 'Locked · over limit'}
                          </span>
                        )}
                        {canEdit && currentUserRole === 'OWNER' && member.role !== 'OWNER' && (
                          <button
                            type="button"
                            onClick={() => handleAccessChange(member, member.accessStatus !== 'PAUSED')}
                            disabled={changingAccessUserId !== null}
                            title={member.accessStatus === 'PAUSED' ? 'Restore access' : 'Pause access'}
                            className="p-2.5 text-[#ededed] hover:bg-white/[0.04] rounded-md transition-colors border border-transparent hover:border-white/[0.08] disabled:opacity-50"
                          >
                            {changingAccessUserId === member.userId ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : member.accessStatus === 'PAUSED' ? (
                              <PlayCircle className="w-5 h-5" />
                            ) : (
                              <PauseCircle className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        {canEdit && currentUserRole === 'OWNER' && member.userId !== (members.find(m => m.role === 'OWNER')?.userId || '') && (
                          <>
                          <button aria-label="Edit granular permissions" 
                            onClick={() => setPermissionTarget(member)}
                            title="Edit granular permissions"
                            className="p-2.5 text-[#a1a1a6] hover:bg-white/[0.06] rounded-md transition-colors border border-transparent hover:border-white/[0.08]"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleResetPermissions(
                              member.userId,
                              `${member.user.firstname || ''} ${member.user.surname || ''}`,
                              member.role
                            )}
                            disabled={resettingPermissionsUserId === member.userId}
                            title="Reset to role default permissions"
                            className="p-2.5 text-[#ededed] hover:bg-white/[0.04] rounded-md transition-colors border border-transparent hover:border-white/[0.08] disabled:opacity-50"
                          >
                            {resettingPermissionsUserId === member.userId ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-5 h-5" />
                            )}
                          </button>
                          </>
                        )}
                        {canEdit && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (member.role !== 'OWNER') && (
                          <button aria-label="Remove team member" 
                            onClick={() => setDeleteTarget({ id: member.id, type: 'member' })}
                            className="p-2.5 text-[#f2777b] hover:bg-white/[0.04] rounded-md transition-colors border border-transparent hover:border-white/[0.08]"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    </MutationBoundary>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/10 overflow-hidden">
            <CardHeader className="bg-white/10 rounded-t-[2.5rem] border-b border-white/10 px-7 py-5">
              <CardTitle className="flex items-center text-white font-medium">
                <Mail className="w-5 h-5 mr-2 text-[#85858b]" />
                Pending invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-7">
              {isLoading && invitations.length === 0 ? (
                <div className="flex justify-center p-11 text-[#ededed]"><Loader2 className="animate-spin" /></div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-11 bg-white/10 rounded-lg border-2 border-dashed border-white/10">
                  <Mail className="w-10 h-10 text-white/10 mx-auto mb-2" />
                  <p className="text-white/70 font-medium text-xs">No pending invitations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invite) => {
                    const isMutatingInvite = isDeleting && deleteTarget?.type === 'invite' && deleteTarget.id === invite.id;

                    return (
                    <MutationBoundary key={invite.id} active={isMutatingInvite} label="Cancelling invite...">
                    <div className="p-4 rounded-md border border-white/5 bg-white/10 flex items-center justify-between group hover:bg-white/[0.08] transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-md bg-white/[0.04] flex items-center justify-center text-[#85858b] border border-white/[0.08]">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-medium text-white tracking-normal">{invite.email || invite.phoneNumber}</p>
                          <p className="text-xs text-white/70 font-medium mt-0.5">Sent {new Date(invite.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getRoleBadge(invite.role)}
                        <span className="text-xs bg-white/[0.04] text-[#ededed] px-2 py-1 rounded-full font-medium border border-white/[0.08]">Pending</span>
                        {canEdit && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            type="button"
                            onClick={() => handleNewCode({ invitationId: invite.id }, invite.email || invite.phoneNumber)}
                            disabled={issuingCodeFor !== null}
                            title="Issue a new one-time login code"
                            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                          >
                            {issuingCodeFor === invite.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                            New code
                          </button>
                        )}
                        {canEdit && currentUserRole === 'OWNER' && (
                          <>
                          <button aria-label="Edit access control"
                            onClick={async () => {
                              const result = await getUserForInvite(invite.id) as any;
                              if (result?.userId) {
                                setEditPermissionsInvite({
                                  inviteId: invite.id,
                                  userId: result.userId,
                                  name: invite.email || invite.phoneNumber || 'Pending User',
                                  currentPermissions: result.permissions,
                                  role: invite.role,
                                });
                              } else {
                                toast.error('Could not load pending invite permissions');
                              }
                            }}
                            className="p-2 text-[#a1a1a6] hover:bg-white/[0.06] rounded-lg transition-colors"
                            title="Edit access control"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button aria-label="Reset to role default permissions"
                            onClick={async () => {
                              const result = await getUserForInvite(invite.id) as any;
                              if (result?.userId) {
                                await handleResetPermissions(
                                  result.userId,
                                  invite.email || invite.phoneNumber || 'Pending User',
                                  invite.role
                                );
                              } else {
                                toast.error('Could not load pending invite permissions');
                              }
                            }}
                            disabled={resettingPermissionsUserId !== null}
                            className="p-2 text-[#ededed] hover:bg-white/[0.04] rounded-lg transition-colors disabled:opacity-50"
                            title="Reset to role default permissions"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          </>
                        )}
                        {canEdit && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button aria-label="Cancel invitation" 
                            onClick={() => setDeleteTarget({ id: invite.id, type: 'invite' })}
                            className="p-2 text-[#f2777b] hover:bg-white/[0.04] rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    </MutationBoundary>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-7">
          {limitCheck && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <Card className="rounded-lg border border-white/10 bg-white/10 overflow-hidden">
              <CardContent className="p-7">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="text-white font-medium text-xl tracking-normal">Capacity gauge</h3>
                    <p className="text-white/70 text-xs font-medium mt-1">Worker limit</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-medium text-[#ededed]">{limitCheck.current}</span>
                    <span className="text-white/70 font-medium text-lg mx-1">/</span>
                    <span className="text-white font-medium">{limitCheck.limit === null ? '∞' : limitCheck.limit}</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden mb-3 relative shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-colors duration-200 ${limitCheck.canAdd ? 'bg-[#1e1e20]' : 'bg-[#1e1e20]'}`}
                    style={{ width: `${limitCheck.limit === null ? Math.min(limitCheck.current * 5, 100) : limitCheck.limit === 0 ? 100 : Math.min((limitCheck.current / limitCheck.limit) * 100, 100)}%` }}
                  ></div>
                </div>

                {!limitCheck.canAdd && (
                  <div className="bg-white/[0.04] border border-white/[0.08] p-3 rounded-md flex items-start gap-2 mt-5 animate-in fade-in slide-in-from-bottom-2">
                    <AlertCircle className="w-5 h-5 text-[#f2777b] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#f2777b] font-medium text-sm tracking-normal">Subscription limit reached</p>
                      <p className="text-[#f2777b] text-xs mt-1 leading-relaxed">{limitCheck.limit === 0 ? 'Solo plans are owner only. Switch to a Team plan to invite staff.' : 'Upgrade to Business Plus for unlimited staff.'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canEdit && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <Card className="rounded-lg border border-white/10 bg-white/[0.04] text-white overflow-hidden relative border-dashed">
              <CardHeader className="relative z-10 p-7">
                <CardTitle className="flex items-center">
                  Invite staff
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 px-7 pb-7">
                <form onSubmit={handleInvite} className="space-y-5">
                  <MutationBoundary active={isInviting} label="Sending invitation...">
                  <fieldset disabled={isInviting} className="space-y-5 disabled:opacity-70">
                  {message && (
                    <div className={`p-3 rounded-md text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
                      message.type === 'success' ? 'bg-white/[0.04] text-emerald-400 border border-white/[0.08]' : 'bg-white/[0.04] text-[#f2777b] border border-white/[0.08]'
                    }`}>
                      {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      {message.text}
                    </div>
                  )}
                  <Input 
                    label="Email or phone number"
                    name="emailOrPhone"
                    type="text" 
                    required
                    placeholder="staff@example.com or 0540000000"
                    onChange={() => {
                      if (message?.type === 'error') setMessage(null);
                    }}
                  />
                  <Select 
                    label="Assign role"
                    name="role"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                    options={[
                      { label: 'Worker', value: 'WORKER' },
                      { label: 'Cashier', value: 'CASHIER' },
                      { label: 'Manager', value: 'MANAGER' },
                      { label: 'Accountant', value: 'ACCOUNTANT' },
                      { label: 'Finance officer', value: 'FINANCE_OFFICER' }
                    ]}
                  />
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.03]">
                    <button
                      type="button"
                      aria-expanded={showPermissions}
                      aria-controls="invite-permission-toggles"
                      onClick={() => setShowPermissions((current) => !current)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#85858b]" />
                        Configure access control
                      </span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showPermissions ? 'rotate-180' : ''}`} />
                    </button>

                    {showPermissions && (
                      <div id="invite-permission-toggles" className="px-4 pb-4 pt-2 space-y-2 border-t border-white/10">
                        <p className="text-xs text-white/50 mb-3 leading-relaxed">
                          Default access based on role is pre-selected. Customise before sending the invitation.
                        </p>
                        <InlinePermissionToggles
                          role={inviteRole}
                          roleDefaults={rolePermissions}
                          value={pendingPermissions}
                          onChange={setPendingPermissions}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPendingPermissions({})}
                          className="w-full mt-3 border-white/[0.08] text-[#ededed] hover:bg-white/[0.04] text-[11px] font-medium"
                        >
                          <RotateCcw className="w-4 h-4 mr-2 inline" />
                          Reset to {inviteRole} Defaults
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!!(isInviting || (limitCheck && !limitCheck.canAdd))}
                    isLoading={isInviting}
                    loadingText="Sending..."
                    className="w-full py-5 mt-3"
                  >
                    Send invitation
                  </Button>
                  </fieldset>
                  </MutationBoundary>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-lg border border-white/10 bg-white/10 p-7">
            <div className="flex items-center gap-3 mb-7">
              <div className="p-2 bg-white/[0.06] rounded-md border border-white/[0.08]">
                <Shield className="w-6 h-6 text-[#a1a1a6]" />
              </div>
              <h4 className="font-medium text-white tracking-normal text-xl">Permissions</h4>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white/10 rounded-lg border border-white/5 group hover:bg-white/[0.08] transition-colors">
                <p className="font-medium text-xs text-[#a1a1a6] mb-2">Manager</p>
                <p className="text-xs text-white/70 leading-relaxed font-medium tracking-normal">Full visibility of all farm operations and logs. can manage staff, inventory, and sales.</p>
              </div>
              <div className="p-4 bg-white/10 rounded-lg border border-white/5 group hover:bg-white/[0.08] transition-colors">
                <p className="font-medium text-xs text-[#ededed] mb-2">Worker</p>
                <p className="text-xs text-white/70 leading-relaxed font-medium tracking-normal">Limited to data entry (feeding, mortality logs). can only view their own activity records.</p>
              </div>
              <div className="p-4 bg-white/10 rounded-lg border border-white/5 group hover:bg-white/[0.08] transition-colors">
                <p className="font-medium text-xs text-[#ededed] mb-2">Accountant</p>
                <p className="text-xs text-white/70 leading-relaxed font-medium tracking-normal">Exclusive access to finance and sales modules. handles commercial initialization and P&L reporting.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog 
        isOpen={!!deleteTarget} 
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)} 
        title={`Revoke ${deleteTarget?.type === 'member' ? 'Access' : 'Invitation'}`}
      >
        <div className="space-y-5">
          <p className="text-white/70 font-medium">
            Are you sure you want to {deleteTarget?.type === 'member' ? 'remove this member from the farm' : 'cancel this invitation'}? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-5 border-t border-white/10">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} loadingText="Revoking...">
              Confirm revoke
            </Button>
          </div>
        </div>
      </Dialog>
      
      {permissionTarget && (
        <PermissionsModal
          isOpen={!!permissionTarget}
          onClose={() => setPermissionTarget(null)}
          staffName={`${permissionTarget.user?.firstname || ''} ${permissionTarget.user?.surname || ''}`}
          role={permissionTarget.role}
          defaultPermissions={getDefaultPermissionsForRole(permissionTarget.role, undefined, rolePermissions)}
          initialPermissions={permissionTarget.user?.userPermissions?.[0]}
          isLoading={isSavingPermissions || resettingPermissionsUserId === permissionTarget.userId}
          onSave={handleSavePermissions}
          onResetToDefaults={() => handleResetPermissions(
            permissionTarget.userId,
            `${permissionTarget.user?.firstname || ''} ${permissionTarget.user?.surname || ''}`,
            permissionTarget.role
          )}
        />
      )}

      {editPermissionsInvite && (
        <PermissionsModal
          isOpen={!!editPermissionsInvite}
          onClose={() => setEditPermissionsInvite(null)}
          staffName={`${editPermissionsInvite.name} (Pending)`}
          role={editPermissionsInvite.role}
          defaultPermissions={getDefaultPermissionsForRole(editPermissionsInvite.role, undefined, rolePermissions)}
          initialPermissions={editPermissionsInvite.currentPermissions}
          isLoading={isSavingPermissions || resettingPermissionsUserId === editPermissionsInvite.userId}
          onSave={handleSavePendingInvitePermissions}
          onResetToDefaults={() => handleResetPermissions(
            editPermissionsInvite.userId,
            editPermissionsInvite.name,
            editPermissionsInvite.role
          )}
        />
      )}
    </div>
  );
}

const PERMISSION_MODULES = [
  { label: 'Finance', view: 'canViewFinance', edit: 'canEditFinance' },
  { label: 'Inventory', view: 'canViewInventory', edit: 'canEditInventory' },
  { label: 'Livestock / batches', view: 'canViewBatches', edit: 'canEditBatches' },
  { label: 'Sales', view: 'canViewSales', edit: 'canEditSales' },
  { label: 'Eggs', view: 'canViewEggs', edit: 'canEditEggs' },
  { label: 'Feeding', view: 'canViewFeeding', edit: 'canEditFeeding' },
  { label: 'Houses', view: 'canViewHouses', edit: 'canEditHouses' },
  { label: 'Mortality / quarantine', view: 'canViewMortality', edit: 'canEditMortality' },
  { label: 'Customers / suppliers', view: 'canViewCustomers', edit: 'canEditCustomers' },
  { label: 'Team management', view: 'canViewTeam', edit: 'canEditTeam' },
] as const;

function getInviteRoleDefaults(role: string, roleDefaults?: RolePermissionDefaults): Record<string, boolean> {
  return getDefaultPermissionsForRole(role, undefined, roleDefaults);
}

function InlinePermissionToggles({
  role,
  roleDefaults,
  value,
  onChange,
}: {
  role: string;
  roleDefaults?: RolePermissionDefaults;
  value: Record<string, boolean>;
  onChange: (value: Record<string, boolean>) => void;
}) {
  const effective = { ...getInviteRoleDefaults(role, roleDefaults), ...value };

  function toggle(key: string) {
    const next = { ...value, [key]: !effective[key] };

    if (key.startsWith('canView') && !next[key]) {
      next[key.replace('canView', 'canEdit')] = false;
    }

    if (key.startsWith('canEdit') && next[key]) {
      next[key.replace('canEdit', 'canView')] = true;
    }

    onChange(next);
  }

  return (
    <div className="space-y-2">
      {PERMISSION_MODULES.map((module) => (
        <div key={module.label} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
          <span className="text-xs font-medium text-white/75 tracking-normal">{module.label}</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
              <input
                type="checkbox"
                className="accent-emerald-400"
                checked={!!effective[module.view]}
                onChange={() => toggle(module.view)}
              />
              View
            </label>
            <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
              <input
                type="checkbox"
                className="accent-emerald-400"
                checked={!!effective[module.edit]}
                onChange={() => toggle(module.edit)}
              />
              Edit
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
