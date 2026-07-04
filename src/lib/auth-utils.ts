import { auth } from '@/auth'
import prisma from '@/lib/db'

export const SECURITY_PERMISSION_UPDATE_MESSAGE = 'Your security permissions have been updated. Please sign in again to activate your new features.'

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
  const sessionUser = session.user as any

  if (sessionUser.securityInvalidated) {
    throw new Error(`SESSION_REVOKED: ${sessionUser.securityNotice || SECURITY_PERMISSION_UPDATE_MESSAGE}`)
  }

  const activeFarmIdFromSession = (session.user as any).activeFarmId as string | undefined

  const data = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      sessionVersion: true,
      securityNotice: true,
      farms: {
        select: { id: true }
      },
      memberships: {
        select: {
          farmId: true,
          role: true
        }
      },
      userPermissions: true
    }
  })

  if (!data) {
    throw new Error('Unauthorized')
  }

  if (typeof sessionUser.sessionVersion === 'number' && sessionUser.sessionVersion < data.sessionVersion) {
    throw new Error(`SESSION_REVOKED: ${data.securityNotice || SECURITY_PERMISSION_UPDATE_MESSAGE}`)
  }

  const activeFarmId =
    activeFarmIdFromSession ||
    data.farms[0]?.id ||
    data.memberships[0]?.farmId

  const membership = activeFarmId
    ? data.memberships.find((item) => item.farmId === activeFarmId)
    : null
  const permissions = activeFarmId
    ? data.userPermissions.find((item) => item.farmId === activeFarmId) || null
    : null
  const isFarmOwner = !!activeFarmId && data.farms.some((farm) => farm.id === activeFarmId)
  const role = membership?.role || (isFarmOwner ? 'OWNER' : (data.role === 'OWNER' ? 'WORKER' : data.role || sessionUser.role || 'WORKER'))

  return { userId, activeFarmId, role, permissions, isFarmOwner }
}

export function hasPermission(role: string, permissions: any, action: string): boolean {
  if (role === 'OWNER' || role === 'MANAGER') return true;

  switch (action) {
    case 'VIEW_FINANCE':
      return !!permissions?.canViewFinance || !!permissions?.canEditFinance;
    case 'EDIT_FINANCE':
      return !!permissions?.canEditFinance;
    case 'VIEW_INVENTORY':
      return !!permissions?.canViewInventory || !!permissions?.canEditInventory;
    case 'EDIT_INVENTORY':
      return !!permissions?.canEditInventory;
    case 'VIEW_BATCHES':
      return !!permissions?.canViewBatches || !!permissions?.canEditBatches;
    case 'EDIT_BATCHES':
      return !!permissions?.canEditBatches;
    case 'VIEW_SALES':
      return !!permissions?.canViewSales || !!permissions?.canEditSales;
    case 'EDIT_SALES':
      return !!permissions?.canEditSales;
    case 'VIEW_CUSTOMERS':
      return !!permissions?.canViewCustomers || !!permissions?.canEditCustomers;
    case 'EDIT_CUSTOMERS':
      return !!permissions?.canEditCustomers;
    case 'VIEW_EGGS':
      return !!permissions?.canViewEggs || !!permissions?.canEditEggs;
    case 'EDIT_EGGS':
      return !!permissions?.canEditEggs;
    case 'VIEW_FEEDING':
      return !!permissions?.canViewFeeding || !!permissions?.canEditFeeding;
    case 'EDIT_FEEDING':
      return !!permissions?.canEditFeeding;
    case 'VIEW_HOUSES':
      return !!permissions?.canViewHouses || !!permissions?.canEditHouses;
    case 'EDIT_HOUSES':
      return !!permissions?.canEditHouses;
    case 'VIEW_MORTALITY':
      return !!permissions?.canViewMortality || !!permissions?.canEditMortality;
    case 'EDIT_MORTALITY':
      return !!permissions?.canEditMortality;
    case 'VIEW_HEALTH':
      return !!permissions?.canViewHealth || !!permissions?.canEditHealth;
    case 'EDIT_HEALTH':
      return !!permissions?.canEditHealth;
    case 'VIEW_TEAM':
      return !!permissions?.canViewTeam || !!permissions?.canEditTeam;
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
