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

    const invitations = await tx.invitation.findMany({
      where: { 
        farmId: activeFarmId,
        status: 'PENDING'
      }
    })

    return { members, invitations }
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
