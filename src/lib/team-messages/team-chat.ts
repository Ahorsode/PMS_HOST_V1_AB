import prisma, { type DbTransactionClient } from '@/lib/db'
import { getAuthContext } from '@/lib/auth-utils'
import { getFarmStaffAccess } from '@/lib/subscription-utils'
import { teamPersonName, teamRoleLabel } from './shared'

/** Most recent messages loaded into a chat. */
const THREAD_MESSAGE_LIMIT = 200

const PERSON_SELECT = { id: true, firstname: true, surname: true, name: true, phoneNumber: true, email: true } as const

export type TeamChatViewer = {
  userId: string
  farmId: string
  isOwner: boolean
  ownerUserId: string
  ownerName: string
}

export type TeamChatRow = {
  memberUserId: string
  name: string
  roleLabel: string
  /** Owner can't message them: seat paused, over the plan limit, or removed from the team. */
  status: 'active' | 'paused' | 'removed'
  lastMessage: { body: string; createdAt: Date; fromMe: boolean } | null
  unread: number
}

export type TeamChatThread = {
  memberUserId: string
  other: { name: string; roleLabel: string }
  messages: { id: string; body: string; createdAt: Date; fromMe: boolean }[]
  canSend: boolean
  cantSendReason: string | null
  viewerIsOwner: boolean
}

/** Who is looking, and the farm owner on the other side of every chat. */
export async function getTeamChatViewer(): Promise<TeamChatViewer | null> {
  const { userId, activeFarmId, isFarmOwner } = await getAuthContext()
  if (!activeFarmId) return null
  const farm = await prisma.farm.findUnique({
    where: { id: activeFarmId },
    select: { userId: true, user: { select: PERSON_SELECT } },
  })
  if (!farm) return null
  return { userId, farmId: activeFarmId, isOwner: isFarmOwner, ownerUserId: farm.userId, ownerName: teamPersonName(farm.user) }
}

function inFarmContext<T>(viewer: TeamChatViewer, fn: (tx: DbTransactionClient) => Promise<T>): Promise<T> {
  return prisma.$withFarmContext(viewer.userId, viewer.farmId, fn)
}

async function unreadFor(tx: DbTransactionClient, conversationId: string, viewerUserId: string, lastReadAt: Date | null) {
  return tx.teamMessage.count({
    where: {
      conversationId,
      senderUserId: { not: viewerUserId },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  })
}

/** Owner's list of chats: every team member, plus past members with history. Latest activity first. */
export async function getTeamChatList(viewer: TeamChatViewer): Promise<TeamChatRow[]> {
  if (!viewer.isOwner) return []
  const { locked } = await getFarmStaffAccess(viewer.farmId)

  return inFarmContext(viewer, async (tx) => {
    const [members, conversations] = await Promise.all([
      tx.farmMember.findMany({
        where: { farmId: viewer.farmId, userId: { not: viewer.ownerUserId } },
        select: { userId: true, role: true, user: { select: PERSON_SELECT } },
      }),
      tx.teamConversation.findMany({
        where: { farmId: viewer.farmId },
        select: {
          id: true,
          memberUserId: true,
          ownerLastReadAt: true,
          member: { select: PERSON_SELECT },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, createdAt: true, senderUserId: true } },
        },
      }),
    ])

    const unread = await Promise.all(
      conversations.map((c) => unreadFor(tx, c.id, viewer.userId, c.ownerLastReadAt)),
    )
    const byMember = new Map(conversations.map((c, i) => [c.memberUserId, { ...c, unread: unread[i] }]))

    const rows: TeamChatRow[] = members.map((member) => {
      const conversation = byMember.get(member.userId)
      const last = conversation?.messages[0]
      return {
        memberUserId: member.userId,
        name: teamPersonName(member.user),
        roleLabel: teamRoleLabel(member.role),
        status: locked.has(member.userId) ? 'paused' : 'active',
        lastMessage: last ? { body: last.body, createdAt: last.createdAt, fromMe: last.senderUserId === viewer.userId } : null,
        unread: conversation?.unread ?? 0,
      }
    })

    const memberIds = new Set(members.map((m) => m.userId))
    for (const conversation of conversations) {
      const last = conversation.messages[0]
      if (memberIds.has(conversation.memberUserId) || !last) continue
      rows.push({
        memberUserId: conversation.memberUserId,
        name: teamPersonName(conversation.member),
        roleLabel: 'Former member',
        status: 'removed',
        lastMessage: { body: last.body, createdAt: last.createdAt, fromMe: last.senderUserId === viewer.userId },
        unread: byMember.get(conversation.memberUserId)?.unread ?? 0,
      })
    }

    return rows.sort((a, b) => {
      const at = a.lastMessage?.createdAt.getTime() ?? 0
      const bt = b.lastMessage?.createdAt.getTime() ?? 0
      return bt - at || a.name.localeCompare(b.name)
    })
  })
}

