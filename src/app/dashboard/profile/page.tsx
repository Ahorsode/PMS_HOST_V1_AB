import React from 'react';
import { getAuthContext } from '@/lib/auth-utils';
import prisma from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { User, Mail, Shield, Building, Crown, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default async function ProfilePage() {
  const { userId, activeFarmId } = await getAuthContext();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { farmId: activeFarmId },
        include: { farm: true }
      }
    }
  });

  const membership = user?.memberships[0];
  const farm = membership?.farm;

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 py-12">
      <div className="relative group">
         <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-amber-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
         <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8 shadow-2xl">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
               <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center border-4 border-black">
                  <User className="w-16 h-16 text-emerald-500" />
               </div>
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2">
               <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                  <h1 className="text-4xl font-black text-white tracking-tighter">{user?.name || 'Farm User'}</h1>
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full h-fit flex items-center gap-1.5 self-center">
                     <Shield className="w-3 h-3" /> {membership?.role || 'Member'}
                  </span>
               </div>
               <p className="text-white/60 font-medium flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" /> {user?.email}
               </p>
               <p className="text-amber-500/80 font-bold text-xs uppercase tracking-[0.2em] pt-2">
                  Member since {user?.createdAt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
               </p>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
               <Button asChild className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl h-12 px-6 backdrop-blur-md">
                  <Link href="/dashboard/settings">
                     <SettingsIcon className="w-4 h-4 mr-2" /> Edit Profile
                  </Link>
               </Button>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Subscription Status Card */}
         <Card className="bg-black/20 border-white/5 overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all"></div>
            <CardHeader className="border-b border-white/5 bg-white/[0.02]">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <Crown className="w-4 h-4" /> Global License
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 pb-10 flex flex-col items-center text-center space-y-6">
               <div className="space-y-1">
                  <p className="text-3xl font-black text-white tracking-tighter uppercase">{farm?.subscriptionTier || 'Free Trial'}</p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Plan Subscription</p>
               </div>
               
               <div className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                     <span className="text-white/40">Next Billing</span>
                     <span className="text-amber-400">May 12, 2026</span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-emerald-500 h-full w-[65%]" />
                  </div>
               </div>

               <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase tracking-widest rounded-2xl h-14">
                  <Link href="/dashboard/settings?tab=billing">Manage Subscription</Link>
               </Button>
            </CardContent>
         </Card>

         {/* Farm Organization Card */}
         <Card className="bg-black/20 border-white/5 overflow-hidden group">
            <CardHeader className="border-b border-white/5 bg-white/[0.02]">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <Building className="w-4 h-4" /> Farm Organization
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 pb-10 space-y-6">
               <div className="space-y-4">
                  <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Building className="w-5 h-5 text-blue-400" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Entity Name</p>
                        <p className="text-lg font-black text-white">{farm?.name}</p>
                     </div>
                  </div>

                  <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-amber-400" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Location</p>
                        <p className="text-sm font-medium text-white/80">{farm?.location || 'Not Specified'}</p>
                     </div>
                  </div>
               </div>

               <div className="pt-4 border-t border-white/5 flex gap-4">
                  <div className="flex-1 text-center bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                     <p className="text-xs font-black text-white leading-none">2.4k</p>
                     <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter mt-1">Total Birds</p>
                  </div>
                  <div className="flex-1 text-center bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                     <p className="text-xs font-black text-white leading-none">12</p>
                     <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter mt-1">Active Units</p>
                  </div>
                  <div className="flex-1 text-center bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                     <p className="text-xs font-black text-white leading-none">4</p>
                     <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter mt-1">Staff Members</p>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
