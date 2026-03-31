'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { Role } from '@prisma/client'

export async function inviteWorker(data: { emailOrPhone: string, role: Role }) {
  try {
    const { userId, activeFarmId } = await getAuthContext()
    if (!activeFarmId) throw new Error('No active farm selected')
    
    return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
      // Ensure the current user is an OWNER or MANAGER
      const currentUser = await tx.user.findUnique({
        where: { id: userId }
      })

      if (currentUser.role === 'WORKER') {
        throw new Error('Only Owners or Managers can invite staff')
      }

      const isEmail = data.emailOrPhone.includes('@')
      const email = isEmail ? data.emailOrPhone : null
      const phone = isEmail ? null : data.emailOrPhone

      const existingInvite = await tx.invitation.findFirst({
        where: {
          farmId: activeFarmId,
          OR: isEmail ? [{ email: email }] : [{ phoneNumber: phone }]
        }
      })

      if (existingInvite) {
        if (existingInvite.status === 'ACCEPTED') {
          throw new Error('This user is already a member of the farm')
        }
        // Update role if already pending
        const invitation = await tx.invitation.update({
          where: { id: existingInvite.id },
          data: { role: data.role }
        })
        revalidatePath('/dashboard/team')
        return { success: true, invitation }
      }

      const invitation = await tx.invitation.create({
        data: {
          email: email,
          phoneNumber: phone,
          farmId: activeFarmId,
          role: data.role,
          status: 'PENDING'
        }
      })

      revalidatePath('/dashboard/team')
      return { success: true, invitation }
    })
  } catch (error: any) {
    console.error('Fatal error inviting worker:', error)
    return { success: false, error: error.message }
  }
}

export async function acceptInvitation() {
  const { userId } = await getAuthContext()
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) return null

      // Find pending invitation
      const orConditions: any[] = []
      if (user.email) orConditions.push({ email: user.email })
      if ((user as any).phoneNumber) orConditions.push({ phoneNumber: (user as any).phoneNumber })
      
      if (orConditions.length === 0) return null

      const invitation = await tx.invitation.findFirst({
        where: { 
          OR: orConditions,
          status: 'PENDING'
        }
      })

      if (!invitation) return null

      // Create farm membership
      const membership = await tx.farmMember.create({
        data: {
          farmId: invitation.farmId,
          userId: userId,
          role: invitation.role
        }
      })

      // Update invitation status
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      })

      // Update user role if it's the first time they are joining a farm as staff
      await tx.user.update({
        where: { id: userId },
        data: { role: invitation.role }
      })

      return membership
    })

    if (result) {
      return { success: true, membership: result }
    }
    
    return { success: false, error: 'No pending invitation found' }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return { success: false, error: 'Failed to accept invitation' }
  }
}

export async function getFarmMembers() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { members: [], invitations: [] }
  
  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const members = await tx.farmMember.findMany({
      where: { farmId: activeFarmId },
      include: {
        user: true
      }
    })

    // Fetch permissions separately to bypass TS errors with Prisma extension
    const permissions = await (prisma as any).userPermission.findMany({
      where: { farmId: activeFarmId }
    })

    // Map permissions back to members
    const membersWithPermissions = members.map((member: any) => ({
      ...member,
      user: {
        ...member.user,
        userPermissions: permissions.filter((p: any) => p.userId === member.userId)
      }
    }))

    const invitations = await tx.invitation.findMany({
      where: { 
        farmId: activeFarmId,
        status: 'PENDING'
      }
    })
    
    const currentUser = await tx.user.findUnique({
      where: { id: userId }
    })

    return { members: membersWithPermissions, invitations, currentUserRole: currentUser.role }
  })
}

export async function deleteMember(memberId: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    // Only Owners or Managers can delete members
    const currentUser = await tx.user.findUnique({
      where: { id: userId }
    })
    if (currentUser.role === 'WORKER') throw new Error('Unauthorized')

    await tx.farmMember.delete({
      where: { id: memberId, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/team')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting member:', error)
    return { success: false, error: error.message }
  })
}

export async function deleteInvitation(invitationId: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const currentUser = await tx.user.findUnique({
      where: { id: userId }
    })
    if (currentUser.role === 'WORKER') throw new Error('Unauthorized')

    await tx.invitation.delete({
      where: { id: invitationId, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/team')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting invitation:', error)
    return { success: false, error: error.message }
  })
}

