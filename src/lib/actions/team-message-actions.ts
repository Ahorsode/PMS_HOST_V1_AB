'use server'

import { revalidatePath } from 'next/cache'
import prisma, { type DbTransactionClient } from '@/lib/db'
import { checkRateLimit } from '@/lib/performance/rate-limit'
import { getFarmStaffAccess } from '@/lib/subscription-utils'
import { normalizeTeamMessage } from '@/lib/team-messages/shared'
import { getTeamChatViewer, type TeamChatViewer } from '@/lib/team-messages/team-chat'

export type TeamMessageFormState = { ok: boolean; error: string | null; sentAt: number | null }

const fail = (error: string): TeamMessageFormState => ({ ok: false, error, sentAt: null })

async function postMessage(tx: DbTransactionClient, viewer: TeamChatViewer, memberUserId: string, body: string) {
  const now = new Date()
  const readField = viewer.isOwner ? 'ownerLastReadAt' : 'memberLastReadAt'
  const conversation = await tx.teamConversation.upsert({
    where: { farmId_memberUserId: { farmId: viewer.farmId, memberUserId } },
    create: { farmId: viewer.farmId, memberUserId, lastMessageAt: now, [readField]: now },
    update: { lastMessageAt: now, [readField]: now },
    select: { id: true },
  })
  await tx.teamMessage.create({
    data: { conversationId: conversation.id, farmId: viewer.farmId, senderUserId: viewer.userId, body, createdAt: now },
  })
}

type SendStart = { ok: true; viewer: TeamChatViewer; body: string } | { ok: false; error: string }

async function startSend(formData: FormData): Promise<SendStart> {
  const viewer = await getTeamChatViewer().catch(() => null)
  if (!viewer) return { ok: false, error: 'Sign in to a farm to send messages.' }

  const parsed = normalizeTeamMessage(formData.get('body'))
  if (!parsed.ok) return { ok: false, error: parsed.error }

  const rateLimit = await checkRateLimit({ policy: 'team.message', scope: 'sendTeamMessage', farmId: viewer.farmId, userId: viewer.userId })
  if (!rateLimit.ok) return { ok: false, error: 'You are sending messages too quickly. Wait a moment and try again.' }

  return { ok: true, viewer, body: parsed.body }
}

/** Sends one message: owner to a team member, or a team member to the owner. */
export async function sendTeamMessage(_prev: TeamMessageFormState, formData: FormData): Promise<TeamMessageFormState> {
  const started = await startSend(formData)
  if (!started.ok) return fail(started.error)
  const { viewer, body } = started

  let memberUserId = viewer.userId
  if (viewer.isOwner) {
    const target = formData.get('memberUserId')
    if (typeof target !== 'string' || !target || target === viewer.ownerUserId) return fail('Choose who to message.')
    const [membership, { locked }] = await Promise.all([
      prisma.farmMember.findUnique({ where: { farmId_userId: { farmId: viewer.farmId, userId: target } }, select: { id: true } }),
      getFarmStaffAccess(viewer.farmId),
    ])
    if (!membership) return fail('This person is no longer on your team.')
    if (locked.has(target)) return fail("This person's access is paused, so they can't read new messages.")
    memberUserId = target
  }

  try {
    await prisma.$withFarmContext(viewer.userId, viewer.farmId, (tx: DbTransactionClient) => postMessage(tx, viewer, memberUserId, body))
  } catch (error) {
    console.error('Failed to send team message:', error)
    return fail('Message not sent. Check your connection and try again.')
  }

  revalidatePath('/dashboard/inbox', 'layout')
  return { ok: true, error: null, sentAt: Date.now() }
}

/** Owner only: sends the same message to every team member who currently has access. */
export async function sendTeamBroadcast(_prev: TeamMessageFormState, formData: FormData): Promise<TeamMessageFormState> {
  const started = await startSend(formData)
  if (!started.ok) return fail(started.error)
  const { viewer, body } = started
  if (!viewer.isOwner) return fail('Only the farm owner can message the whole team.')

  const [members, { locked }] = await Promise.all([
    prisma.farmMember.findMany({
      where: { farmId: viewer.farmId, userId: { not: viewer.ownerUserId } },
      select: { userId: true },
    }),
    getFarmStaffAccess(viewer.farmId),
  ])
  const recipients = members.map((m) => m.userId).filter((id) => !locked.has(id))
  if (recipients.length === 0) return fail('No one on your team can receive messages right now.')

  try {
    await prisma.$withFarmContext(viewer.userId, viewer.farmId, async (tx: DbTransactionClient) => {
      for (const memberUserId of recipients) await postMessage(tx, viewer, memberUserId, body)
    })
  } catch (error) {
    console.error('Failed to send team broadcast:', error)
    return fail('Message not sent. Check your connection and try again.')
  }

  revalidatePath('/dashboard/inbox', 'layout')
  return { ok: true, error: null, sentAt: Date.now() }
}
