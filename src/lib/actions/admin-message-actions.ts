'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { requirePaymentAdminAction, type ActiveAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'

export type AdminMessageRow = {
  id: string
  farmId: string | null
  farmName: string | null
  audience: 'OWNERS' | 'EVERYONE'
  title: string
  body: string
  tone: 'info' | 'warning' | 'success'
  showUntil: string | null
  withdrawnAt: string | null
  adminUsername: string
  createdAt: string
}

export type MessageActionResult = { success: true } | { success: false; error: string }

const messageSchema = z.object({
  farmId: z.string().min(1).nullable(),
  audience: z.enum(['OWNERS', 'EVERYONE']),
  title: z.string().trim().min(2, 'Add a title').max(80, 'Titles must be 80 characters or fewer'),
  body: z.string().trim().min(2, 'Write the message').max(1000, 'Messages must be 1,000 characters or fewer'),
  tone: z.enum(['info', 'warning', 'success']),
  showUntil: z
    .string()
    .nullable()
    .refine((value) => value === null || !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
})

async function requireMessenger(): Promise<ActiveAdmin | null> {
  try {
    return await requirePaymentAdminAction('farms.manage')
  } catch {
    return null
  }
}

export async function adminListMessages(): Promise<AdminMessageRow[]> {
  await requirePaymentAdminAction('farms.view')
  const messages = await prisma.farmMessage
    .findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { farm: { select: { name: true } } } })
    .catch(() => [])
  return messages.map((message) => ({
    id: message.id,
    farmId: message.farmId,
    farmName: message.farm?.name ?? null,
    audience: message.audience === 'EVERYONE' ? 'EVERYONE' : 'OWNERS',
    title: message.title,
    body: message.body,
    tone: message.tone === 'warning' || message.tone === 'success' ? message.tone : 'info',
    showUntil: message.showUntil?.toISOString() ?? null,
    withdrawnAt: message.withdrawnAt?.toISOString() ?? null,
    adminUsername: message.adminUsername,
    createdAt: message.createdAt.toISOString(),
  }))
}

/** Sends an in-app message to one farm or to every farm; it shows on their dashboard. */
export async function adminSendMessage(input: z.input<typeof messageSchema>): Promise<MessageActionResult> {
  const admin = await requireMessenger()
  if (!admin) return { success: false, error: 'Your admin role cannot send messages' }

  const parsed = messageSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the message' }
  const data = parsed.data

  let farmName: string | null = null
  if (data.farmId) {
    const farm = await prisma.farm.findUnique({ where: { id: data.farmId }, select: { name: true } })
    if (!farm) return { success: false, error: 'Farm not found' }
    farmName = farm.name
  }

  const message = await prisma.farmMessage.create({
    data: {
      farmId: data.farmId,
      audience: data.audience,
      title: data.title,
      body: data.body,
      tone: data.tone,
      showUntil: data.showUntil ? new Date(data.showUntil) : null,
      adminUsername: admin.username,
    },
    select: { id: true },
  })

  await logAdminAction(admin, {
    action: 'message.send',
    targetType: data.farmId ? 'farm' : 'message',
    targetId: data.farmId ?? message.id,
    summary: `Sent "${data.title}" to ${farmName ?? 'every farm'} (${data.audience === 'OWNERS' ? 'owners' : 'owners and staff'})`,
  })
  revalidatePath('/admin/messages')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

/** Stops showing a message; it stays in the list for the record. */
export async function adminWithdrawMessage(id: string): Promise<MessageActionResult> {
  const admin = await requireMessenger()
  if (!admin) return { success: false, error: 'Your admin role cannot withdraw messages' }

  const message = await prisma.farmMessage.update({ where: { id }, data: { withdrawnAt: new Date() }, select: { title: true } }).catch(() => null)
  if (!message) return { success: false, error: 'Message not found' }

  await logAdminAction(admin, { action: 'message.withdraw', targetType: 'message', targetId: id, summary: `Withdrew the message "${message.title}"` })
  revalidatePath('/admin/messages')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