export async function updateWorkerPermissions(targetUserId: string, permissions: any) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  // Execute within a transaction for concurrency safety and atomicity
  return await prisma.$transaction(async (tx) => {
    // Only Owners can update permissions
    const currentUser = await tx.user.findUnique({
      where: { id: userId }
    })
    
    if (!currentUser || currentUser.role !== 'OWNER') {
      throw new Error('Only Data Owners can edit granular permissions.')
    }

    // Load existing permissions to generate audit logs
    const existingPerm = await tx.userPermission.findFirst({
      where: {
        userId: targetUserId,
        farmId: activeFarmId
      }
    })

    const upserted = await tx.userPermission.upsert({
      where: {
        userId_farmId: {
          userId: targetUserId,
          farmId: activeFarmId
        }
      },
      update: {
        canViewFinance: permissions.canViewFinance ?? false,
        canEditFinance: permissions.canEditFinance ?? false,
        canViewInventory: permissions.canViewInventory ?? false,
        canEditInventory: permissions.canEditInventory ?? false,
        canViewBatches: permissions.canViewBatches ?? false,
        canEditBatches: permissions.canEditBatches ?? false,
      },
      create: {
        userId: targetUserId,
        farmId: activeFarmId,
        canViewFinance: permissions.canViewFinance ?? false,
        canEditFinance: permissions.canEditFinance ?? false,
        canViewInventory: permissions.canViewInventory ?? false,
        canEditInventory: permissions.canEditInventory ?? false,
        canViewBatches: permissions.canViewBatches ?? false,
        canEditBatches: permissions.canEditBatches ?? false,
      }
    })

    // Compare fields and generate audit logs
    const fieldsToAudit = [
      'canViewFinance', 'canEditFinance',
      'canViewInventory', 'canEditInventory',
      'canViewBatches', 'canEditBatches'
    ]

    for (const field of fieldsToAudit) {
      const oldVal = (existingPerm as any)?.[field] ?? false
      const newVal = (upserted as any)[field]
      
      if (oldVal !== newVal) {
        await tx.auditLog.create({
          data: {
            tableName: 'user_permissions',
            recordId: upserted.id,
            attributeName: field,
            oldValue: String(oldVal),
            newValue: String(newVal),
            reason: `Permission '${field}' updated by Owner`,
            userId: userId,
            farmId: activeFarmId
          }
        })
      }
    }

    revalidatePath('/dashboard/team')
    revalidatePath('/dashboard')
    
    return { success: true, permissions: upserted }
  }).catch((error: any) => {
    if (error.code === 'P2002' || error.code === 'P2034') {
      return { success: false, error: 'Database is busy. Please try again in a few seconds.' }
    }
    console.error('Error updating permissions:', error)
    return { success: false, error: error.message }
  })
}

/**
 * Hardened permission checker.
 * Fetches user role and permission record directly from database on every call
 * to ensure that stale session/JWT data never allows unauthorized access.
 */
export async function checkWorkerPermissions(module: 'finance' | 'inventory' | 'batches', action: 'view' | 'edit') {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return false
  
  try {
    // FORCE fresh database fetch for role (Cache-Busting)
    const userinfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (!userinfo) return false
    
    // 1. OWNER Bypass - Always bypasses granular checks
    if (userinfo.role === 'OWNER') {
      return true
    }
    
    // 2. Load Granular Permissions (FORCE fresh DB fetch)
    const perm = await prisma.userPermission.findFirst({
      where: {
        userId: userId,
        farmId: activeFarmId
      }
    })
    
    // 3. Apply overrides if record exists
    if (perm) {
      if (module === 'finance') return action === 'view' ? perm.canViewFinance : perm.canEditFinance
      if (module === 'inventory') return action === 'view' ? perm.canViewInventory : perm.canEditInventory
      if (module === 'batches') return action === 'view' ? perm.canViewBatches : perm.canEditBatches
    }
    
    // 4. Default State (No Record Found)
    // Managers bypass by default. Workers are View-Only by default.
    if (userinfo.role === 'MANAGER') return true
    if (userinfo.role === 'WORKER') return action === 'view'
    
    return false
  } catch (error) {
    console.error('Permission check failed:', error)
    return false
  }
}
