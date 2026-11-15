'use server'

import { revalidatePath, updateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/db'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import { appSettingsTag } from '@/lib/settings/app-settings'
import {
  APP_SETTINGS_SECTIONS,
  isAppSettingsSection,
  parseAppSettings,
  type AppSettingsSection,
  type AppSettingsValue,
} from '@/lib/settings/schemas'

export type AdminAppSettings<S extends AppSettingsSection> = {
  value: AppSettingsValue<S>
  isDefault: boolean
  storedInvalid: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export type SaveAppSettingsResult<S extends AppSettingsSection> =
  | { success: true; settings: AdminAppSettings<S> }
  | { success: false; error: string }

/** Uncached read so the editor always shows what is stored. */
export async function adminGetAppSettings<S extends AppSettingsSection>(section: S): Promise<AdminAppSettings<S>> {
  await requirePaymentAdminAction('settings.manage')
  const defaults = APP_SETTINGS_SECTIONS[section].defaults as AppSettingsValue<S>

  const row = await prisma.appSetting.findUnique({ where: { key: section as string } }).catch((error) => {
    console.error('[adminGetAppSettings] app_settings unavailable', error)
    return null
  })
  if (!row) return { value: defaults, isDefault: true, storedInvalid: false, updatedAt: null, updatedBy: null }

  const parsed = parseAppSettings(section, row.value)
  const updatedBy = row.updatedByAdminId
    ? (await prisma.adminUser.findUnique({ where: { id: row.updatedByAdminId }, select: { username: true } }))?.username ?? null
    : null

  return {
    value: parsed ?? defaults,
    isDefault: false,
    storedInvalid: !parsed,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy,
  }
}

function describeIssue(issue: { path: PropertyKey[]; message: string }) {
  const where = issue.path.map(String).filter((part) => !/^\d+$/.test(part)).join(' › ')
  return where ? `${where}: ${issue.message}` : issue.message
}

export async function adminSaveAppSettings<S extends AppSettingsSection>(
  section: S,
  input: unknown,
): Promise<SaveAppSettingsResult<S>> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction('settings.manage')
  } catch {
    return { success: false, error: 'Your admin role cannot change settings.' }
  }

  if (!isAppSettingsSection(section)) return { success: false, error: 'Unknown settings section' }

  const parsed = APP_SETTINGS_SECTIONS[section].schema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: issue ? describeIssue(issue) : 'Check the settings and try again' }
  }
  const value = parsed.data as AppSettingsValue<S>

  try {
    const row = await prisma.appSetting.upsert({
      where: { key: section },
      create: { key: section, value: value as Prisma.InputJsonValue, updatedByAdminId: admin.id },
      update: { value: value as Prisma.InputJsonValue, updatedByAdminId: admin.id },
    })

    await logAdminAction(admin, {
      action: 'settings.update',
      targetType: 'settings',
      targetId: section,
      summary: `Updated ${APP_SETTINGS_SECTIONS[section].label} settings`,
      details: value as Prisma.InputJsonValue,
    })

    updateTag(appSettingsTag(section))
    // Settings show up across the site (landing page, dashboard banner, notices).
    revalidatePath('/', 'layout')

    return {
      success: true,
      settings: { value, isDefault: false, storedInvalid: false, updatedAt: row.updatedAt.toISOString(), updatedBy: admin.username },
    }
  } catch (error) {
    console.error('[adminSaveAppSettings]', section, error)
    return { success: false, error: 'Could not save. Make sure the latest database migration has been run.' }
  }
}
