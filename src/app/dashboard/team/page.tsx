'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Mail, Shield, UserPlus, Loader2, CheckCircle2, XCircle, Trash2, ShieldCheck, UserCheck } from 'lucide-react';
import { inviteWorker, getFarmMembers, deleteMember, deleteInvitation } from '@/lib/actions/staff-actions';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number, type: 'member' | 'invite' } | null>(null);

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
      const result = await inviteWorker({ emailOrPhone, role });
      if (result.success) {
        setMessage({ type: 'success', text: `Invitation sent to ${emailOrPhone}!` });
        form.reset();
        await loadTeam();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send invitation.' });
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

  const getRoleBadge = (role: string) => {
    const configs: any = {
      OWNER: { class: 'bg-purple-50 text-purple-700 border-purple-100', icon: ShieldCheck },
      MANAGER: { class: 'bg-blue-50 text-blue-700 border-blue-100', icon: Shield },
      WORKER: { class: 'bg-green-50 text-green-700 border-green-100', icon: UserCheck }
    };
    const config = configs[role] || { class: 'bg-gray-50 text-gray-700 border-gray-100', icon: Users };
    const Icon = config.icon;
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${config.class}`}>
        <Icon className="w-3 h-3" />
        {role}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8 relative">
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Users className="w-32 h-32 text-emerald-400" />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter">Team <span className="text-emerald-400 italic">Management</span></h2>
          <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2 italic">
             <Shield className="w-3 h-3" /> Access Control & Operations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
            <CardHeader className="bg-white/5 rounded-t-[2.5rem] border-b border-white/10 px-8 py-6">
              <CardTitle className="flex items-center text-white font-black italic">
                <Users className="w-5 h-5 mr-3 text-emerald-400" />
                Active Members
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {isLoading && members.length === 0 ? (
                <div className="flex justify-center p-20 text-emerald-500"><Loader2 className="animate-spin h-10 w-10" /></div>
              ) : members.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                  <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] italic">No staff members found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="p-5 rounded-3xl border border-white/5 bg-white/5 hover:border-emerald-500/30 hover:bg-white/[0.08] transition-all flex items-center justify-between group relative overflow-hidden">
                      <div className="flex items-center space-x-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-xl shadow-lg border border-emerald-500/20">
                          {(member.user.firstname?.charAt(0) || member.user.surname?.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-white text-lg tracking-tight">
                            {member.user.firstname} {member.user.surname}
                          </p>
                          <p className="text-xs text-white/50 font-bold tracking-tight">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getRoleBadge(member.role)}
                        {member.role !== 'OWNER' && (
                          <button 
                            onClick={() => setDeleteTarget({ id: member.id, type: 'member' })}
                            className="p-2.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20"
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

          <Card className="rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
            <CardHeader className="bg-white/5 rounded-t-[2.5rem] border-b border-white/10 px-8 py-6">
              <CardTitle className="flex items-center text-white font-black italic">
                <Mail className="w-5 h-5 mr-3 text-amber-400" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {isLoading && invitations.length === 0 ? (
                <div className="flex justify-center p-12 text-amber-400"><Loader2 className="animate-spin" /></div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                  <Mail className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] italic">No pending invitations.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invite) => (
                    <div key={invite.id} className="p-5 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-white tracking-tight">{invite.email || invite.phoneNumber}</p>
                          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-0.5">Sent {new Date(invite.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getRoleBadge(invite.role)}
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-amber-500/20">Pending</span>
                        <button 
                          onClick={() => setDeleteTarget({ id: invite.id, type: 'invite' })}
                          className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border border-white/10 bg-emerald-500/5 backdrop-blur-xl text-white overflow-hidden relative shadow-2xl border-dashed">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <UserPlus className="w-48 h-48 text-emerald-400" />
            </div>
            <CardHeader className="relative z-10 p-8">
              <CardTitle className="flex items-center">
                Invite Staff
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 px-8 pb-8">
              <form onSubmit={handleInvite} className="space-y-6">
                {message && (
                  <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-top-2 backdrop-blur-md ${
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
                    { label: 'Manager', value: 'MANAGER' }
                  ]}
                  defaultValue="WORKER"
                />
                <Button 
                  type="submit" 
                  disabled={isInviting}
                  className="w-full py-6 mt-4"
                >
                  {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invitation'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="font-black text-white italic tracking-tight text-xl">Permissions</h4>
            </div>
            <div className="space-y-5">
              <div className="p-5 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                <p className="font-black text-[10px] uppercase tracking-widest text-blue-400 mb-2 italic">Manager</p>
                <p className="text-xs text-white/50 leading-relaxed font-bold tracking-tight">Full visibility of all farm operations and logs. Can manage staff, inventory, and sales.</p>
              </div>
              <div className="p-5 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                <p className="font-black text-[10px] uppercase tracking-widest text-emerald-400 mb-2 italic">Worker</p>
                <p className="text-xs text-white/50 leading-relaxed font-bold tracking-tight">Limited to data entry (feeding, mortality logs). Can only view their own activity records.</p>
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
        <div className="space-y-6">
          <p className="text-white/70 font-medium">
            Are you sure you want to {deleteTarget?.type === 'member' ? 'remove this member from the farm' : 'cancel this invitation'}? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isLoading}>
              Confirm Revoke
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
