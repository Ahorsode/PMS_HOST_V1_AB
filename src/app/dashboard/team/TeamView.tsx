'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Mail, Shield, UserPlus, Loader2, CheckCircle2, XCircle, Trash2, ShieldCheck, UserCheck, Settings, AlertCircle } from 'lucide-react';
import { inviteWorker, getFarmMembers, deleteMember, deleteInvitation, updateWorkerPermissions } from '@/lib/actions/staff-actions';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PermissionsModal } from '@/components/ui/PermissionsModal';
import { useRouter } from 'next/navigation';

export default function TeamView({ canEdit = true }: { canEdit?: boolean }) {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('WORKER');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number, type: 'member' | 'invite' } | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<any>(null);
  const [limitCheck, setLimitCheck] = useState<{ canAdd: boolean, limit: number, current: number } | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const data = await getFarmMembers() as any;
      if (data) {
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
        setCurrentUserRole(data.currentUserRole || 'WORKER');
        setLimitCheck(data.limitCheck || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsInviting(true);
    setMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const emailOrPhone = formData.get('emailOrPhone') as string;
    const role = formData.get('role') as any;

    try {
      const result = await inviteWorker({ emailOrPhone, role }) as any;
      if (result?.success) {
        setMessage({ type: 'success', text: `Invitation sent to ${emailOrPhone}!` });
        form.reset();
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleSavePermissions = async (permissions: any) => {
    if (!permissionTarget) return;
    setIsLoading(true);
    try {
      const response = await updateWorkerPermissions(permissionTarget.userId, permissions) as any;
      if (response?.success) {
        setPermissionTarget(null);
        router.refresh();
        await loadTeam();
      } else {
        alert((response as any)?.error || 'Failed to save permissions');
      }
    } catch (err: any) {
      alert(err.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const configs: any = {
      OWNER: { class: 'bg-purple-50 text-purple-700 border-purple-100', icon: ShieldCheck },
      MANAGER: { class: 'bg-blue-50 text-blue-700 border-blue-100', icon: Shield },
      WORKER: { class: 'bg-green-50 text-green-700 border-green-100', icon: UserCheck },
      ACCOUNTANT: { class: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: ShieldCheck }
    };
    const config = configs[role] || { class: 'bg-gray-50 text-gray-700 border-gray-100', icon: Users };
    const Icon = config.icon;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest border flex items-center gap-1 ${config.class}`}>
        <Icon className="w-3 h-3" />
        {role}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-7 px-3 py-7 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/10 backdrop-blur-md p-7 rounded-lg border border-white/10 relative overflow-hidden gap-4">
        <div className="absolute top-0 right-0 p-7 opacity-5">
           <Users className="w-32 h-32 text-emerald-400" />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white tracking-normal">Team <span className="text-emerald-400 italic">Management</span></h2>
          <p className="text-white/80 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2 italic">
             <Shield className="w-3 h-3" /> {currentUserRole === 'OWNER' ? 'Absolute Farm Owner' : `${currentUserRole} Access`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <div className="lg:col-span-2 space-y-7">
          <Card className="rounded-lg border border-white/10 bg-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
            <CardHeader className="bg-white/10 rounded-t-[2.5rem] border-b border-white/10 px-7 py-5">
              <CardTitle className="flex items-center text-white font-bold italic">
                <Users className="w-5 h-5 mr-2 text-emerald-400" />
                Active Members
              </CardTitle>
            </CardHeader>
            <CardContent className="p-7">
              {isLoading && members.length === 0 ? (
                <div className="flex justify-center p-16 text-emerald-500"><Loader2 className="animate-spin h-10 w-10" /></div>
              ) : members.length === 0 ? (
                <div className="text-center py-16 bg-white/10 rounded-lg border-2 border-dashed border-white/10">
                  <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/70 font-bold uppercase tracking-widest text-xs italic">No staff members found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="p-4 rounded-lg border border-white/5 bg-white/10 hover:border-emerald-500/30 hover:bg-white/[0.08] transition-all flex items-center justify-between group relative overflow-hidden">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-lg border border-emerald-500/20">
                          {(member.user.firstname?.charAt(0) || member.user.surname?.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg tracking-normal">
                            {member.user.firstname} {member.user.surname}
                          </p>
                          <p className="text-xs text-white/70 font-bold tracking-normal">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getRoleBadge(member.role)}
                        {canEdit && currentUserRole === 'OWNER' && member.userId !== (members.find(m => m.role === 'OWNER')?.userId || '') && (
                          <button 
                            onClick={() => setPermissionTarget(member)}
                            className="p-2.5 text-blue-400 hover:bg-blue-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-blue-500/20"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                        )}
                        {canEdit && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (member.role !== 'OWNER') && (
                          <button 
                            onClick={() => setDeleteTarget({ id: member.id, type: 'member' })}
                            className="p-2.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
            <CardHeader className="bg-white/10 rounded-t-[2.5rem] border-b border-white/10 px-7 py-5">
              <CardTitle className="flex items-center text-white font-bold italic">
                <Mail className="w-5 h-5 mr-2 text-amber-400" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-7">
              {isLoading && invitations.length === 0 ? (
                <div className="flex justify-center p-11 text-amber-400"><Loader2 className="animate-spin" /></div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-11 bg-white/10 rounded-lg border-2 border-dashed border-white/10">
                  <Mail className="w-10 h-10 text-white/10 mx-auto mb-2" />
                  <p className="text-white/70 font-bold uppercase tracking-widest text-xs italic">No pending invitations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invite) => (
                    <div key={invite.id} className="p-4 rounded-md border border-white/5 bg-white/10 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-white tracking-normal">{invite.email || invite.phoneNumber}</p>
                          <p className="text-xs text-white/70 font-bold uppercase tracking-widest mt-0.5">Sent {new Date(invite.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getRoleBadge(invite.role)}
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full font-bold uppercase tracking-widest border border-amber-500/20">Pending</span>
                        {canEdit && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button 
                            onClick={() => setDeleteTarget({ id: invite.id, type: 'invite' })}
                            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-7">
          {limitCheck && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <Card className="rounded-lg border border-white/10 bg-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
              <CardContent className="p-7">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="text-white font-bold text-xl italic tracking-normal">Capacity Gauge</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Worker Limit</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-emerald-400">{limitCheck.current}</span>
                    <span className="text-white/70 font-bold text-lg mx-1">/</span>
                    <span className="text-white font-bold">{limitCheck.limit >= 1000 ? '∞' : limitCheck.limit}</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden mb-3 relative shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)] ${limitCheck.canAdd ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-rose-400 to-red-500'}`}
                    style={{ width: `${Math.min((limitCheck.current / limitCheck.limit) * 100, 100)}%` }}
                  ></div>
                </div>

                {!limitCheck.canAdd && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-md flex items-start gap-2 mt-5 animate-in fade-in slide-in-from-bottom-2">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-rose-400 font-bold text-sm tracking-normal">Subscription Limit Reached</p>
                      <p className="text-rose-400/70 text-xs mt-1 leading-relaxed">Upgrade your tier to invite addition personnel to this farm.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canEdit && (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <Card className="rounded-lg border border-white/10 bg-emerald-500/10 backdrop-blur-xl text-white overflow-hidden relative shadow-2xl border-dashed">
              <div className="absolute top-0 right-0 p-7 opacity-10 pointer-events-none">
                <UserPlus className="w-48 h-48 text-emerald-400" />
              </div>
              <CardHeader className="relative z-10 p-7">
                <CardTitle className="flex items-center">
                  Invite Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 px-7 pb-7">
                <form onSubmit={handleInvite} className="space-y-5">
                  {message && (
                    <div className={`p-3 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-top-2 backdrop-blur-md ${
                      message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      {message.text}
                    </div>
                  )}
                  <Input 
                    label="Email or Phone Number"
                    name="emailOrPhone"
                    type="text" 
                    required
                    placeholder="staff@example.com or 0540000000"
                  />
                  <Select 
                    label="Assign Role"
                    name="role"
                    options={[
                      { label: 'Worker', value: 'WORKER' },
                      { label: 'Manager', value: 'MANAGER' },
                      { label: 'Accountant', value: 'ACCOUNTANT' }
                    ]}
                    defaultValue="WORKER"
                  />
                  <Button 
                    type="submit" 
                    disabled={!!(isInviting || (limitCheck && !limitCheck.canAdd))}
                    className="w-full py-5 mt-3"
                  >
                    {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invitation'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-lg border border-white/10 bg-white/10 backdrop-blur-xl p-7 shadow-2xl">
            <div className="flex items-center gap-3 mb-7">
              <div className="p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="font-bold text-white italic tracking-normal text-xl">Permissions</h4>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white/10 rounded-lg border border-white/5 group hover:bg-white/[0.08] transition-all">
                <p className="font-bold text-xs uppercase tracking-widest text-blue-400 mb-2 italic">Manager</p>
                <p className="text-xs text-white/70 leading-relaxed font-bold tracking-normal">Full visibility of all farm operations and logs. Can manage staff, inventory, and sales.</p>
              </div>
              <div className="p-4 bg-white/10 rounded-lg border border-white/5 group hover:bg-white/[0.08] transition-all">
                <p className="font-bold text-xs uppercase tracking-widest text-emerald-400 mb-2 italic">Worker</p>
                <p className="text-xs text-white/70 leading-relaxed font-bold tracking-normal">Limited to data entry (feeding, mortality logs). Can only view their own activity records.</p>
              </div>
              <div className="p-4 bg-white/10 rounded-lg border border-white/5 group hover:bg-white/[0.08] transition-all">
                <p className="font-bold text-xs uppercase tracking-widest text-emerald-500 mb-2 italic">Accountant</p>
                <p className="text-xs text-white/70 leading-relaxed font-bold tracking-normal">Exclusive access to Finance and Sales modules. Handles commercial initialization and P&L reporting.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog 
        isOpen={!!deleteTarget} 
        onOpenChange={(open) => !open && setDeleteTarget(null)} 
        title={`Revoke ${deleteTarget?.type === 'member' ? 'Access' : 'Invitation'}`}
      >
        <div className="space-y-5">
          <p className="text-white/70 font-medium">
            Are you sure you want to {deleteTarget?.type === 'member' ? 'remove this member from the farm' : 'cancel this invitation'}? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-5 border-t border-white/10">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isLoading}>
              Confirm Revoke
            </Button>
          </div>
        </div>
      </Dialog>
      
      {permissionTarget && (
        <PermissionsModal
          isOpen={!!permissionTarget}
          onClose={() => setPermissionTarget(null)}
          staffName={`${permissionTarget.user?.firstname || ''} ${permissionTarget.user?.surname || ''}`}
          initialPermissions={permissionTarget.user?.userPermissions?.[0]}
          isLoading={isLoading}
          onSave={handleSavePermissions}
        />
      )}
    </div>
  );
}
