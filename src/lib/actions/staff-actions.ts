'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { Role } from '@prisma/client'

/**
 * Invites a worker to a farm.
 * Only the Absolute Owner (creator) or a Manager can invite others.
 */
export async function inviteWorker(data: { emailOrPhone: string, role: Role }) {
  try {
    const { userId, activeFarmId } = await getAuthContext()
    if (!activeFarmId) throw new Error('No active farm selected')
    
    return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
      // 1. Fetch Farm to check ownership
      const farm = await tx.farm.findUnique({
        where: { id: activeFarmId }
      })
      if (!farm) throw new Error('Farm not found')

      // 2. Fetch current user's membership role
      const membership = await tx.farmMember.findUnique({
        where: {
          farmId_userId: {
            farmId: activeFarmId,
            userId: userId
          }
        }
      })

      const isAbsoluteOwner = farm.userId === userId
      const isManager = membership?.role === 'MANAGER'

      if (!isAbsoluteOwner && !isManager) {
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

/**
 * Accepts an invitation.
 * Sets the user's role in the farm membership based on the invitation.
 */
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

      // Create farm membership with the specific role from the invitation
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

      return membership
    })

    if (result) {
      revalidatePath('/dashboard/team')
      return { success: true, membership: result }
    }
    
    return { success: false, error: 'No pending invitation found' }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return { success: false, error: 'Failed to accept invitation' }
  }
}

/**
 * Fetches all members of the farm with their contextual roles.
 */
export async function getFarmMembers() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { members: [], invitations: [], isAbsoluteOwner: false }
  
  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    // Check if current user is the absolute owner
    const farm = await tx.farm.findUnique({
      where: { id: activeFarmId }
    })
    const isAbsoluteOwner = farm?.userId === userId

    const members = await tx.farmMember.findMany({
      where: { farmId: activeFarmId },
      include: {
        user: true
      }
    })

    const permissions = await (prisma as any).userPermission.findMany({
      where: { farmId: activeFarmId }
    })

    // Map permissions and contextual roles back to members
    const membersWithContext = members.map((member: any) => ({
      ...member,
      // Overwrite the User.role with the FarmMember.role for accurate UI reporting
      user: {
        ...member.user,
        role: member.role,
        userPermissions: permissions.filter((p: any) => p.userId === member.userId)
      }
    }))

    const invitations = await tx.invitation.findMany({
      where: { 
        farmId: activeFarmId,
        status: 'PENDING'
      }
    })
    
    return { 
      members: membersWithContext, 
      invitations, 
      isAbsoluteOwner,
      currentUserRole: isAbsoluteOwner ? 'OWNER' : (members.find((m: any) => m.userId === userId)?.role || 'WORKER')
    }
  })
}

/**
 * Deletes a pending invitation.
 * Only the Absolute Owner (creator) or a Manager can cancel invitations.
 */
export async function deleteInvitation(invitationId: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const farm = await tx.farm.findUnique({ where: { id: activeFarmId } })
    const membership = await tx.farmMember.findUnique({
      where: { farmId_userId: { farmId: activeFarmId, userId } }
    })

    const isAbsoluteOwner = farm?.userId === userId
    const isManager = membership?.role === 'MANAGER'

    if (!isAbsoluteOwner && !isManager) {
      throw new Error('Unauthorized: Only Owners or Managers can cancel invitations')
    }

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

/**
 * Deletes a member from the farm.
 * Only the Absolute Owner can remove others. 
 */
export async function deleteMember(memberId: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const farm = await tx.farm.findUnique({ where: { id: activeFarmId } })
    if (farm?.userId !== userId) throw new Error('Unauthorized: Only the creator can delete members')

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

/**
 * Updates granular worker permissions.
 * STRICT: Only the Absolute Owner (Creator) can manage granular permissions.
 * INCLUDES: Audit Log tracking for every permission change.
 */
export async function updateWorkerPermissions(
  targetUserId: string,
  permissions: {
    canViewFinance?: boolean
    canEditFinance?: boolean
    canViewInventory?: boolean
    canEditInventory?: boolean
    canViewBatches?: boolean
    canEditBatches?: boolean
  }
) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Farm for Absolute Ownership Check
      const farm = await tx.farm.findUnique({
        where: { id: activeFarmId }
      })
      if (!farm) throw new Error('Farm not found')
      
      if (farm.userId !== userId) {
        throw new Error('Unauthorized: Only the farm creator can update worker permissions')
      }

      // 2. Prevent self-modification
      if (targetUserId === userId) {
        throw new Error('Cannot modify permissions for the absolute owner')
      }

      // 3. Get existing permissions for audit log comparison
      const existingPerm = await tx.userPermission.findUnique({
        where: { userId_farmId: { userId: targetUserId, farmId: activeFarmId } }
      })

      // 4. Update or Create permissions
      const updatedPerm = await tx.userPermission.upsert({
        where: { 
          userId_farmId: { 
            userId: targetUserId, 
            farmId: activeFarmId 
          } 
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
        },
        update: {
          ...permissions
        }
      })

      // 5. Audit the Auditor: Log every specific change
      const fields = [
        'canViewFinance', 'canEditFinance', 
        'canViewInventory', 'canEditInventory', 
        'canViewBatches', 'canEditBatches'
      ]

      for (const field of fields) {
        const newVal = (permissions as any)[field]
        const oldVal = (existingPerm as any)?.[field] ?? false

        if (newVal !== undefined && newVal !== oldVal) {
          await tx.auditLog.create({
            data: {
              tableName: 'user_permissions',
              recordId: updatedPerm.id,
              attributeName: field,
              oldValue: String(oldVal),
              newValue: String(newVal),
              reason: 'Administrative permission update',
              userId: userId, // The owner who made the change
              farmId: activeFarmId
            }
          })
        }
      }

      revalidatePath('/dashboard/team')
      return { success: true, permissions: updatedPerm }
    })
  } catch (error: any) {
    console.error('Permission Update Contention/Error:', error)
    if (error.code === 'P2002' || error.code === 'P2034') {
      throw new Error('Update Conflict: Another process modified this record. Please try again.')
    }
    return { success: false, error: error.message }
  }
}

/**
 * Hardened contextual permission checker.
 * Identifies role based on farm membership, not global user role.
 */
export async function checkWorkerPermissions(module: 'finance' | 'inventory' | 'batches', action: 'view' | 'edit') {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return false
  
  try {
    // 1. Fetch Farm for Absolute Ownership Check
    const farm = await prisma.farm.findUnique({
      where: { id: activeFarmId },
      select: { userId: true }
    })
    if (!farm) return false
    
    // Absolute Creator Bypass
    if (farm.userId === userId) return true
    
    // 2. Fetch Contextual Role (FarmMember)
    const membership = await prisma.farmMember.findUnique({
      where: {
        farmId_userId: {
          farmId: activeFarmId,
          userId: userId
        }
      }
    })
    if (!membership) return false
    
    // 3. Load Overrides
    const perm = await prisma.userPermission.findFirst({
      where: { userId: userId, farmId: activeFarmId }
    })
    
    if (perm) {
      if (module === 'finance') return action === 'view' ? perm.canViewFinance : perm.canEditFinance
      if (module === 'inventory') return action === 'view' ? perm.canViewInventory : perm.canEditInventory
      if (module === 'batches') return action === 'view' ? perm.canViewBatches : perm.canEditBatches
    }
    
    // 4. Fallback to Role Defaults
    if (membership.role === 'MANAGER') return true
    if (membership.role === 'WORKER') return action === 'view'
    
    return false
  } catch (error) {
    console.error('Permission check failure:', error)
    return false
  }
}
