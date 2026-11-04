import React from 'react';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { redirect } from 'next/navigation';
import { SidebarWrapper } from '@/components/layout/SidebarWrapper';
import { acceptInvitation } from '@/lib/actions/staff-actions';
import { hasAcceptedCurrentTerms } from '@/lib/legal-acceptance';
import { resolveFarmNavigationRole } from '@/lib/navigation-permissions';
import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { getFarmStaffAccess } from '@/lib/subscription-utils';
import { PlanAccessGate } from '@/components/billing/PlanAccessGate';
import { AccessBlocked } from '@/components/billing/AccessBlocked';
import { DashboardNotices } from '@/components/site/DashboardNotices';
import { MaintenanceProvider } from '@/components/site/MaintenanceContext';
import { getAppSettings } from '@/lib/settings/app-settings';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  let dbUser: Awaited<ReturnType<typeof prisma.user.findUnique>>;
  let farm: Awaited<ReturnType<typeof prisma.farm.findFirst>>;
  let acceptedTerms = true;

  try {
    [dbUser, farm, acceptedTerms] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id }
      }),
      prisma.farm.findFirst({
        where: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } }
          ]
        }
      }),
      hasAcceptedCurrentTerms(session.user.id),
    ]);
  } catch (error) {
    console.error('[DashboardLayout] Database error:', error);
    redirect('/login?error=db');
  }

  // If the session references a deleted or non-existent user, stop before
  // passing an undefined role into the client navigation shell.
  if (!dbUser) {
    redirect('/login?error=user_not_found');
  }

  // Everyone accepts the current Terms and Privacy Policy once, including
  // Google sign-ups, invited staff and accounts created before the terms.
  if (!acceptedTerms) {
    redirect('/onboarding/terms');
  }

  const isPlaceholder = farm && farm.capacity === 0 && farm.location === '';

  if (!farm || isPlaceholder) {
    if (!farm) {
      // Check if they were invited and accept it automatically!
      let inviteCheck: { success?: boolean } | null = null;
      try {
        inviteCheck = await acceptInvitation(false);
      } catch (error) {
        console.error('[DashboardLayout] Invitation check failed:', error);
      }

      if (inviteCheck?.success) {
        // Force a hard redirect to clear caches and allow DB replication to catch up
        redirect('/dashboard');
      }
    }

    if (dbUser?.role === 'OWNER') {
      redirect('/onboarding');
    }
  }

  if ((!farm || isPlaceholder) && dbUser?.role !== 'OWNER') {
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
    redirect('/onboarding/profile');
  }

  let userPermissions = null;
  let membershipRole: string | null = null;
  if (farm && dbUser.id) {
    try {
      const [permissions, membership] = await Promise.all([
        (prisma as any).userPermission.findUnique({
          where: {
            userId_farmId: {
              userId: dbUser.id,
              farmId: farm.id,
            },
          },
        }),
        prisma.farmMember.findUnique({
          where: {
            farmId_userId: {
              farmId: farm.id,
              userId: dbUser.id,
            },
          },
          select: { role: true },
        }),
      ]);
      userPermissions = permissions;
      membershipRole = membership?.role ?? null;
    } catch (error) {
      console.error('[DashboardLayout] Permission lookup failed:', error);
      userPermissions = null;
    }
  }

  // Plan access: owners are steered to the payment page once locked; staff
  // are blocked when the farm is locked or their seat is paused/over limit.
  const isOwner = !!farm && farm.userId === dbUser.id;
  const staffAccess = farm ? await getFarmStaffAccess(farm.id) : null;

  if (farm && staffAccess && !isOwner) {
    if (staffAccess.access.state === 'LOCKED') {
      return (
        <AccessBlocked
          title="Farm Plan Ended"
          message={`${farm.name}'s plan has ended. Ask the farm owner to renew it to get access again.`}
        />
      );
    }
    if (staffAccess.locked.has(dbUser.id)) {
      return (
        <AccessBlocked
          title="Access Paused"
          message={`Your access to ${farm.name} is paused because the farm's plan has no free staff seat. Ask the farm owner to restore your access.`}
        />
      );
    }
  }

  const planStatus = staffAccess
    ? {
        state: staffAccess.access.state,
        isTrial: staffAccess.access.isTrial,
        endsAt: staffAccess.access.endsAt?.toISOString() ?? null,
        graceEndsAt: staffAccess.access.graceEndsAt?.toISOString() ?? null,
      }
    : null;

  const navigationRole = farm
    ? resolveFarmNavigationRole({
        farmOwnerId: farm.userId,
        userId: dbUser.id,
        userRole: dbUser.role,
        membershipRole,
      })
    : dbUser.role;

  const { maintenance } = await getAppSettings('system');

  const rawFarmName = (farm?.name || 'My').trim();
  const mobileFarmTitle = /\bfarms?\s*$/i.test(rawFarmName)
    ? rawFarmName
    : `${rawFarmName} Farm`;

  return (
    <SidebarWrapper role={navigationRole} permissions={userPermissions} farmName={mobileFarmTitle}>
      <DashboardNotices
        farm={farm ? { id: farm.id, name: farm.name, createdAt: farm.createdAt } : null}
        access={staffAccess?.access ?? null}
        isOwner={isOwner}
      />
      <MaintenanceProvider message={maintenance.enabled ? maintenance.message : null}>
        {isOwner && planStatus ? <PlanAccessGate status={planStatus}>{children}</PlanAccessGate> : children}
      </MaintenanceProvider>
    </SidebarWrapper>
  );
}
