import { unstable_cache } from 'next/cache'
import prisma from '@/lib/db'
import {
  APP_SETTINGS_SECTIONS,
  parseAppSettings,
  type AppSettingsSection,
  type AppSettingsValue,
} from '@/lib/settings/schemas'

export const appSettingsTag = (section: AppSettingsSection) => `app-settings:${section}`

const loaders = new Map<AppSettingsSection, () => Promise<unknown>>()

function loaderFor(section: AppSettingsSection) {
  let loader = loaders.get(section)
  if (!loader) {
    loader = unstable_cache(
      async () => (await prisma.appSetting.findUnique({ where: { key: section }, select: { value: true } }))?.value ?? null,
      ['app-settings', section],
      { tags: [appSettingsTag(section)] },
    )
    loaders.set(section, loader)
  }
  return loader
}

/**
 * The live value of a settings section. Falls back to the built-in defaults
 * when nothing is saved, the saved value is invalid, or the table is missing
 * (e.g. before the migration runs), so settings never break a page.
 */
export async function getAppSettings<S extends AppSettingsSection>(section: S): Promise<AppSettingsValue<S>> {
  const defaults = APP_SETTINGS_SECTIONS[section].defaults as AppSettingsValue<S>
  try {
    const stored = await loaderFor(section)()
    if (stored == null) return defaults

    const parsed = parseAppSettings(section, stored)
    if (!parsed) console.error(`[getAppSettings] stored "${section}" settings are invalid; using defaults`)
    return parsed ?? defaults
  } catch (error) {
    // Outside a Next request (tests, scripts) unstable_cache is unavailable.
    if (!(error instanceof Error && error.message.includes('incrementalCache'))) {
      console.error(`[getAppSettings] failed to load "${section}" settings; using defaults`, error)
    }
    return defaults
  }
}