/**
 * The chat between the owner and one team member, marked as read for the viewer.
 * Staff always get their own chat with the owner; `memberUserId` is ignored for them.
 * Returns null when the viewer may not see that chat.
 */
export async function getTeamChatThread(viewer: TeamChatViewer, memberUserId?: string | null): Promise<TeamChatThread | null> {
  const targetId = viewer.isOwner ? memberUserId : viewer.userId
  if (!targetId || targetId === viewer.ownerUserId) return null
  const locked = viewer.isOwner ? (await getFarmStaffAccess(viewer.farmId)).locked : new Set<string>()

  return inFarmContext(viewer, async (tx) => {
    const [membership, conversation] = await Promise.all([
      tx.farmMember.findUnique({
        where: { farmId_userId: { farmId: viewer.farmId, userId: targetId } },
        select: { role: true, user: { select: PERSON_SELECT } },
      }),
      tx.teamConversation.findUnique({
        where: { farmId_memberUserId: { farmId: viewer.farmId, memberUserId: targetId } },
        select: {
          id: true,
          member: { select: PERSON_SELECT },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: THREAD_MESSAGE_LIMIT,
            select: { id: true, body: true, createdAt: true, senderUserId: true },
          },
        },
      }),
    ])
    if (!membership && !conversation) return null
    if (!viewer.isOwner && !membership) return null

    if (conversation) {
      await tx.teamConversation.update({
        where: { id: conversation.id },
        data: viewer.isOwner ? { ownerLastReadAt: new Date() } : { memberLastReadAt: new Date() },
      })
    }

    let cantSendReason: string | null = null
    if (viewer.isOwner && !membership) cantSendReason = 'This person is no longer on your team.'
    else if (viewer.isOwner && locked.has(targetId)) cantSendReason = "This person's access is paused, so they can't read new messages."

    return {
      memberUserId: targetId,
      other: viewer.isOwner
        ? { name: teamPersonName(membership?.user ?? conversation?.member), roleLabel: membership ? teamRoleLabel(membership.role) : 'Former member' }
        : { name: viewer.ownerName, roleLabel: 'Owner' },
      messages: (conversation?.messages ?? [])
        .map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, fromMe: m.senderUserId === viewer.userId }))
        .reverse(),
      canSend: cantSendReason === null,
      cantSendReason,
      viewerIsOwner: viewer.isOwner,
    }
  })
}

/** Unread team messages for the viewer, across all their chats. */
export async function getTeamUnreadCount(viewer: TeamChatViewer): Promise<number> {
  return inFarmContext(viewer, async (tx) => {
    const conversations = await tx.teamConversation.findMany({
      where: viewer.isOwner ? { farmId: viewer.farmId } : { farmId: viewer.farmId, memberUserId: viewer.userId },
      select: { id: true, ownerLastReadAt: true, memberLastReadAt: true },
    })
    const counts = await Promise.all(
      conversations.map((c) => unreadFor(tx, c.id, viewer.userId, viewer.isOwner ? c.ownerLastReadAt : c.memberLastReadAt)),
    )
    return counts.reduce((sum, n) => sum + n, 0)
  }).catch(() => 0)
}
