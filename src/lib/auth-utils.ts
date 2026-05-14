import { auth } from '@/auth'
import prisma from '@/lib/db'

export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 0 and doesn't have a country code, assume +233 (Ghana) as default for this app
  // or just leave it as is if it's already got a +.
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = '+233' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.length >= 9) {
    // If it's 9+ digits and no +, prepend +
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}


export async function getAuthContext() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  
  const userId = session.user.id
  let activeFarmId = (session.user as any).activeFarmId
  if (activeFarmId && typeof activeFarmId === 'string') {
    activeFarmId = parseInt(activeFarmId, 10);
  }

  if (!activeFarmId) {
    const farm = await prisma.farm.findFirst({
      where: {
        OR: [
          { userId: userId },
          { members: { some: { userId: userId } } }
        ]
      }
    })
    
    if (farm) {
      activeFarmId = farm.id
    }
  }

  // Fetch the actual current role for this farm context
  let role = (session.user as any).role || 'WORKER';
  let permissions = null;

  if (activeFarmId) {
    const membership = await prisma.farmMember.findFirst({
      where: { farmId: activeFarmId, userId: userId }
    });
    if (membership) {
      role = membership.role;
    }

    permissions = await prisma.userPermission.findUnique({
      where: { userId_farmId: { userId, farmId: activeFarmId } }
    });
  }

  return { userId, activeFarmId, role, permissions }
}

export function hasPermission(role: string, permissions: any, action: string): boolean {
  if (role === 'OWNER' || role === 'MANAGER') return true;

  switch (action) {
    case 'VIEW_FINANCE':
      return role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER' || !!permissions?.canViewFinance;
    case 'EDIT_FINANCE':
      return role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER' || !!permissions?.canEditFinance;
    case 'VIEW_INVENTORY':
      return role === 'MANAGER' || role === 'WORKER' || !!permissions?.canViewInventory;
    case 'EDIT_INVENTORY':
      return role === 'MANAGER' || role === 'WORKER' || !!permissions?.canEditInventory;
    case 'VIEW_BATCHES':
      return true; // Everyone can see livestock?
    case 'EDIT_BATCHES':
      return role === 'MANAGER' || role === 'WORKER' || !!permissions?.canEditBatches;
    case 'VIEW_SALES':
      return role === 'CASHIER' || role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER' || !!permissions?.canViewSales;
    case 'EDIT_SALES':
      return role === 'CASHIER' || role === 'FINANCE_OFFICER' || !!permissions?.canEditSales;
    case 'VIEW_CUSTOMERS':
      return role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER' || role === 'CASHIER' || !!permissions?.canViewCustomers;
    case 'EDIT_CUSTOMERS':
      return role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER' || !!permissions?.canEditCustomers;
    case 'VIEW_EGGS':
      return !!permissions?.canViewEggs;
    case 'EDIT_EGGS':
      return !!permissions?.canEditEggs;
    case 'VIEW_FEEDING':
      return !!permissions?.canViewFeeding;
    case 'EDIT_FEEDING':
      return !!permissions?.canEditFeeding;
    case 'VIEW_HOUSES':
      return !!permissions?.canViewHouses;
    case 'EDIT_HOUSES':
      return !!permissions?.canEditHouses;
    case 'VIEW_MORTALITY':
      return !!permissions?.canViewMortality;
    case 'EDIT_MORTALITY':
      return !!permissions?.canEditMortality;
    case 'VIEW_TEAM':
      return !!permissions?.canViewTeam;
    case 'EDIT_TEAM':
      return !!permissions?.canEditTeam;
    default:
      return false;
  }
}

/**
 * Records a user session in the database for auditing and multi-tenant tracking.
 * Used by both the Next.js web app and external clients (Flutter Desktop/Mobile).
 */
export async function recordUserSession(userId: string, deviceType: string = 'Web') {
  try {
    const farmMember = await prisma.farmMember.findFirst({
      where: { userId },
      select: { farmId: true }
    });

    return await prisma.session.create({
      data: {
        userId,
        farmId: farmMember?.farmId || null,
        loginTime: new Date(),
        deviceType,
        sessionToken: `tracking_${Date.now()}_${userId}_${Math.random().toString(36).substring(7)}`,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });
  } catch (err) {
    console.error('[recordUserSession] Failed to record session:', err);
    return null;
  }
}
