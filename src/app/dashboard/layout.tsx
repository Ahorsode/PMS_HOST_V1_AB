import React from 'react';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { redirect } from 'next/navigation';
import { SidebarWrapper } from '@/components/layout/SidebarWrapper';
import { acceptInvitation } from '@/lib/actions/staff-actions';
import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  let dbUser = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!dbUser) {
    redirect('/login');
  }

  let farm = await prisma.farm.findFirst({
    where: { 
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } }
      ]
    }
  });

  if (!farm) {
    // Check if they were invited and accept it automatically!
    const inviteCheck = await acceptInvitation(false);
    if (inviteCheck?.success) {
      // Force a hard redirect to clear caches and allow DB replication to catch up
      redirect('/dashboard');
    }
  }

  if (!farm && dbUser?.role === 'OWNER') {
    redirect('/onboarding');
  }

  if (!farm && dbUser?.role !== 'OWNER') {
    const identifier = dbUser?.email || (dbUser as any)?.phoneNumber || 'your account';
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/20 backdrop-blur-xl text-white p-7">
        <div className="glass-morphism p-11 rounded-lg text-center max-w-md">
           <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <XCircle className="w-10 h-10 text-red-500" />
           </div>
           <h2 className="text-2xl font-bold mb-3 uppercase tracking-widest text-red-400">Access Restricted</h2>
           <p className="opacity-70 leading-relaxed font-medium mb-6">
             You are not currently linked to any farm. We checked for invitations sent to <span className="text-emerald-400 font-bold underline">{identifier}</span>.
           </p>
           <p className="text-xs text-white/40 italic">
             Please contact your farm administrator to verify which email or phone number was used for your invitation.
           </p>
           <div className="mt-8">
              <Link href="/login" className="text-emerald-400 font-bold uppercase tracking-widest text-xs hover:underline">
                Try Logging in with a different account
              </Link>
           </div>
        </div>
      </div>
    );
  }

  // If user has a farm but no name yet (invited member on first login), redirect to profile setup
  if (farm && !dbUser?.firstname && dbUser?.role !== 'OWNER') {
    const currentPath = '/dashboard';
    // Only redirect if not already on the profile page to avoid loops
    redirect('/onboarding/profile');
  }

  let userPermissions = null;
  if (farm && dbUser?.id) {
    userPermissions = await (prisma as any).userPermission.findUnique({
      where: {
        userId_farmId: {
          userId: dbUser.id,
          farmId: farm.id
        }
      }
    });
  }

  return (
    <SidebarWrapper role={dbUser?.role as any} permissions={userPermissions}>
      <div className="md:hidden sticky top-[-1.5rem] z-40 -mx-4 mb-5 px-3 py-2 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <h1 className="text-sm font-bold text-emerald-400 tracking-widest uppercase truncate">
          {farm?.name || "My Farm"}
        </h1>
      </div>
      {children}
    </SidebarWrapper>
  );
}
