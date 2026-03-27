import React from 'react';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { redirect } from 'next/navigation';
import { SidebarWrapper } from '@/components/layout/SidebarWrapper';
import { acceptInvitation } from '@/lib/actions/staff-actions';

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
    const inviteCheck = await acceptInvitation();
    if (inviteCheck?.success) {
      // Re-fetch everything to ensure roles and farms are populated accurately.
      dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
      farm = await prisma.farm.findFirst({
        where: { members: { some: { userId: session.user.id } } }
      });
    }
  }

  if (!farm && dbUser?.role === 'OWNER') {
    redirect('/onboarding');
  }

  if (!farm && dbUser?.role !== 'OWNER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/20 backdrop-blur-xl text-white p-8">
        <div className="glass-morphism p-12 rounded-3xl text-center max-w-md">
           <h2 className="text-2xl font-black mb-4 uppercase tracking-widest text-emerald-400">Access Restricted</h2>
           <p className="opacity-70 leading-relaxed font-medium">You are not currently linked to any farm. Please contact your administrator to receive an invitation.</p>
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

  return (
    <SidebarWrapper role={dbUser?.role as any}>
      {children}
    </SidebarWrapper>
  );
}
