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
      return role === 'MANAGER' || !!permissions?.canEditInventory;
    case 'VIEW_BATCHES':
      return true; // Everyone can see livestock?
    case 'EDIT_BATCHES':
      return role === 'MANAGER' || role === 'WORKER' || !!permissions?.canEditBatches;
    case 'VIEW_SALES':
      return role === 'CASHIER' || role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER' || !!permissions?.canViewFinance;
    case 'EDIT_SALES':
      return role === 'CASHIER' || role === 'FINANCE_OFFICER' || !!permissions?.canEditFinance;
    default:
      return false;
  }
}
